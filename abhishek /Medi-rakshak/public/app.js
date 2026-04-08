// ============================================================
//  MEDI RAKSHAK — app.js  (Frontend)
// ============================================================

let currentUser    = null;
let currentDoctorId = null;
let currentMed     = null;
let verifyMeds     = [];
let searchTimer    = null;

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Set min date for booking
  const today   = new Date().toISOString().split('T')[0];
  const bookDate = document.getElementById('bookDate');
  if (bookDate) bookDate.min = today;

  // Restore session
  const data = await get('/api/me');
  if (data.user) {
    currentUser = data.user;
    updateNavUser();
  }

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
  });

  showPage('home');
});

// ─── PAGE ROUTING ────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  if (page === 'doctors')   loadDoctors();
  if (page === 'medicines') loadMedicines('');
  if (page === 'dashboard') {
    if (!currentUser) { showPage('login'); return; }
    loadDashboard();
  }
  if ((page === 'login' || page === 'register') && currentUser) {
    showPage('dashboard'); return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('navLinks').classList.remove('open');
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ─── AUTH ────────────────────────────────────────────────
async function doLogin() {
  const email  = document.getElementById('loginEmail').value.trim();
  const pass   = document.getElementById('loginPassword').value;
  const errEl  = document.getElementById('loginError');
  errEl.classList.add('hidden');

  if (!email || !pass) { showError(errEl, 'Please enter email and password'); return; }

  const data = await post('/api/login', { email, password: pass });
  if (data.error) { showError(errEl, data.error); return; }

  currentUser = data.user;
  updateNavUser();
  showToast(`Welcome back, ${currentUser.name}! 👋`);
  showPage('dashboard');
}

async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role     = document.getElementById('regRole').value;
  const phone    = document.getElementById('regPhone').value.trim();
  const address  = document.getElementById('regAddress').value.trim();
  const errEl    = document.getElementById('regError');
  errEl.classList.add('hidden');

  if (!name || !email || !password) { showError(errEl, 'Name, email and password are required'); return; }
  if (password.length < 6)          { showError(errEl, 'Password must be at least 6 characters'); return; }

  const data = await post('/api/register', { name, email, password, role, phone, address });
  if (data.error) { showError(errEl, data.error); return; }

  currentUser = data.user;
  updateNavUser();
  showToast(`Account created! Welcome, ${currentUser.name}! 🎉`);
  showPage('dashboard');
}

async function logout() {
  await post('/api/logout', {});
  currentUser = null;
  updateNavUser();
  showPage('home');
  showToast('Logged out successfully');
}

function fillDemo(email, pass) {
  document.getElementById('loginEmail').value    = email;
  document.getElementById('loginPassword').value = pass;
}

function updateNavUser() {
  const navAuth  = document.getElementById('navAuth');
  const navUser  = document.getElementById('navUser');
  const greeting = document.getElementById('userGreeting');
  const dashLink = document.getElementById('dashLink');
  if (currentUser) {
    navAuth.style.display  = 'none';
    navUser.style.display  = 'flex';
    dashLink.style.display = 'block';
    greeting.textContent   = `Hi, ${currentUser.name.split(' ')[0]}`;
  } else {
    navAuth.style.display  = 'flex';
    navUser.style.display  = 'none';
    dashLink.style.display = 'none';
  }
}

