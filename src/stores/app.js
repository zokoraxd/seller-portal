import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { DEFAULT_CALC, calcFromStore, evaluateDeal } from '@/core/deal'
import { DEFAULT_LEDGER, DEFAULT_MESSAGES, DEFAULT_OFFERS, DEFAULT_TASKS } from '@/core/demo'
import { aggregateStores } from '@/core/stores'

const STORAGE_KEY = 'miswag_platform_os_v3'
const DEFAULT_MERCHANT = 'معرض البغدادي للأجهزة'

const clone = (v) => JSON.parse(JSON.stringify(v))
const nowTime = () => new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' }).format(new Date())
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ---------------------------------------------------------------------------
// Persistence. Everything in localStorage is untrusted (old versions, hand edits,
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

function loadSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!isObj(parsed) || !Array.isArray(parsed.ledger)) return null
    const ledger = parsed.ledger.filter(validLedgerRow)
    if (ledger.length === 0) return null
    const keep = (list, ok, fallback) => (Array.isArray(list) ? list.filter(ok) : fallback)
    return {
      ledger,
      offers: keep(parsed.offers, validOffer, []),
      messages: keep(parsed.messages, validMessage, []),
      tasks: keep(parsed.tasks, validTask, []),
      role: parsed.role === 'admin' || parsed.role === 'merchant' ? parsed.role : null,
      activeMerchantName: isStr(parsed.activeMerchantName) ? parsed.activeMerchantName : DEFAULT_MERCHANT,
    }
  } catch {
    return null
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

export const useAppStore = defineStore('app', () => {
  const saved = loadSaved()

  // ---- persisted state -----------------------------------------------------
  const ledger = ref(saved?.ledger ?? clone(DEFAULT_LEDGER))
  const offers = ref(saved?.offers ?? seedOffers(DEFAULT_LEDGER))
  const messages = ref(saved?.messages ?? clone(DEFAULT_MESSAGES))
  const tasks = ref(saved?.tasks ?? clone(DEFAULT_TASKS))
  const role = ref(saved?.role ?? null) // null | 'admin' | 'merchant'
  const activeMerchantName = ref(saved?.activeMerchantName ?? DEFAULT_MERCHANT)

  // ---- session-only state --------------------------------------------------
  const calc = reactive({ ...DEFAULT_CALC })
  const hub = reactive({ open: false, tab: 'messages', storeName: activeMerchantName.value })
  const persistFailed = ref(false)

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

  // ---- persistence ---------------------------------------------------------
  let timer = null
  function persistNow() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ledger: ledger.value,
          offers: offers.value,
          messages: messages.value,
          tasks: tasks.value,
          role: role.value,
          activeMerchantName: activeMerchantName.value,
        }),
      )
      persistFailed.value = false
    } catch {
      persistFailed.value = true // storage full or blocked: the app keeps working in memory
    }
  }
  function persist() {
    clearTimeout(timer)
    timer = setTimeout(persistNow, 250)
  }

  // ---- actions -------------------------------------------------------------
  function ensureMerchant() {
    if (!stores.value.some((s) => s.name === activeMerchantName.value) && stores.value[0]) {
      activeMerchantName.value = stores.value[0].name
    }
  }

  function enterAs(newRole, merchantName) {
    role.value = newRole
    if (merchantName) activeMerchantName.value = merchantName
    ensureMerchant()
    hub.storeName = activeMerchantName.value
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
  function commitRows(rows, mode = 'append') {
    // Only platform admins may replace the whole ledger; a merchant can only add to it.
    const replace = mode === 'replace' && role.value === 'admin'
    ledger.value = replace ? [...rows] : [...ledger.value, ...rows]
    ensureMerchant()
    persist()
    return rows.length
  }

  function setLedger(rows) {
    ledger.value = rows
    ensureMerchant()
    persist()
  }

  function addLedgerRow(row) {
    ledger.value = [...ledger.value, row]
    persist()
  }

  function pushMessage({ storeName, sender, text }) {
    messages.value.push({
      id: uid('msg'),
      storeName,
      sender,
      text,
      time: nowTime(),
      readByMerchant: sender === 'merchant',
      readByAdmin: sender === 'admin',
    })
    persist()
  }

  function pushTask({ title, storeName, priority = 'urgent' }) {
    tasks.value.unshift({ id: uid('tk'), title, storeName, priority, done: false })
    persist()
  }

  function toggleTask(id) {
    const t = tasks.value.find((x) => x.id === id)
    if (t) t.done = !t.done
    persist()
  }

  /** Admin sends the calculator's current deal to a store as an offer + chat message. */
  function sendOffer(c, result, note) {
    offers.value.unshift({
      id: uid('off'),
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
      createdAt: `اليوم، ${nowTime()}`,
    })
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
    for (const m of messages.value) {
      if (m.storeName !== storeName) continue
      if (role.value === 'admin' && m.sender === 'merchant') m.readByAdmin = true
      if (role.value === 'merchant' && m.sender === 'admin') m.readByMerchant = true
    }
    persist()
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

  function resetDemo() {
    clearTimeout(timer)
    ledger.value = clone(DEFAULT_LEDGER)
    offers.value = seedOffers(DEFAULT_LEDGER)
    messages.value = clone(DEFAULT_MESSAGES)
    tasks.value = clone(DEFAULT_TASKS)
    activeMerchantName.value = DEFAULT_MERCHANT
    hub.storeName = DEFAULT_MERCHANT
    Object.assign(calc, DEFAULT_CALC)
    persistNow()
  }

  return {
    ledger, offers, messages, tasks, role, activeMerchantName, calc, hub, persistFailed,
    stores, activeStore, unreadCount,
    enterAs, signOut, selectMerchant, commitRows, setLedger, addLedgerRow, pushMessage, pushTask, toggleTask,
    sendOffer, respondToOffer, markRead, loadStoreIntoCalc, openHub, closeHub, resetDemo,
  }
})
