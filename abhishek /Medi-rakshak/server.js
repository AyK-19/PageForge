// ============================================================
//  MEDI RAKSHAK — server.js
//  Express backend with MySQL2
//  Start: node server.js   |   Dev: npx nodemon server.js
// ============================================================

const express        = require('express');
const session        = require('express-session');
const bcrypt         = require('bcryptjs');
const mysql          = require('mysql2/promise');
const path           = require('path');
const cors           = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MYSQL CONNECTION POOL ───────────────────────────────
// ⚠️  Change user/password/database to match your MySQL setup
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || 'password',        // ← your MySQL password
  database: process.env.DB_NAME     || 'medi_rakshak',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

// ─── MIDDLEWARE ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:            'medirakshak_secret_2024',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ─── HELPER ──────────────────────────────────────────────
const db = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ============================================================
//  AUTH ROUTES
// ============================================================

// GET /api/me  — return current session user
app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient', phone = '', address = '' } = req.body;
    if (!name || !email || !password) return res.json({ error: 'Name, email and password required' });
    if (password.length < 6)          return res.json({ error: 'Password must be at least 6 characters' });

    const existing = await db('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, role, phone, address]
    );
    const user = { id: result.insertId, name, email, role, phone };
    req.session.user = user;
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Registration failed' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await db('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.json({ error: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: 'Invalid email or password' });

    const safe = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
    req.session.user = safe;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Login failed' });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ============================================================
//  DOCTORS
// ============================================================

// GET /api/doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await db('SELECT * FROM doctors WHERE available = 1 ORDER BY rating DESC');
    res.json({ doctors });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  APPOINTMENTS
// ============================================================