// ─── DOCTORS ─────────────────────────────────────────────
async function loadDoctors() {
  const el = document.getElementById('doctorsList');
  el.innerHTML = '<div class="loading-state">Loading doctors...</div>';
  const data = await get('/api/doctors');
  if (!data.doctors?.length) {
    el.innerHTML = '<div class="empty-state">No doctors available right now.</div>';
    return;
  }
  el.innerHTML = '';
  const colors = ['#0ea5e9','#7c3aed','#0d9488','#f59e0b','#ec4899'];
  data.doctors.forEach((d, i) => {
    const initials = d.name.split(' ')
      .filter(w => w[0] === w[0].toUpperCase())
      .map(w => w[0]).slice(0,2).join('');
    el.innerHTML += `
      <div class="doctor-card">
        <div class="doc-avatar" style="background:${colors[i % colors.length]}">${initials}</div>
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec">${d.specialty}</div>
        <div class="doc-hosp">🏥 ${d.hospital}</div>
        <div class="doc-meta">
          <span class="doc-badge badge-orange">₹${d.fee} fee</span>
          <span class="doc-badge badge-green">⏱ ${d.wait_time} min wait</span>
          <span class="doc-badge badge-star">⭐ ${d.rating}</span>
        </div>
        <button class="btn-primary full" onclick="openBookModal(${d.id},'${d.name}','${d.specialty}')">Book Appointment</button>
        <button class="btn-outline full" style="margin-top:8px" onclick="bookTele(${d.id},'${d.name}')">📹 Telemedicine</button>
      </div>`;
  });
}

function openBookModal(doctorId, name, spec) {
  if (!currentUser) { showToast('Please login to book an appointment'); showPage('login'); return; }
  currentDoctorId = doctorId;
  document.getElementById('bookDoctorName').textContent = `${name} — ${spec}`;
  document.getElementById('bookModal').style.display = 'flex';
}

async function confirmBooking() {
  const date   = document.getElementById('bookDate').value;
  const slot   = document.getElementById('bookSlot').value;
  const notes  = document.getElementById('bookNotes').value;
  const isTele = document.getElementById('bookTele').value === '1';

  if (!date) { showToast('Please select a date'); return; }

  const data = await post('/api/appointments', {
    doctor_id: currentDoctorId, date, time_slot: slot, notes
  });
  if (data.error) { showToast('❌ ' + data.error); return; }

  if (isTele) {
    await post('/api/telemedicine', {
      doctor_id: currentDoctorId,
      scheduled_at: `${date} ${slot}`,
      notes
    });
  }

  closeModal('bookModal');
  showToast('✅ Appointment confirmed!');
  document.getElementById('bookNotes').value = '';
}

async function bookTele(doctorId, name) {
  if (!currentUser) { showToast('Please login first'); showPage('login'); return; }
  const date = prompt(`Schedule telemedicine with ${name}\nEnter date (YYYY-MM-DD):`);
  if (!date) return;
  const time = prompt('Enter time (e.g. 10:00 AM):') || '10:00 AM';
  const data = await post('/api/telemedicine', {
    doctor_id: doctorId, scheduled_at: `${date} ${time}`, notes: ''
  });
  if (data.error) { showToast('❌ ' + data.error); return; }
  showToast('✅ Telemedicine session scheduled!');
}

// ─── MEDICINES ────────────────────────────────────────────
async function loadMedicines(q) {
  const el   = document.getElementById('medicinesList');
  const data = await get(`/api/medicines?q=${encodeURIComponent(q)}`);
  if (!data.medicines?.length) {
    el.innerHTML = '<div class="empty-state">No medicines found.</div>';
    return;
  }
  const schedClass = { OTC: 'schedule-otc', H: 'schedule-h', H1: 'schedule-h1' };
  el.innerHTML = data.medicines.map(m => `
    <div class="med-card">
      <div class="med-name">${m.name}</div>
      <div class="med-gen">${m.generic_name || ''}</div>
      <div class="med-tags">
        <span class="doc-badge ${schedClass[m.schedule] || 'schedule-otc'}">Schedule ${m.schedule}</span>
        <span class="doc-badge badge-blue">${m.category}</span>
        ${m.stock < 30 ? `<span class="doc-badge badge-orange">Low Stock: ${m.stock}</span>` : ''}
      </div>
      <div class="med-desc">${m.description || ''}</div>
      ${m.side_effects ? `<div class="med-desc"><b>Side effects:</b> ${m.side_effects}</div>` : ''}
      <div class="med-price">₹${m.price}</div>
      <button class="btn-primary full" onclick="openOrderModal(${m.id},'${m.name.replace(/'/g,"\\'")}',${m.price})">🛒 Order Now</button>
    </div>`).join('');
}

function searchMedicines(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadMedicines(val), 300);
}

