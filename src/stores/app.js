import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { DEFAULT_CALC, calcFromStore, evaluateDeal } from '@/core/deal'
import { DEFAULT_LEDGER, DEFAULT_MESSAGES, DEFAULT_OFFERS, DEFAULT_TASKS } from '@/core/demo'
import { aggregateStores } from '@/core/stores'
import * as remote from '@/data/remote'
import { supabaseConfigured } from '@/lib/supabase'

const DATA_KEY = 'miswag_platform_os_v3' // local-mode data (also read by older builds)
const UI_KEY = 'seller_portal_ui_v1' // role + selected store, kept in both modes
const DEFAULT_MERCHANT = 'معرض البغدادي للأجهزة'

const clone = (v) => JSON.parse(JSON.stringify(v))
const nowTime = () => remote.formatTime(new Date().toISOString())
const uuid = () => crypto.randomUUID()
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms))])

// ---------------------------------------------------------------------------
// Local persistence. Everything in localStorage is untrusted (old versions, hand edits,
// other tabs), so it is shape-checked on load and anything malformed is dropped.
// ---------------------------------------------------------------------------
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isStr = (v) => typeof v === 'string'

const validLedgerRow = (r) =>
  isObj(r) && isStr(r.id) && isStr(r.store_name) && r.store_name !== '' && isStr(r.category) && isStr(r.city) &&
  isStr(r.order_date) && isNum(r.units_sold) && isNum(r.buy_cost_iqd) && isNum(r.sell_price_iqd) &&
  (r.status === 'delivered' || r.status === 'returned') && isNum(r.delivery_hours) &&
  isStr(r.customer_segment) && isStr(r.payment_method)

const validOffer = (o) =>
  isObj(o) && isStr(o.id) && isStr(o.storeName) && isNum(o.totalDiscountPct) && isNum(o.merchantSharePct) &&
  isNum(o.platformSharePct) && isStr(o.fundingSource) && ['pending', 'accepted', 'countered'].includes(o.status)

const validMessage = (m) => isObj(m) && isStr(m.id) && isStr(m.storeName) && (m.sender === 'admin' || m.sender === 'merchant') && isStr(m.text)
const validTask = (t) => isObj(t) && isStr(t.id) && isStr(t.title) && isStr(t.storeName) && typeof t.done === 'boolean'

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function loadSavedData() {
  const parsed = readJson(DATA_KEY)
  if (!isObj(parsed) || !Array.isArray(parsed.ledger)) return null
  const ledger = parsed.ledger.filter(validLedgerRow)
  if (ledger.length === 0) return null
  const keep = (list, ok) => (Array.isArray(list) ? list.filter(ok) : [])
  return {
    ledger,
    offers: keep(parsed.offers, validOffer),
    messages: keep(parsed.messages, validMessage),
    tasks: keep(parsed.tasks, validTask),
    legacyRole: parsed.role,
    legacyMerchant: parsed.activeMerchantName,
  }
}

function loadSavedUi(data) {
  const ui = readJson(UI_KEY)
  const role = isObj(ui) ? ui.role : data?.legacyRole
  const merchant = isObj(ui) ? ui.activeMerchantName : data?.legacyMerchant
  return {
    role: role === 'admin' || role === 'merchant' ? role : null,
    activeMerchantName: isStr(merchant) ? merchant : DEFAULT_MERCHANT,
  }
}

/** The seeded offer's projections come from the real engine, not hard-coded numbers. */
function seedOffers(ledger) {
  const stores = aggregateStores(ledger)
  return clone(DEFAULT_OFFERS).map((o) => {
    const store = stores.find((s) => s.name === o.storeName)
    if (!store) return o
    const calc = calcFromStore(store, {
      ...DEFAULT_CALC,
      totalDiscountPct: o.totalDiscountPct,
      merchantSharePct: o.merchantSharePct,
      fundingSource: o.fundingSource,
      multiplier: o.multiplier,
    })
    const r = evaluateDeal(calc)
    return { ...o, projectedExtraUnits: r.extraUnits, projectedMerchantProfitDelta: Math.round(r.mDelta) }
  })
}

/** A fresh demo workspace. Ids are UUIDs so the same objects can be stored locally or in Postgres. */
export function makeSeed() {
  const ledger = clone(DEFAULT_LEDGER).map((r) => ({ ...r, id: uuid() }))
  const offers = seedOffers(ledger).map((o) => ({ ...o, id: uuid() }))
  const now = Date.now()
  const messages = clone(DEFAULT_MESSAGES).map((m, i) => {
    const createdAt = new Date(now - (180 + i * 25) * 60_000).toISOString()
    return { ...m, id: uuid(), createdAt, time: remote.formatTime(createdAt) }
  })
  const tasks = clone(DEFAULT_TASKS).map((t) => ({ ...t, id: uuid() }))
  return { ledger, offers, messages, tasks }
}