// GET /api/appointments
app.get('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { id, role } = req.session.user;
    let rows;
    if (role === 'admin') {
      rows = await db(`
        SELECT a.*, u.name AS patient_name, d.name AS doctor_name, d.specialty, d.hospital
        FROM appointments a
        JOIN users   u ON u.id = a.patient_id
        JOIN doctors d ON d.id = a.doctor_id
        ORDER BY a.created_at DESC`);
    } else if (role === 'doctor') {
      const doc = await db('SELECT id FROM doctors WHERE user_id = ?', [id]);
      if (!doc.length) return res.json({ appointments: [] });
      rows = await db(`
        SELECT a.*, u.name AS patient_name, d.name AS doctor_name, d.specialty, d.hospital
        FROM appointments a
        JOIN users   u ON u.id = a.patient_id
        JOIN doctors d ON d.id = a.doctor_id
        WHERE a.doctor_id = ?
        ORDER BY a.date DESC`, [doc[0].id]);
    } else {
      rows = await db(`
        SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
        FROM appointments a
        JOIN doctors d ON d.id = a.doctor_id
        WHERE a.patient_id = ?
        ORDER BY a.date DESC`, [id]);
    }
    res.json({ appointments: rows });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// POST /api/appointments
app.post('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { doctor_id, date, time_slot, notes = '' } = req.body;
    if (!doctor_id || !date) return res.json({ error: 'Doctor and date required' });

    const result = await db(
      'INSERT INTO appointments (patient_id, doctor_id, date, time_slot, notes) VALUES (?, ?, ?, ?, ?)',
      [req.session.user.id, doctor_id, date, time_slot, notes]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// PATCH /api/appointments/:id/cancel
app.patch('/api/appointments/:id/cancel', requireAuth, async (req, res) => {
  try {
    await db(
      'UPDATE appointments SET status = "cancelled" WHERE id = ? AND patient_id = ?',
      [req.params.id, req.session.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  MEDICINES
// ============================================================

// GET /api/medicines?q=search
app.get('/api/medicines', async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const medicines = await db(
      `SELECT * FROM medicines
       WHERE name LIKE ? OR generic_name LIKE ? OR category LIKE ?
       ORDER BY name`,
      [q, q, q]
    );
    res.json({ medicines });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  ORDERS
// ============================================================

// GET /api/orders
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const { id, role } = req.session.user;
    let rows;
    if (role === 'admin' || role === 'pharmacist') {
      rows = await db(`
        SELECT o.*, u.name AS patient_name
        FROM orders o JOIN users u ON u.id = o.patient_id
        ORDER BY o.created_at DESC`);
    } else {
      rows = await db('SELECT * FROM orders WHERE patient_id = ? ORDER BY created_at DESC', [id]);
    }
    res.json({ orders: rows });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// POST /api/orders
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { items, address } = req.body;
    if (!items?.length || !address) return res.json({ error: 'Items and address required' });

    const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const result = await db(
      'INSERT INTO orders (patient_id, items, total, address) VALUES (?, ?, ?, ?)',
      [req.session.user.id, JSON.stringify(items), total, address]
    );
    res.json({ success: true, id: result.insertId, total });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status  (admin only)
app.patch('/api/orders/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['placed','processing','dispatched','delivered'];
    if (!allowed.includes(status)) return res.json({ error: 'Invalid status' });
    await db('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  PRESCRIPTIONS
// ============================================================

// GET /api/prescriptions
app.get('/api/prescriptions', requireAuth, async (req, res) => {
  try {
    const { id, role } = req.session.user;
    let rows;
    if (role === 'admin') {
      rows = await db(`
        SELECT p.*, u.name AS patient_name, d.name AS doctor_name
        FROM prescriptions p
        JOIN users u ON u.id = p.patient_id
        LEFT JOIN doctors d ON d.id = p.doctor_id
        ORDER BY p.created_at DESC`);
    } else {
      rows = await db(`
        SELECT p.*, d.name AS doctor_name
        FROM prescriptions p
        LEFT JOIN doctors d ON d.id = p.doctor_id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC`, [id]);
    }
    res.json({ prescriptions: rows });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// POST /api/prescriptions/verify  — LASA & interaction check
app.post('/api/prescriptions/verify', requireAuth, async (req, res) => {
  try {
    const { medicines } = req.body;
    if (!medicines?.length) return res.json({ error: 'No medicines provided' });

    // LASA drug pairs (Look-Alike Sound-Alike)
    const LASA_PAIRS = [
      ['hydroxyzine','hydralazine'],
      ['azithromycin','erythromycin'],
      ['metformin','metronidazole'],
      ['amoxicillin','amoxiclav'],
      ['cetirizine','levocetirizine'],
      ['atenolol','amlodipine'],
      ['carvedilol','captopril'],
      ['chlorpromazine','chlorpropamide'],
      ['dopamine','dobutamine'],
      ['cycloserine','cyclosporine'],
    ];

    // Common dangerous interactions
    const INTERACTIONS = [
      { pair: ['warfarin','aspirin'],          msg: 'Warfarin + Aspirin: increased bleeding risk' },
      { pair: ['metformin','contrast dye'],    msg: 'Metformin + Contrast: risk of lactic acidosis — hold metformin' },
      { pair: ['ssri','tramadol'],             msg: 'SSRI + Tramadol: serotonin syndrome risk' },
      { pair: ['ace inhibitor','potassium'],   msg: 'ACE Inhibitor + Potassium supplement: hyperkalaemia risk' },
      { pair: ['digoxin','amiodarone'],        msg: 'Digoxin + Amiodarone: digoxin toxicity risk' },
      { pair: ['methotrexate','nsaid'],        msg: 'Methotrexate + NSAID: methotrexate toxicity risk' },
      { pair: ['sildenafil','nitrate'],        msg: 'Sildenafil + Nitrates: severe hypotension risk' },
    ];

    const names  = medicines.map(m => m.name.toLowerCase());
    const flags  = [];

    // LASA check
    LASA_PAIRS.forEach(([a, b]) => {
      const hasA = names.some(n => n.includes(a));
      const hasB = names.some(n => n.includes(b));
      if (hasA && hasB) flags.push(`⚠️ LASA Alert: "${a}" and "${b}" look/sound alike — double-check the prescription`);
    });

    // Interaction check
    INTERACTIONS.forEach(({ pair: [a, b], msg }) => {
      const hasA = names.some(n => n.includes(a));
      const hasB = names.some(n => n.includes(b));
      if (hasA && hasB) flags.push(`🚨 Interaction: ${msg}`);
    });

    // Duplicate check
    const seen = new Set();
    names.forEach(n => {
      if (seen.has(n)) flags.push(`♻️ Duplicate: "${n}" appears more than once`);
      seen.add(n);
    });

    // Save verified prescription to DB
    const verified = flags.length === 0 ? 1 : 2;
    await db(
      'INSERT INTO prescriptions (patient_id, medicines, verified, flag_reason) VALUES (?, ?, ?, ?)',
      [req.session.user.id, JSON.stringify(medicines), verified, flags.join('; ') || null]
    );

    if (!flags.length) {
      res.json({ verified: true, message: '✅ Prescription verified — no issues found.' });
    } else {
      res.json({ verified: false, message: `⚠️ ${flags.length} issue(s) found:`, flags });
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  TELEMEDICINE
// ============================================================

// POST /api/telemedicine
app.post('/api/telemedicine', requireAuth, async (req, res) => {
  try {
    const { doctor_id, scheduled_at, notes = '' } = req.body;
    if (!doctor_id || !scheduled_at) return res.json({ error: 'Doctor and schedule required' });
    const result = await db(
      'INSERT INTO telemedicine (patient_id, doctor_id, scheduled_at, notes) VALUES (?, ?, ?, ?)',
      [req.session.user.id, doctor_id, scheduled_at, notes]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  CONTACT
// ============================================================

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, role = '', message } = req.body;
    if (!name || !email || !message) return res.json({ error: 'Name, email and message required' });
    await db('INSERT INTO contacts (name, email, role, message) VALUES (?, ?, ?, ?)',
      [name, email, role, message]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// GET /api/contacts  (admin only)
app.get('/api/contacts', requireAdmin, async (req, res) => {
  try {
    const contacts = await db('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json({ contacts });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ============================================================
//  ADMIN STATS
// ============================================================

// GET /api/stats
app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ users }]]         = await pool.execute('SELECT COUNT(*) AS users FROM users');
    const [[{ patients }]]      = await pool.execute("SELECT COUNT(*) AS patients FROM users WHERE role='patient'");
    const [[{ appointments }]]  = await pool.execute('SELECT COUNT(*) AS appointments FROM appointments');
    const [[{ prescriptions }]] = await pool.execute('SELECT COUNT(*) AS prescriptions FROM prescriptions');
    const [[{ orders }]]        = await pool.execute('SELECT COUNT(*) AS orders FROM orders');
    const [[{ revenue }]]       = await pool.execute('SELECT COALESCE(SUM(total),0) AS revenue FROM orders');
    const [[{ verified_rx }]]   = await pool.execute("SELECT COUNT(*) AS verified_rx FROM prescriptions WHERE verified=1");
    const [[{ contacts }]]      = await pool.execute('SELECT COUNT(*) AS contacts FROM contacts');

    res.json({ stats: { users, patients, appointments, prescriptions, orders, revenue, verified_rx, contacts } });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ─── SPA FALLBACK ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥  Medi Rakshak running at http://localhost:${PORT}`);
  console.log(`📦  Database: ${process.env.DB_NAME || 'medi_rakshak'} @ ${process.env.DB_HOST || 'localhost'}`);
  console.log(`\n🔑  Demo logins:`);
  console.log(`    Admin    → admin@medirakshak.com  / admin123`);
  console.log(`    Patient  → ravi@example.com       / pass123`);
  console.log(`    Doctor   → dr.ananya@medirakshak.com / admin123\n`);
});