function openOrderModal(id, name, price) {
  if (!currentUser) { showToast('Please login to order'); showPage('login'); return; }
  currentMed = { id, name, price };
  document.getElementById('orderMedName').textContent = name;
  document.getElementById('orderQty').value           = '1';
  document.getElementById('orderAddress').value       = '';
  updateOrderTotal();
  document.getElementById('orderModal').style.display = 'flex';
}

function updateOrderTotal() {
  if (!currentMed) return;
  const qty = parseInt(document.getElementById('orderQty').value) || 1;
  document.getElementById('orderTotal').textContent = `Total: ₹${(currentMed.price * qty).toFixed(2)}`;
}
document.addEventListener('input', e => {
  if (e.target.id === 'orderQty') updateOrderTotal();
});

async function confirmOrder() {
  const qty     = parseInt(document.getElementById('orderQty').value) || 1;
  const address = document.getElementById('orderAddress').value.trim();
  if (!address) { showToast('Please enter delivery address'); return; }

  const data = await post('/api/orders', {
    items: [{ medicine_id: currentMed.id, name: currentMed.name, qty, price: currentMed.price }],
    address
  });
  if (data.error) { showToast('❌ ' + data.error); return; }
  closeModal('orderModal');
  showToast(`✅ Order placed! Total: ₹${parseFloat(data.total).toFixed(2)}`);
}

// ─── CONTACT ─────────────────────────────────────────────
async function submitContact() {
  const name    = document.getElementById('cName').value.trim();
  const email   = document.getElementById('cEmail').value.trim();
  const role    = document.getElementById('cRole').value;
  const message = document.getElementById('cMsg').value.trim();
  if (!name || !email || !message) { showToast('Name, email and message are required'); return; }

  const data = await post('/api/contact', { name, email, role, message });
  if (data.error) { showToast('❌ ' + data.error); return; }

  document.getElementById('contactSuccess').classList.remove('hidden');
  document.getElementById('cName').value  = '';
  document.getElementById('cEmail').value = '';
  document.getElementById('cMsg').value   = '';
}

// ─── DASHBOARD ────────────────────────────────────────────
async function loadDashboard() {
  if (!currentUser) return;
  document.getElementById('dashSubtitle').textContent =
    `${currentUser.name} · ${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}`;

  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('hidden'));
  }

  loadOverview();
}

async function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');

  if (tab === 'appointments')  loadAppointments();
  if (tab === 'prescriptions') loadPrescriptions();
  if (tab === 'orders')        loadOrders();
  if (tab === 'admin')         loadAdmin();
}

async function loadOverview() {
  const statsEl = document.getElementById('overviewStats');
  if (currentUser.role === 'admin') {
    const data = await get('/api/stats');
    if (data.stats) {
      const s = data.stats;
      statsEl.innerHTML = `
        <div class="stat-card"><div class="slabel">Total Users</div><div class="snum">${s.users}</div></div>
        <div class="stat-card"><div class="slabel">Patients</div><div class="snum">${s.patients}</div></div>
        <div class="stat-card"><div class="slabel">Appointments</div><div class="snum">${s.appointments}</div></div>
        <div class="stat-card"><div class="slabel">Prescriptions</div><div class="snum">${s.prescriptions}</div></div>
        <div class="stat-card"><div class="slabel">Orders</div><div class="snum">${s.orders}</div></div>
        <div class="stat-card"><div class="slabel">Revenue</div><div class="snum">₹${parseFloat(s.revenue).toFixed(0)}</div></div>
        <div class="stat-card"><div class="slabel">Verified Rx</div><div class="snum">${s.verified_rx}</div></div>
        <div class="stat-card"><div class="slabel">Messages</div><div class="snum">${s.contacts}</div></div>`;
    }
  } else {
    const [appts, rxs, orders] = await Promise.all([
      get('/api/appointments'), get('/api/prescriptions'), get('/api/orders')
    ]);
    statsEl.innerHTML = `
      <div class="stat-card"><div class="slabel">Appointments</div><div class="snum">${appts.appointments?.length || 0}</div><div class="sdesc">Total booked</div></div>
      <div class="stat-card"><div class="slabel">Prescriptions</div><div class="snum">${rxs.prescriptions?.length || 0}</div><div class="sdesc">On record</div></div>
      <div class="stat-card"><div class="slabel">Orders</div><div class="snum">${orders.orders?.length || 0}</div><div class="sdesc">Placed</div></div>`;
  }
}

