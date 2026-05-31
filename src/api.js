// src/api.js — BNBMS API client
const BASE = '';

function getToken() {
  try {
    const s = localStorage.getItem('bnbms_super') || localStorage.getItem('bnbms_owner') || localStorage.getItem('bnbms_staff');
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
  // Auth
  loginSuper:  (email, password)      => post('/auth?type=super', { email, password }),
  loginOwner:  (email, password)      => post('/auth?type=owner', { email, password }),
  loginStaff:  (email, pin, store_id) => post('/auth?type=staff', { email, pin, store_id }),

  // Store registration
  registerStore: d => post('/stores?action=register', d),

  // Marketplace (public)
  getMarketplace: (city) => get('/stores?action=marketplace' + (city ? `&city=${encodeURIComponent(city)}` : '')),
  getStoreBySlug: (slug) => get(`/stores?action=by_slug&slug=${slug}`),

  // Super admin — stores
  getStores:      ()     => get('/stores'),
  getStore:       id     => get(`/stores?id=${id}`),
  updateStore:    (id,d) => put(`/stores?id=${id}`, d),
  platformStats:  ()     => get('/stores?action=platform_stats'),

  // Super admin — subscriptions
  getPlans:          ()      => get('/subscriptions?action=plans'),
  createPlan:        d       => post('/subscriptions?action=plans', d),
  updatePlan:        (id,d)  => put(`/subscriptions?action=plans&id=${id}`, d),
  recordPayment:     d       => post('/subscriptions?action=payment', d),
  getSubPayments:    sid     => get(`/subscriptions?store_id=${sid}`),

  // Platform settings
  getPlatformSettings: ()  => get('/platform'),
  savePlatformSettings: d  => put('/platform', d),
  changeAdminPassword:  d  => post('/platform', d),

  // Locations
  getLocations:   storeId      => get(`/locations?store_id=${storeId}`),
  createLocation: d            => post('/locations', d),
  updateLocation: (id,d)       => put(`/locations?id=${id}`, d),
  deleteLocation: id           => del(`/locations?id=${id}`),

  // Rooms
  getRooms:       (storeId, locId) => get('/rooms' + (locId ? `?location_id=${locId}` : storeId ? `?store_id=${storeId}` : '')),
  createRoom:     d                => post('/rooms', d),
  updateRoom:     (id,d)           => put(`/rooms?id=${id}`, d),
  deleteRoom:     id               => del(`/rooms?id=${id}`),
  checkAvailability: (roomId,ci,co) => get(`/bookings?check_room=${roomId}&ci=${ci}&co=${co}`),
  getBookedDates: locId            => get(`/bookings?get_booked_dates=${locId}`),

  // Bookings
  getBookings:    (storeId, locId) => get('/bookings' + (storeId && locId ? `?store_id=${storeId}&location_id=${locId}` : storeId ? `?store_id=${storeId}` : locId ? `?location_id=${locId}` : '')),
  createBooking:  d                => post('/bookings', d),
  updateBooking:  (id,d)           => put(`/bookings?id=${id}`, d),
  addPayment:     (id,amount,pm)   => put(`/bookings?id=${id}`, { add_payment: amount, payment_method: pm }),
  extendBooking:  (id,d)           => put(`/bookings?id=${id}&action=extend`, d),
  deleteBooking:  id               => del(`/bookings?id=${id}`),
  customerCancel: (id,cid)         => put(`/bookings?id=${id}&customer_cancel=1`, { customer_id: cid }),

  // Expenses
  getExpenses:    (storeId, locId) => get('/expenses' + (storeId && locId ? `?store_id=${storeId}&location_id=${locId}` : storeId ? `?store_id=${storeId}` : '')),
  createExpense:  d                => post('/expenses', d),

  // Staff
  getStaff:         storeId     => get(`/staff?store_id=${storeId}`),
  createStaff:      d           => post('/staff', d),
  updateStaff:      (id,d)      => put(`/staff?id=${id}`, d),
  deleteStaff:      id          => del(`/staff?id=${id}`),
  updateProfile:    d           => put('/staff?me=1', d),
  getPayMethods:    storeId     => get(`/staff?resource=payment_methods&store_id=${storeId}`),
  createPayMethod:  (name,sid)  => post('/staff?resource=payment_methods', { name, store_id: sid }),
  updatePayMethod:  (pmId,d)    => put('/staff?resource=payment_methods', { ...d, pmId }),
  deletePayMethod:  pmId        => req('DELETE', '/staff?resource=payment_methods', { pmId }),

  // Reports
  getReports: (storeId, locId, df, dt) => get('/reports?' + [
    `store_id=${storeId}`,
    locId ? `location_id=${locId}` : '',
    df ? `date_from=${df}` : '',
    dt ? `date_to=${dt}` : ''
  ].filter(Boolean).join('&')),

  // Customers
  customerRegister: d          => post('/customers?action=register', d),
  customerLogin:    d          => post('/customers?action=login', d),
  customerBookings: id         => get(`/customers?customer_id=${id}`),
  customerUpdate:   (id,d)     => put(`/customers?customer_id=${id}`, d),

  // Reviews
  getReviews:   storeId        => get(`/reviews?store_id=${storeId}`),
  createReview: d              => post('/reviews', d),
};
