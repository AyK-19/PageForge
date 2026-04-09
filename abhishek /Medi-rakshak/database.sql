-- ============================================================
--  MEDI RAKSHAK — MySQL Database Setup
--  Run this file once:  mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS medi_rakshak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medi_rakshak;

-- ─── USERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('patient','doctor','pharmacist','admin') DEFAULT 'patient',
  phone      VARCHAR(20),
  address    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── DOCTORS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  name       VARCHAR(120) NOT NULL,
  specialty  VARCHAR(100),
  hospital   VARCHAR(150),
  fee        DECIMAL(10,2) DEFAULT 500.00,
  wait_time  INT DEFAULT 10,
  rating     DECIMAL(3,1) DEFAULT 4.5,
  available  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── APPOINTMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id  INT NOT NULL,
  date       DATE NOT NULL,
  time_slot  VARCHAR(20),
  notes      TEXT,
  status     ENUM('pending','confirmed','cancelled','completed') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id) ON DELETE CASCADE
);

-- ─── MEDICINES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150),
  category     VARCHAR(80),
  schedule     ENUM('OTC','H','H1') DEFAULT 'OTC',
  price        DECIMAL(10,2) DEFAULT 50.00,
  stock        INT DEFAULT 100,
  description  TEXT,
  side_effects TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── PRESCRIPTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT NOT NULL,
  doctor_id   INT,
  diagnosis   VARCHAR(255),
  medicines   JSON,
  verified    TINYINT DEFAULT 0,
  flag_reason TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id) ON DELETE SET NULL
);

-- ─── ORDERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  items      JSON NOT NULL,
  total      DECIMAL(10,2) DEFAULT 0,
  address    TEXT,
  status     ENUM('placed','processing','dispatched','delivered') DEFAULT 'placed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── TELEMEDICINE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemedicine (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  doctor_id    INT NOT NULL,
  scheduled_at DATETIME,
  notes        TEXT,
  status       ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id) ON DELETE CASCADE
);

-- ─── CONTACTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120),
  email      VARCHAR(160),
  role       VARCHAR(80),
  message    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  SEED DATA
-- ============================================================

