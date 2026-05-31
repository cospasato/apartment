// src/api.js
async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`/api${path}`, opts)
  const text = await res.text()
  if (!text?.trim()) { if (!res.ok) throw new Error(`Request failed (${res.status})`); return {} }
  let data
  try { data = JSON.parse(text) } catch { throw new Error(`Server error (${res.status})`) }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}
const get  = p       => req('GET',    p)
const post = (p, b)  => req('POST',   p, b)
const put  = (p, b)  => req('PUT',    p, b)
const del  = p       => req('DELETE', p)

const d = (tid, resource, params = '') => `/data?tenant_id=${tid}&resource=${resource}${params}`

export const api = {
  // Plans (public)
  getPlans: () => get('/plans'),

  // Tenant auth
  tenantRegister: b         => post('/tenants?action=register', b),
  tenantLogin:    b         => post('/tenants?action=login', b),
  getTenant:      tid       => get(`/tenants?tenant_id=${tid}`),
  updateTenant:   (tid, b)  => put(`/tenants?tenant_id=${tid}`, b),

  // Subscriptions
  getSubscriptions: tid     => get(`/subscriptions?tenant_id=${tid}`),
  subscribe:        b       => post('/subscriptions', b),

  // Super admin
  superLogin:     b         => post('/super?action=login', b),
  superStats:     ()        => get('/super?action=stats'),
  superTenants:   ()        => get('/super?action=tenants'),
  superUpdate:    (tid, b)  => put(`/super?tenant_id=${tid}`, b),
  superDelete:    tid       => del(`/super?tenant_id=${tid}`),

  // Lodge data (all scoped to tenant)
  getLocations:   tid       => get(d(tid, 'locations')),
  createLocation: (tid, b)  => post(d(tid, 'locations'), b),
  updateLocation: (tid, id, b) => put(d(tid, 'locations', `&id=${id}`), b),
  deleteLocation: (tid, id)    => del(d(tid, 'locations', `&id=${id}`)),

  getRooms:       (tid, lid) => get(d(tid, 'rooms', lid ? `&location_id=${lid}` : '')),
  createRoom:     (tid, b)   => post(d(tid, 'rooms'), b),
  updateRoom:     (tid, id, b) => put(d(tid, 'rooms', `&id=${id}`), b),
  deleteRoom:     (tid, id)    => del(d(tid, 'rooms', `&id=${id}`)),

  getBookings:    (tid, lid) => get(d(tid, 'bookings', lid ? `&location_id=${lid}` : '')),
  createBooking:  (tid, b)   => post(d(tid, 'bookings'), b),
  updateBooking:  (tid, id, b) => put(d(tid, 'bookings', `&id=${id}`), b),
  recordPayment:  (tid, id, amt) => put(d(tid, 'bookings', `&id=${id}`), { add_payment: amt }),
  extendBooking:  (tid, id, b)   => put(d(tid, 'bookings', `&id=${id}`), b),
  deleteBooking:  (tid, id)      => del(d(tid, 'bookings', `&id=${id}`)),

  getExpenses:    (tid, lid) => get(d(tid, 'expenses', lid ? `&location_id=${lid}` : '')),
  createExpense:  (tid, b)   => post(d(tid, 'expenses'), b),

  getStaff:       tid        => get(d(tid, 'staff')),
  staffLogin:     (tid, b)   => post(d(tid, 'staff', '&action=login'), b),
  createStaff:    (tid, b)   => post(d(tid, 'staff'), b),
  updateStaff:    (tid, id, b) => put(d(tid, 'staff', `&id=${id}`), b),
  updateProfile:  (tid, b)   => put(d(tid, 'staff', '&me=1'), b),

  getReports:     (tid, lid) => get(d(tid, 'reports', lid ? `&location_id=${lid}` : '')),

  custRegister:   (tid, b)   => post(d(tid, 'customers', '&action=register'), b),
  custLogin:      (tid, b)   => post(d(tid, 'customers', '&action=login'), b),
  custBookings:   (tid, cid) => get(d(tid, 'customers', `&customer_id=${cid}`)),
  custUpdate:     (tid, cid, b) => put(d(tid, 'customers', `&customer_id=${cid}`), b),
  custCancel:     (tid, id, cid) => put(d(tid, 'bookings', `&id=${id}`), { customer_cancel: true, customer_id: cid }),
}
