// src/api.js
const BASE = ''

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}/api${path}`, opts)
  const text = await res.text()

  if (!text || text.trim() === '') {
    if (!res.ok) throw new Error(`Request failed (${res.status}) — empty response`)
    return {}
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    console.error('Non-JSON response:', text.slice(0, 200))
    throw new Error(`Server error (${res.status}). Check Vercel function logs.`)
  }

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const get  = path       => req('GET',    path)
const post = (path, b)  => req('POST',   path, b)
const put  = (path, b)  => req('PUT',    path, b)
const del  = path       => req('DELETE', path)

export const api = {
  // Staff auth
  login:           (email, pin) => post('/auth', { email, pin }),

  // Locations
  getLocations:    ()           => get('/locations'),
  createLocation:  d            => post('/locations', d),
  updateLocation:  (id, d)      => put(`/locations?id=${id}`, d),
  deleteLocation:  id           => del(`/locations?id=${id}`),

  // Rooms
  getRooms:        locId        => get('/rooms' + (locId ? `?location_id=${locId}` : '')),
  createRoom:      d            => post('/rooms', d),
  updateRoom:      (id, d)      => put(`/rooms?id=${id}`, d),
  deleteRoom:      id           => del(`/rooms?id=${id}`),

  // Bookings
  getBookings:     locId        => get('/bookings' + (locId ? `?location_id=${locId}` : '')),
  createBooking:   d            => post('/bookings', d),
  updateBooking:   (id, d)      => put(`/bookings?id=${id}`, d),
  recordPayment:   (id, amount) => put(`/bookings?id=${id}`, { add_payment: amount }),
  extendBooking:   (id, d)      => put(`/bookings?id=${id}&action=extend`, d),
  deleteBooking:   id           => del(`/bookings?id=${id}`),

  // Expenses
  getExpenses:     locId        => get('/expenses' + (locId ? `?location_id=${locId}` : '')),
  createExpense:   d            => post('/expenses', d),

  // Staff
  getStaff:        ()           => get('/staff'),
  createStaff:     d            => post('/staff', d),
  updateStaff:     (id, d)      => put(`/staff?id=${id}`, d),
  updateProfile:   d            => put('/staff?me=1', d),

  // Reports
  getReports:      locId        => get('/reports' + (locId ? `?location_id=${locId}` : '')),

  // Customers
  customerRegister: d           => post('/customers?action=register', d),
  customerLogin:    d           => post('/customers?action=login', d),
  customerBookings: id          => get(`/customers?customer_id=${id}`),
  customerUpdate:   (id, d)     => put(`/customers?customer_id=${id}`, d),
  customerCancel:   (id, cid)   => put(`/bookings?id=${id}&customer_cancel=1`, { customer_id: cid }),
}

// Payment methods + availability (appended)
Object.assign(api, {
  getPayMethods:     ()           => get('/staff?resource=payment_methods'),
  createPayMethod:   name         => post('/staff?resource=payment_methods', { name }),
  updatePayMethod:   (pmId, d)    => put('/staff?resource=payment_methods', { ...d, pmId }),
  deletePayMethod:   pmId         => req('DELETE', '/staff?resource=payment_methods', { pmId }),
  getBookedDates:    locId        => get(`/bookings?get_booked_dates=${locId}`),
  checkAvailability: (roomId, ci, co) => get(`/bookings?check_room=${roomId}&ci=${ci}&co=${co}`),
  getReports:        (locId, df, dt) => get('/reports' + [locId?`location_id=${locId}`:'', df?`date_from=${df}`:'', dt?`date_to=${dt}`:''].filter(Boolean).reduce((s,p,i)=>s+(i===0?'?':'&')+p, '')),
})
