// src/api.js — BNBMIS API client
const BASE = '';

function getToken() {
  try {
    const s = localStorage.getItem('bnbmis_super') || localStorage.getItem('bnbmis_owner') || localStorage.getItem('bnbmis_staff');
    if (!s) return null;
    return JSON.parse(s)?.token || null;
  } catch { return null; }
}

async function req(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}/api${path}`, opts);
  const text = await res.text();
  if (!text || text.trim() === '') {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {};
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const get  = path      => req('GET',    path);
const post = (path, b) => req('POST',   path, b);
const put  = (path, b) => req('PUT',    path, b);
const del  = path      => req('DELETE', path);

export const api = {
  // ── Auth (super/owner/staff) ──
  loginSuper:  (email, password)      => post('/auth?type=super', { email, password }),
  loginOwner:  (email, password)      => post('/auth?type=owner', { email, password }),
  loginStaff:  (email, pin, store_id) => post('/auth?type=staff', { email, pin, store_id }),

  // ── Customers / Guests (merged into auth.js) ──
  customerRegister: d        => post('/auth?type=guest&action=register', d),
  customerLogin:    d        => post('/auth?type=guest&action=login', d),
  customerBookings: id       => get(`/auth?type=guest&customer_id=${id}`),
  customerUpdate:   (id, d)  => put(`/auth?type=guest&customer_id=${id}`, d),
  customerCancel:   (id,cid) => put(`/bookings?id=${id}&customer_cancel=1`, { customer_id: cid }),

  // ── Stores ──
  registerStore:       d     => post('/stores?action=register', d),
  getMarketplace:      city  => get('/stores?action=marketplace' + (city ? `&city=${encodeURIComponent(city)}` : '')),
  getStoreBySlug:      slug  => get(`/stores?action=by_slug&slug=${slug}`),
  getStores:           ()    => get('/stores'),
  getStore:            id    => get(`/stores?id=${id}`),
  updateStore:         (id,d)=> put(`/stores?id=${id}`, d),
  platformStats:       ()    => get('/stores?action=platform_stats'),
  setupCheck:          ()    => get('/stores?action=setup'),
  changeOwnerPassword: d     => post('/auth?type=owner_password', d),

  // ── Platform settings (merged into stores.js) ──
  getPlatformSettings:  () => get('/stores?action=settings'),
  savePlatformSettings: d  => put('/stores?action=settings', d),

  // ── Pesapal ──
  pesapalInitiate: d  => post('/pesapal?action=initiate', d),
  pesapalStatus:   id => get('/pesapal?action=status&tracking_id=' + id),
  changeAdminPassword:  d  => post('/stores?action=change_password', d),

  // ── Subscriptions ──
  getPlans:       ()      => get('/subscriptions?action=plans'),
  createPlan:     d       => post('/subscriptions?action=plans', d),
  updatePlan:     (id,d)  => put(`/subscriptions?action=plans&id=${id}`, d),
  recordPayment:  d       => post('/subscriptions?action=payment', d),
  getSubPayments: sid     => get(`/subscriptions?store_id=${sid}`),

  // ── Locations ──
  getLocations:   sid      => get(`/locations?store_id=${sid}`),
  createLocation: d        => post('/locations', d),
  updateLocation: (id,d)   => put(`/locations?id=${id}`, d),
  deleteLocation: id       => del(`/locations?id=${id}`),

  // ── Rooms ──
  getRooms:          (sid,lid) => get('/rooms' + (lid ? `?location_id=${lid}` : sid ? `?store_id=${sid}` : '')),
  createRoom:        d         => post('/rooms', d),
  updateRoom:        (id,d)    => put(`/rooms?id=${id}`, d),
  deleteRoom:        id        => del(`/rooms?id=${id}`),
  checkAvailability: (rid,ci,co) => get(`/bookings?check_room=${rid}&ci=${ci}&co=${co}`),
  getBookedDates:    lid       => get(`/bookings?get_booked_dates=${lid}`),

  // ── Bookings ──
  getBookings:   (sid,lid) => get('/bookings' + (sid&&lid?`?store_id=${sid}&location_id=${lid}`:sid?`?store_id=${sid}`:lid?`?location_id=${lid}`:'')),
  createBooking: d         => post('/bookings', d),
  updateBooking: (id,d)    => put(`/bookings?id=${id}`, d),
  addPayment:    (id,amt,pm)=> put(`/bookings?id=${id}`, { add_payment: amt, payment_method: pm }),
  extendBooking: (id,d)    => put(`/bookings?id=${id}&action=extend`, d),
  deleteBooking: id        => del(`/bookings?id=${id}`),

  // ── Reviews (merged into bookings.js) ──
  getReviews:   sid => get(`/bookings?resource=reviews&store_id=${sid}`),
  createReview: d   => post('/bookings?resource=reviews', d),

  // ── Expenses (merged into reports.js) ──
  getExpenses:   (sid,lid) => get('/reports?resource=expenses' + (sid?`&store_id=${sid}`:'') + (lid?`&location_id=${lid}`:'')),
  createExpense: d         => post('/reports?resource=expenses', d),

  // ── Staff + payment methods ──
  getStaff:        sid       => get(`/staff?store_id=${sid}`),
  createStaff:     d         => post('/staff', d),
  updateStaff:     (id,d)    => put(`/staff?id=${id}`, d),
  deleteStaff:     id        => del(`/staff?id=${id}`),
  updateProfile:   d         => put('/staff?me=1', d),
  getPayMethods:   sid       => get(`/staff?resource=payment_methods&store_id=${sid}`),
  createPayMethod: (name,sid)=> post('/staff?resource=payment_methods', { name, store_id: sid }),
  updatePayMethod: (pmId,d)  => put('/staff?resource=payment_methods', { ...d, pmId }),
  deletePayMethod: pmId      => req('DELETE', '/staff?resource=payment_methods', { pmId }),

  // ── Reports ──
  getReports: (sid,lid,df,dt) => get('/reports?' + [
    `store_id=${sid}`,
    lid ? `location_id=${lid}` : '',
    df  ? `date_from=${df}` : '',
    dt  ? `date_to=${dt}` : '',
  ].filter(Boolean).join('&')),
};
