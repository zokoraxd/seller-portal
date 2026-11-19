// Supabase persistence. App shapes (camelCase, same as the local store) <-> database rows.
// Every table has an owner_id column that the database fills from the signed-in user and that
// row-level security enforces, so none of these functions pass or filter by owner.
import { getSupabase } from '@/lib/supabase'

const PAGE = 1000 // PostgREST returns at most 1000 rows per request
const CHUNK = 500 // rows per insert request

export const formatTime = (iso) => new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

// ---------------------------------------------------------------------------
// Mappers (pure, unit-tested). Ledger rows are inserted without an id: the app never edits a
// single ledger row, so the database generates it.
// ---------------------------------------------------------------------------
const LEDGER_COLS = ['store_name', 'category', 'city', 'order_date', 'units_sold', 'buy_cost_iqd', 'sell_price_iqd', 'status', 'delivery_hours', 'customer_segment', 'payment_method']

export const ledgerToDb = (r) => Object.fromEntries(LEDGER_COLS.map((k) => [k, r[k]]))
export const ledgerFromDb = (r) => ({
  id: r.id,
  ...Object.fromEntries(LEDGER_COLS.map((k) => [k, r[k]])),
  units_sold: Number(r.units_sold),
  buy_cost_iqd: Number(r.buy_cost_iqd),
  sell_price_iqd: Number(r.sell_price_iqd),
  delivery_hours: Number(r.delivery_hours),
})

export const offerToDb = (o) => ({
  id: o.id,
  store_name: o.storeName,
  total_discount_pct: o.totalDiscountPct,
  merchant_share_pct: o.merchantSharePct,
  platform_share_pct: o.platformSharePct,
  funding_source: o.fundingSource,
  multiplier: o.multiplier,
  projected_extra_units: o.projectedExtraUnits ?? 0,
  projected_merchant_profit_delta: o.projectedMerchantProfitDelta ?? 0,
  note: o.note ?? '',
  status: o.status,
})
export const offerFromDb = (r) => ({
  id: r.id,
  storeName: r.store_name,
  totalDiscountPct: Number(r.total_discount_pct),
  merchantSharePct: Number(r.merchant_share_pct),
  platformSharePct: Number(r.platform_share_pct),
  fundingSource: r.funding_source,
  multiplier: Number(r.multiplier),
  projectedExtraUnits: Number(r.projected_extra_units),
  projectedMerchantProfitDelta: Number(r.projected_merchant_profit_delta),
  note: r.note,
  status: r.status,
  createdAt: r.created_at,
})

export const messageToDb = (m) => ({
  id: m.id,
  store_name: m.storeName,
  sender: m.sender,
  body: m.text,
  read_by_merchant: m.readByMerchant,
  read_by_admin: m.readByAdmin,
  ...(m.createdAt ? { created_at: m.createdAt } : {}),
})
export const messageFromDb = (r) => ({
  id: r.id,
  storeName: r.store_name,
  sender: r.sender,
  text: r.body,
  createdAt: r.created_at,
  time: formatTime(r.created_at),
  readByMerchant: r.read_by_merchant,
  readByAdmin: r.read_by_admin,
})

export const taskToDb = (t) => ({ id: t.id, title: t.title, store_name: t.storeName, priority: t.priority, done: t.done })
export const taskFromDb = (r) => ({ id: r.id, title: r.title, storeName: r.store_name, priority: r.priority, done: r.done })

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
async function client() {
  const c = await getSupabase()
  if (!c) throw new Error('Supabase is not configured')
  return c
}

const check = ({ error }) => {
  if (error) throw error
}

/** Return the signed-in user, creating a private anonymous workspace on the first visit. */
export async function connect() {
  const c = await client()
  const { data } = await c.auth.getSession()
  if (data.session) return data.session.user
  const res = await c.auth.signInAnonymously()
  if (res.error) throw res.error
  return res.data.user
}

async function fetchAll(c, table, orders) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let q = c.from(table).select('*')
    for (const [col, ascending] of orders) q = q.order(col, { ascending })
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

export async function loadWorkspace() {
  const c = await client()
  const [ledger, offers, messages, tasks] = await Promise.all([
    fetchAll(c, 'ledger_entries', [['order_date', true], ['created_at', true], ['id', true]]),
    fetchAll(c, 'offers', [['created_at', false], ['id', true]]),
    fetchAll(c, 'messages', [['created_at', true], ['id', true]]),
    fetchAll(c, 'tasks', [['created_at', false], ['id', true]]),
  ])
  return {
    ledger: ledger.map(ledgerFromDb),
    offers: offers.map(offerFromDb),
    messages: messages.map(messageFromDb),
    tasks: tasks.map(taskFromDb),
  }
}

export async function insertRows(table, rows) {
  const c = await client()
  for (let i = 0; i < rows.length; i += CHUNK) check(await c.from(table).insert(rows.slice(i, i + CHUNK)))
}

export async function updateRows(table, patch, match) {
  const c = await client()
  check(await c.from(table).update(patch).match(match))
}

export async function resetWorkspace() {
  const c = await client()
  check(await c.rpc('reset_workspace'))
}

export async function seedWorkspace({ ledger, offers, messages, tasks }) {
  await insertRows('ledger_entries', ledger.map(ledgerToDb))
  await insertRows('offers', offers.map(offerToDb))
  await insertRows('messages', messages.map(messageToDb))
  await insertRows('tasks', tasks.map(taskToDb))
}

/**
 * Replace the whole ledger (admin "replace" import). Not atomic across requests, so if the
 * insert fails the previous rows are put back.
 */
export async function replaceLedger(newRows, oldRows) {
  const c = await client()
  check(await c.from('ledger_entries').delete().not('id', 'is', null))
  try {
    await insertRows('ledger_entries', newRows.map(ledgerToDb))
  } catch (error) {
    await insertRows('ledger_entries', oldRows.map(ledgerToDb)).catch(() => {})
    throw error
  }
}