export const useAppStore = defineStore('app', () => {
  const savedData = loadSavedData()
  const savedUi = loadSavedUi(savedData)
  const initial = savedData ?? makeSeed()

  // ---- data ----------------------------------------------------------------
  const ledger = ref(initial.ledger)
  const offers = ref(initial.offers)
  const messages = ref(initial.messages)
  const tasks = ref(initial.tasks)

  // ---- UI state kept across reloads -------------------------------------------
  const role = ref(savedUi.role) // null | 'admin' | 'merchant'
  const activeMerchantName = ref(savedUi.activeMerchantName)

  // ---- session-only state --------------------------------------------------
  const calc = reactive({ ...DEFAULT_CALC })
  const hub = reactive({ open: false, tab: 'messages', storeName: activeMerchantName.value })
  const persistFailed = ref(false)
  const dataMode = ref('loading') // 'loading' | 'remote' | 'local'
  const localReason = ref('') // 'not-configured' | 'unreachable'
  const syncFailed = ref(false)

  // ---- derived -------------------------------------------------------------
  const stores = computed(() => aggregateStores(ledger.value))
  const activeStore = computed(() => stores.value.find((s) => s.name === activeMerchantName.value) ?? stores.value[0] ?? null)
  const unreadCount = computed(() => {
    if (role.value === 'admin') {
      return messages.value.filter((m) => m.sender === 'merchant' && !m.readByAdmin).length + tasks.value.filter((t) => !t.done).length
    }
    const name = activeMerchantName.value
    return (
      messages.value.filter((m) => m.storeName === name && m.sender === 'admin' && !m.readByMerchant).length +
      offers.value.filter((o) => o.storeName === name && o.status === 'pending').length
    )
  })

  // ---- local persistence ---------------------------------------------------
  let timer = null
  function persistNow() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ role: role.value, activeMerchantName: activeMerchantName.value }))
      if (dataMode.value !== 'remote') {
        localStorage.setItem(
          DATA_KEY,
          JSON.stringify({ ledger: ledger.value, offers: offers.value, messages: messages.value, tasks: tasks.value }),
        )
      }
      persistFailed.value = false
    } catch {
      persistFailed.value = true // storage full or blocked: the app keeps working in memory
    }
  }
  function persist() {
    clearTimeout(timer)
    timer = setTimeout(persistNow, 250)
  }

  // ---- remote sync -----------------------------------------------------------
  // State changes apply instantly in memory; in remote mode the matching write is queued and sent
  // in order. If a write fails the change stays visible but the user is told it may not be saved.
  let queue = Promise.resolve()
  function sync(task) {
    if (dataMode.value !== 'remote') return
    queue = queue.then(task).catch((error) => {
      console.warn('Supabase write failed:', error?.message ?? error)
      syncFailed.value = true
      useToast().show('تعذّر الحفظ على الخادم. التغيير ظاهر هنا لكنه قد لا يُحفظ.', { tone: 'error' })
    })
  }

  /** Connect to Supabase and load this visitor's workspace; fall back to local mode on any failure. */
  async function init() {
    if (!supabaseConfigured) {
      dataMode.value = 'local'
      localReason.value = 'not-configured'
      return
    }
    try {
      await withTimeout(remote.connect(), 6000)
      let data = await withTimeout(remote.loadWorkspace(), 8000)
      if (!data.ledger.length && !data.offers.length && !data.messages.length && !data.tasks.length) {
        data = makeSeed() // first visit: give the new private workspace the demo data
        await withTimeout(remote.seedWorkspace(data), 15000)
      }
      ledger.value = data.ledger
      offers.value = data.offers
      messages.value = data.messages
      tasks.value = data.tasks
      dataMode.value = 'remote'
      ensureMerchant()
    } catch (error) {
      console.warn('Supabase unavailable, using local mode:', error?.message ?? error)
      dataMode.value = 'local'
      localReason.value = 'unreachable'
    }
  }

  // ---- actions -------------------------------------------------------------
  function ensureMerchant() {
    if (!stores.value.some((s) => s.name === activeMerchantName.value) && stores.value[0]) {
      activeMerchantName.value = stores.value[0].name
    }
    hub.storeName = activeMerchantName.value
  }

  function enterAs(newRole, merchantName) {
    role.value = newRole
    if (merchantName) activeMerchantName.value = merchantName
    ensureMerchant()
    persist()
  }

  function signOut() {
    role.value = null
    hub.open = false
    persist()
  }

  function selectMerchant(name) {
    activeMerchantName.value = name
    hub.storeName = name
    persist()
  }

  /** Add reviewed rows to the ledger. Returns how many were added. */
  function commitRows(rows, importMode = 'append') {
    // Only platform admins may replace the whole ledger; a merchant can only add to it.
    const replace = importMode === 'replace' && role.value === 'admin'
    const previous = ledger.value
    ledger.value = replace ? [...rows] : [...ledger.value, ...rows]
    ensureMerchant()
    persist()
    sync(() => (replace ? remote.replaceLedger(rows, previous) : remote.insertRows('ledger_entries', rows.map(remote.ledgerToDb))))
    return rows.length
  }

  function addLedgerRow(row) {
    ledger.value = [...ledger.value, row]
    persist()
    sync(() => remote.insertRows('ledger_entries', [remote.ledgerToDb(row)]))
  }

  function pushMessage({ storeName, sender, text }) {
    const createdAt = new Date().toISOString()
    const message = {
      id: uuid(),
      storeName,
      sender,
      text,
      createdAt,
      time: remote.formatTime(createdAt),
      readByMerchant: sender === 'merchant',
      readByAdmin: sender === 'admin',
    }
    messages.value.push(message)
    persist()
    sync(() => remote.insertRows('messages', [remote.messageToDb(message)]))
  }

  function pushTask({ title, storeName, priority = 'urgent' }) {
    const task = { id: uuid(), title, storeName, priority, done: false }
    tasks.value.unshift(task)
    persist()
    sync(() => remote.insertRows('tasks', [remote.taskToDb(task)]))
  }

  function toggleTask(id) {
    const t = tasks.value.find((x) => x.id === id)
    if (!t) return
    t.done = !t.done
    persist()
    sync(() => remote.updateRows('tasks', { done: t.done }, { id }))
  }

  /** Admin sends the calculator's current deal to a store as an offer + chat message. */
  function sendOffer(c, result, note) {
    const offer = {
      id: uuid(),
      storeName: c.storeName,
      totalDiscountPct: c.totalDiscountPct,
      merchantSharePct: c.merchantSharePct,
      platformSharePct: result.platformSharePct,
      fundingSource: c.fundingSource,
      multiplier: c.multiplier,
      projectedExtraUnits: result.extraUnits,
      projectedMerchantProfitDelta: Math.round(result.mDelta),
      note: note || 'عرض خصم مشترك محسوب بناءً على هامش مبيعات متجرك الفعلي.',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    offers.value.unshift(offer)
    sync(() => remote.insertRows('offers', [remote.offerToDb(offer)]))
    pushMessage({
      storeName: c.storeName,
      sender: 'admin',
      text: `تم إرسال عرض خصم مشترك ${c.totalDiscountPct}% (حصتكم ${c.merchantSharePct}% ودعم المنصة ${result.platformSharePct}%). ${note}`.trim(),
    })
  }

  function respondToOffer(id, response) {
    const o = offers.value.find((x) => x.id === id)
    if (!o || o.status !== 'pending') return
    o.status = response
    sync(() => remote.updateRows('offers', { status: response }, { id }))
    const accepted = response === 'accepted'
    pushMessage({
      storeName: o.storeName,
      sender: 'merchant',
      text: accepted
        ? `وافقنا على عرض الخصم المشترك (${o.totalDiscountPct}% — حصتنا ${o.merchantSharePct}% ودعم المنصة ${o.platformSharePct}%). جاهزون للتفعيل!`
        : `نرجو مراجعة نسبة عرض الخصم (${o.totalDiscountPct}%) وزيادة دعم المنصة بـ 10% إضافية لإتمام الموافقة.`,
    })
    pushTask({
      title: accepted ? `تفعيل الحملة المقبولة (${o.totalDiscountPct}%) لمتجر ${o.storeName}` : `مراجعة طلب تعديل النسبة من ${o.storeName}`,
      storeName: o.storeName,
    })
  }

  function markRead(storeName) {
    const fromSender = role.value === 'admin' ? 'merchant' : 'admin'
    const flag = role.value === 'admin' ? 'readByAdmin' : 'readByMerchant'
    let changed = false
    for (const m of messages.value) {
      if (m.storeName === storeName && m.sender === fromSender && !m[flag]) {
        m[flag] = true
        changed = true
      }
    }
    if (!changed) return
    persist()
    const column = role.value === 'admin' ? 'read_by_admin' : 'read_by_merchant'
    sync(() => remote.updateRows('messages', { [column]: true }, { store_name: storeName, sender: fromSender, [column]: false }))
  }

  function loadStoreIntoCalc(name) {
    const s = stores.value.find((x) => x.name === name) ?? stores.value[0]
    if (s) Object.assign(calc, calcFromStore(s, calc))
  }

  function openHub(tab = 'messages', storeName = null) {
    hub.tab = tab
    if (storeName) hub.storeName = storeName
    else if (role.value === 'merchant') hub.storeName = activeMerchantName.value
    hub.open = true
  }
  const closeHub = () => (hub.open = false)

  /** Wipe this workspace and restore the demo data (also works as "delete my data" + start over). */
  function resetDemo() {
    clearTimeout(timer)
    const seed = makeSeed()
    ledger.value = seed.ledger
    offers.value = seed.offers
    messages.value = seed.messages
    tasks.value = seed.tasks
    activeMerchantName.value = DEFAULT_MERCHANT
    hub.storeName = DEFAULT_MERCHANT
    Object.assign(calc, DEFAULT_CALC)
    persistNow()
    sync(async () => {
      await remote.resetWorkspace()
      await remote.seedWorkspace(seed)
    })
  }

  return {
    ledger, offers, messages, tasks, role, activeMerchantName, calc, hub, persistFailed, dataMode, localReason, syncFailed,
    stores, activeStore, unreadCount,
    init, enterAs, signOut, selectMerchant, commitRows, addLedgerRow, pushMessage, pushTask, toggleTask,
    sendOffer, respondToOffer, markRead, loadStoreIntoCalc, openHub, closeHub, resetDemo,
  }
})