async function loadAppointments() {
  const el = document.getElementById('apptList');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  const data = await get('/api/appointments');
  if (!data.appointments?.length) {
    el.innerHTML = '<div class="empty-state">No appointments yet. <a href="#" onclick="showPage(\'doctors\')" style="color:var(--primary-d);font-weight:600">Book one →</a></div>';
    return;
  }
  el.innerHTML = data.appointments.map(a => `
    <div class="appt-card">
      <div class="appt-info">
        <h4>${a.doctor_name || a.patient_name}</h4>
        <p>${a.specialty || ''} ${a.hospital ? '· ' + a.hospital : ''}</p>
        <p>📅 ${a.date} at ${a.time_slot}${a.notes ? ' · ' + a.notes : ''}</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="status-badge status-${a.status}">${a.status}</span>
        ${a.status !== 'cancelled' && a.status !== 'completed' && currentUser.role === 'patient'
          ? `<button class="btn-outline sm" onclick="cancelAppt(${a.id})">Cancel</button>` : ''}
      </div>
    </div>`).join('');
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  const data = await fetch(`/api/appointments/${id}/cancel`, { method: 'PATCH' }).then(r => r.json());
  if (data.success) { showToast('Appointment cancelled'); loadAppointments(); }
}

async function loadPrescriptions() {
  const el = document.getElementById('rxList');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  const data = await get('/api/prescriptions');
  if (!data.prescriptions?.length) {
    el.innerHTML = '<div class="empty-state">No prescriptions on record.</div>';
    return;
  }
  el.innerHTML = data.prescriptions.map(rx => {
    let meds = [];
    try { meds = JSON.parse(rx.medicines); } catch(e) {}
    const vClass = rx.verified === 1 ? 'status-confirmed' : rx.verified === 2 ? 'status-cancelled' : 'status-pending';
    const vText  = rx.verified === 1 ? 'Verified' : rx.verified === 2 ? 'Flagged' : 'Pending';
    return `
      <div class="rx-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <h4>${rx.doctor_name || rx.patient_name || 'Self-submitted'}</h4>
            <p style="font-size:.83rem;color:var(--muted)">${rx.diagnosis || ''} · ${(rx.created_at || '').split('T')[0] || ''}</p>
          </div>
          <span class="status-badge ${vClass}">${vText}</span>
        </div>
        <div class="rx-meds">
          ${meds.map(m => `<div class="rx-med">💊 ${m.name} — ${m.dose}, ${m.freq}${m.days ? ', '+m.days+' days' : ''}</div>`).join('')}
        </div>
        ${rx.flag_reason ? `<p style="font-size:.82rem;color:#991b1b;margin-top:6px">⚠️ ${rx.flag_reason}</p>` : ''}
      </div>`;
  }).join('');
}

async function loadOrders() {
  const el = document.getElementById('orderList');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  const data = await get('/api/orders');
  if (!data.orders?.length) {
    el.innerHTML = '<div class="empty-state">No orders yet. <a href="#" onclick="showPage(\'medicines\')" style="color:var(--primary-d);font-weight:600">Browse medicines →</a></div>';
    return;
  }
  el.innerHTML = data.orders.map(o => {
    let items = [];
    try { items = JSON.parse(o.items); } catch(e) {}
    return `
      <div class="order-card">
        <div>
          <h4 style="font-size:.97rem;margin-bottom:3px">Order #${o.id}${o.patient_name ? ' · '+o.patient_name : ''}</h4>
          <p style="font-size:.83rem;color:var(--muted)">${items.map(i => i.name+' ×'+i.qty).join(', ')}</p>
          <p style="font-size:.82rem;color:var(--muted)">📍 ${o.address}</p>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--fh);font-weight:700;font-size:1.1rem;color:var(--primary-d)">₹${parseFloat(o.total).toFixed(2)}</div>
          <span class="status-badge status-${o.status}">${o.status}</span>
          ${currentUser.role === 'admin' ? `
            <br/><select style="font-size:.78rem;margin-top:6px;padding:4px 8px;border-radius:6px;border:1px solid var(--border)" onchange="updateOrderStatus(${o.id},this.value)">
              <option>Update status</option>
              <option value="placed">Placed</option>
              <option value="processing">Processing</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
            </select>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function updateOrderStatus(id, status) {
  if (!status || status === 'Update status') return;
  const data = await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ status })
  }).then(r => r.json());
  if (data.success) { showToast('Order status updated'); loadOrders(); }
}