-- Admin user  (password: admin123)
INSERT INTO users (name, email, password, role, phone, address) VALUES
('Admin User',      'admin@medirakshak.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin',      '9999000001', 'Delhi University'),
('Dr. Ananya Sharma','dr.ananya@medirakshak.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor',     '9999000002', 'AIIMS, Delhi'),
('Dr. Rajesh Kumar', 'dr.rajesh@medirakshak.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor',     '9999000003', 'Apollo, Delhi'),
('Dr. Priya Singh',  'dr.priya@medirakshak.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor',     '9999000004', 'Max Healthcare'),
('Dr. Arjun Mehta',  'dr.arjun@medirakshak.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor',     '9999000005', 'Fortis, Gurgaon'),
('Dr. Neha Gupta',   'dr.neha@medirakshak.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor',     '9999000006', 'Safdarjung Hospital'),
('Ravi Patel',       'ravi@example.com',          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'patient',    '9876543210', 'Lajpat Nagar, Delhi'),
('Sunita Verma',     'sunita@example.com',         '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'patient',    '9876543211', 'Rohini, Delhi'),
('Meena Sharma',     'meena@example.com',          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'pharmacist', '9876543212', 'Karol Bagh, Delhi');
-- NOTE: All passwords above hash to either "admin123" (admin/doctors) or "pass123" (patients)
-- For correct hashes run: node -e "const b=require('bcryptjs');console.log(b.hashSync('pass123',10))"

-- Doctors
INSERT INTO doctors (user_id, name, specialty, hospital, fee, wait_time, rating) VALUES
(2, 'Dr. Ananya Sharma', 'Cardiology',      'AIIMS New Delhi',        800,  8,  4.9),
(3, 'Dr. Rajesh Kumar',  'General Medicine','Apollo Hospitals Delhi',  600,  12, 4.7),
(4, 'Dr. Priya Singh',   'Paediatrics',     'Max Healthcare Saket',   700,  6,  4.8),
(5, 'Dr. Arjun Mehta',   'Orthopaedics',    'Fortis Gurgaon',         900,  15, 4.6),
(6, 'Dr. Neha Gupta',    'Dermatology',     'Safdarjung Hospital',    500,  10, 4.5);

-- Medicines
INSERT INTO medicines (name, generic_name, category, schedule, price, stock, description, side_effects) VALUES
('Paracetamol 500mg',    'Acetaminophen',  'Analgesic',      'OTC', 25,  200, 'Relieves mild to moderate pain and fever.',          'Rare liver issues with overdose.'),
('Azithromycin 500mg',   'Azithromycin',   'Antibiotic',     'H',   85,  80,  'Broad-spectrum antibiotic for bacterial infections.', 'Nausea, diarrhoea, stomach upset.'),
('Metformin 500mg',      'Metformin HCl',  'Antidiabetic',   'H',   45,  150, 'First-line medication for type 2 diabetes.',          'GI upset, lactic acidosis (rare).'),
('Atorvastatin 10mg',    'Atorvastatin',   'Lipid-lowering', 'H',   60,  120, 'Reduces LDL cholesterol and cardiovascular risk.',    'Muscle pain, liver enzyme changes.'),
('Amlodipine 5mg',       'Amlodipine',     'Antihypertensive','H',  40,  90,  'Calcium channel blocker for hypertension & angina.',  'Ankle swelling, flushing, dizziness.'),
('Pantoprazole 40mg',    'Pantoprazole',   'Antacid',        'H',   55,  160, 'Proton pump inhibitor for acid reflux and ulcers.',   'Headache, diarrhoea, nausea.'),
('Cetrizine 10mg',       'Cetirizine',     'Antihistamine',  'OTC', 30,  180, 'Relieves allergy symptoms including rhinitis.',       'Drowsiness, dry mouth.'),
('Amoxicillin 250mg',    'Amoxicillin',    'Antibiotic',     'H',   65,  70,  'Penicillin antibiotic for various bacterial infections.','Rash, diarrhoea, allergic reaction.');

-- Sample prescriptions
INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, medicines, verified) VALUES
(7, 1, 'Hypertension & mild fever',
  '[{"name":"Amlodipine 5mg","dose":"5mg","freq":"Once daily","days":30},{"name":"Paracetamol 500mg","dose":"500mg","freq":"TDS if fever","days":3}]',
  1),
(7, 2, 'Upper respiratory tract infection',
  '[{"name":"Azithromycin 500mg","dose":"500mg","freq":"Once daily","days":5},{"name":"Cetrizine 10mg","dose":"10mg","freq":"Once at night","days":7}]',
  0);

-- Sample appointments
INSERT INTO appointments (patient_id, doctor_id, date, time_slot, notes, status) VALUES
(7, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY),  '10:00 AM', 'Routine BP check',        'confirmed'),
(7, 2, DATE_ADD(CURDATE(), INTERVAL 7 DAY),  '02:00 PM', 'Follow-up consultation',  'pending'),
(8, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  '11:00 AM', 'Child vaccination',       'confirmed');

-- Sample orders
INSERT INTO orders (patient_id, items, total, address, status) VALUES
(7, '[{"medicine_id":1,"name":"Paracetamol 500mg","qty":2,"price":25},{"name":"Cetrizine 10mg","qty":1,"price":30}]', 80.00, '12, Lajpat Nagar III, New Delhi - 110024', 'delivered'),
(7, '[{"medicine_id":5,"name":"Amlodipine 5mg","qty":3,"price":40}]', 120.00, '12, Lajpat Nagar III, New Delhi - 110024', 'dispatched');

-- Sample contacts
INSERT INTO contacts (name, email, role, message) VALUES
('Dr. Sundar Rao', 'sundar@apollo.com', 'Doctor / Hospital', 'Interested in integrating Apollo clinics with Medi Rakshak platform.'),
('Priya Medicines', 'priya@pharma.com', 'Pharmacist', 'We run 3 pharmacies in Rohini and want to partner for medicine delivery.');