async function loadAdmin() {
  const statsEl = document.getElementById('adminStats');
  const data    = await get('/api/stats');
  if (data.stats) {
    const s = data.stats;
    statsEl.innerHTML = `
      <div class="stat-card"><div class="slabel">Total Users</div><div class="snum">${s.users}</div></div>
      <div class="stat-card"><div class="slabel">Appointments</div><div class="snum">${s.appointments}</div></div>
      <div class="stat-card"><div class="slabel">Orders</div><div class="snum">${s.orders}</div></div>
      <div class="stat-card"><div class="slabel">Revenue</div><div class="snum">₹${parseFloat(s.revenue).toFixed(0)}</div></div>`;
  }
  const cData = await get('/api/contacts');
  const cEl   = document.getElementById('adminContacts');
  if (!cData.contacts?.length) { cEl.innerHTML = '<div class="empty-state">No messages yet.</div>'; return; }
  cEl.innerHTML = cData.contacts.map(c => `
    <div class="contact-item">
      <h5>${c.name} (${c.role || 'General'}) · <a href="mailto:${c.email}" style="color:var(--primary-d)">${c.email}</a></h5>
      <p>${c.message}</p>
      <p style="font-size:.75rem;color:var(--muted);margin-top:4px">${c.created_at}</p>
    </div>`).join('');
}

// ─── RX VERIFICATION ─────────────────────────────────────
function addVerifyMed() {
  const inp  = document.getElementById('vMedName');
  const name = inp.value.trim();
  if (!name) return;
  verifyMeds.push({ name });
  inp.value = '';
  renderVerifyMeds();
}

function renderVerifyMeds() {
  const el  = document.getElementById('verifyMedList');
  const btn = document.getElementById('verifyBtn');
  btn.style.display = verifyMeds.length ? 'block' : 'none';
  document.getElementById('verifyResult').classList.add('hidden');
  el.innerHTML = verifyMeds.map((m, i) => `
    <div class="verify-med-item">
      <span>💊 ${m.name}</span>
      <button class="rm-btn" onclick="removeVerifyMed(${i})">✕</button>
    </div>`).join('');
}

function removeVerifyMed(i) {
  verifyMeds.splice(i, 1);
  renderVerifyMeds();
}

async function runVerification() {
  if (!verifyMeds.length) return;
  const btn = document.getElementById('verifyBtn');
  btn.textContent = 'Checking...';
  btn.disabled    = true;

  const data  = await post('/api/prescriptions/verify', { medicines: verifyMeds });
  const resEl = document.getElementById('verifyResult');
  resEl.classList.remove('hidden', 'verify-ok', 'verify-warn');

  if (data.verified) {
    resEl.classList.add('verify-ok');
    resEl.innerHTML = `<strong>${data.message}</strong>`;
  } else {
    resEl.classList.add('verify-warn');
    resEl.innerHTML = `<strong>${data.message}</strong><ul>${data.flags.map(f => `<li>${f}</li>`).join('')}</ul>`;
  }
  btn.textContent = 'Run Verification →';
  btn.disabled    = false;
}

// ─── MODALS ──────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none';
});

// ─── HELPERS ─────────────────────────────────────────────
async function get(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) { console.error('GET error:', e); return {}; }
}

async function post(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch(e) { console.error('POST error:', e); return { error: 'Network error' }; }
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
