import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLITE_DB_PATH = path.resolve(__dirname, '../../farm2mart.db');

let pgPool = null;
let sqliteDb = null;
let isUsingSqlite = false;

// Initialize PostgreSQL pool if configured
if (env.isPostgres) {
  try {
    pgPool = new pg.Pool({
      connectionString: env.databaseUrl,
      connectionTimeoutMillis: 3000
    });
    // Test connection
    pgPool.query('SELECT 1').catch((err) => {
      console.warn('[DB] PostgreSQL connection failed, switching to SQLite fallback:', err.message);
      pgPool = null;
      initSqlite();
    });
  } catch (err) {
    console.warn('[DB] Error initializing pg pool:', err.message);
    initSqlite();
  }
} else {
  initSqlite();
}

function initSqlite() {
  if (sqliteDb) return;
  isUsingSqlite = true;
  console.log('[DB] Running in zero-config SQLite mode (using node:sqlite) at', SQLITE_DB_PATH);
  
  sqliteDb = new DatabaseSync(SQLITE_DB_PATH);
  
  // Register custom SQL functions
  sqliteDb.function('now', () => new Date().toISOString());
  sqliteDb.function('gen_random_uuid', () => crypto.randomUUID());
  sqliteDb.function('greatest', (a, b) => Math.max(Number(a) || 0, Number(b) || 0));
  sqliteDb.function('round', (val) => Math.round(Number(val) || 0));
  sqliteDb.function('nullif', (a, b) => (a === b ? null : a));

  // Initialize SQLite schema and seed data
  initSqliteSchema(sqliteDb);
}


function initSqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT,
      village TEXT,
      district TEXT,
      state TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      center_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS procurement_centers (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      name TEXT NOT NULL,
      agency TEXT,
      address TEXT,
      village TEXT,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS center_crops (
      center_id TEXT NOT NULL,
      crop_code TEXT NOT NULL,
      PRIMARY KEY (center_id, crop_code)
    );

    CREATE TABLE IF NOT EXISTS slots (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      center_id TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      reserved_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(center_id, start_at)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      farmer_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      crop_code TEXT NOT NULL,
      estimated_quantity_kg REAL NOT NULL,
      token_number TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      vehicle_number TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS booking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS produce_records (
      booking_id TEXT PRIMARY KEY,
      quality_grade TEXT,
      accepted_quantity_kg REAL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_reference TEXT,
      updated_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      farmer_id TEXT NOT NULL,
      booking_id TEXT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      resolution TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      farmer_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      template TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS queue_forecasts (
      slot_id TEXT PRIMARY KEY,
      expected_arrivals INTEGER NOT NULL DEFAULT 0,
      model_version TEXT,
      generated_at TEXT NOT NULL DEFAULT (now())
    );
  `);

  // Ensure optional schema columns exist
  try { db.exec('ALTER TABLE bookings ADD COLUMN vehicle_number TEXT'); } catch (_) {}

  // Always ensure default seed data is populated
  seedSqliteData(db);
}

function seedSqliteData(db) {
  // Staff password hash for 'admin12345'
  const staffPassHash = bcrypt.hashSync('admin12345', 10);
  
  db.exec(`
    INSERT OR IGNORE INTO procurement_centers (id, name, agency, address, village, district, state) VALUES
    ('00000000-0000-0000-0000-000000000001', 'FCI Warehouse, Perungudi', 'FCI', 'Perungudi Main Yard, Bay 04', 'Perungudi', 'Chennai', 'Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000002', 'State Procurement Centre, Ambattur', 'State Procurement', 'Industrial Estate, Ambattur', 'Ambattur', 'Chennai', 'Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000003', 'Cooperative Centre, Madipakkam', 'Cooperative', 'Bazaar Road, Madipakkam', 'Madipakkam', 'Chennai', 'Tamil Nadu');

    INSERT OR IGNORE INTO center_crops (center_id, crop_code) VALUES
    ('00000000-0000-0000-0000-000000000001', 'wheat'),
    ('00000000-0000-0000-0000-000000000001', 'paddy'),
    ('00000000-0000-0000-0000-000000000001', 'cotton'),
    ('00000000-0000-0000-0000-000000000002', 'wheat'),
    ('00000000-0000-0000-0000-000000000002', 'paddy'),
    ('00000000-0000-0000-0000-000000000002', 'cotton'),
    ('00000000-0000-0000-0000-000000000003', 'wheat'),
    ('00000000-0000-0000-0000-000000000003', 'paddy'),
    ('00000000-0000-0000-0000-000000000003', 'cotton');

    INSERT OR IGNORE INTO farmers (id, phone, full_name, village, district, state, preferred_language) VALUES
    ('f0000000-0000-0000-0000-000000000001', '+919876543210', 'Ramesh Krishnan', 'Perungudi Village', 'Chennai', 'Tamil Nadu', 'en'),
    ('f0000000-0000-0000-0000-000000000002', '+919812345671', 'Rameshwar Singh', 'Karnal Sector 4', 'Karnal', 'Haryana', 'hi'),
    ('f0000000-0000-0000-0000-000000000003', '+919812345672', 'Sukhdev Brar', 'Kotkapura Mandi', 'Faridkot', 'Punjab', 'pa'),
    ('f0000000-0000-0000-0000-000000000004', '+919812345673', 'Anita Devi', 'Alwar Rural Yard', 'Alwar', 'Rajasthan', 'hi'),
    ('f0000000-0000-0000-0000-000000000005', '+919812345674', 'Gurpreet Mann', 'Ludhiana Central', 'Ludhiana', 'Punjab', 'pa');

    INSERT OR REPLACE INTO staff_users (id, phone, full_name, password_hash, role, center_id, active) VALUES
    ('s0000000-0000-0000-0000-000000000001', '+919000000000', 'Officer Ramanathan', '${staffPassHash}', 'staff', '00000000-0000-0000-0000-000000000001', 1),
    ('s0000000-0000-0000-0000-000000000002', '+919876543210', 'Administrator (Central Mandi)', '${staffPassHash}', 'admin', '00000000-0000-0000-0000-000000000001', 1);
  `);

  // Seed dynamic rolling slots for next 7 days
  seedRollingSlots(db);

  // Seed active farmer booking for Ramesh Krishnan (matching Farm2Mart portal) only if bookings table is empty
  const bookingCount = db.prepare('SELECT count(*) as cnt FROM bookings').get();
  if (!bookingCount || bookingCount.cnt === 0) {
    const firstSlot = db.prepare('SELECT id FROM slots WHERE center_id = ? ORDER BY start_at LIMIT 1').get('00000000-0000-0000-0000-000000000001');
    const slotId = firstSlot?.id || 'slot-default-001';
    db.prepare(`
      INSERT OR IGNORE INTO bookings (id, farmer_id, slot_id, crop_code, estimated_quantity_kg, token_number, status, vehicle_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', slotId, 'cotton', 4000, 'F2M-4527', 'booked', 'TN-09-BK-4527');

    db.prepare(`
      INSERT OR IGNORE INTO booking_events (booking_id, status, note)
      VALUES (?, 'booked', 'Slot booked at Farm2Mart portal')
    `).run('b0000000-0000-0000-0000-000000000001');
  }


  // Seed sample grievances
  db.prepare(`
    INSERT OR IGNORE INTO grievances (id, farmer_id, category, description, status, resolution) VALUES
    ('g0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'quality', 'Moisture meter calibration was requested during cotton lot assessment.', 'open', NULL),
    ('g0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004', 'payment', 'DBT Aadhaar link status verification delay for mustard consignment #F2M-6703.', 'in_review', 'Bank IFSC routing verified. Payment batch scheduled.'),
    ('g0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', 'slot', 'Weighbridge slot entry token timing extension requested due to highway tractor queue.', 'resolved', 'Extended gate pass by 90 minutes. Priority weighbridge lane assigned.');
  `).run();
}

export function seedRollingSlots(dbInstance = null) {
  const db = dbInstance || sqliteDb;
  if (!db) return;
  
  const centers = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'];
  const slotWindows = [
    { start: '07:00:00', end: '08:30:00', reserved: 4, expected: 5 },
    { start: '09:00:00', end: '10:30:00', reserved: 16, expected: 18 },
    { start: '11:00:00', end: '12:30:00', reserved: 26, expected: 27 },
    { start: '15:00:00', end: '16:30:00', reserved: 6, expected: 8 }
  ];

  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dateObj = new Date(today.getTime() + dayOffset * 86400000);
    const dateStr = dateObj.toISOString().slice(0, 10);

    for (const centerId of centers) {
      for (const win of slotWindows) {
        const startAt = `${dateStr}T${win.start}Z`;
        const endAt = `${dateStr}T${win.end}Z`;
        const slotId = crypto.randomUUID();

        try {
          db.prepare(`
            INSERT INTO slots (id, center_id, start_at, end_at, capacity, reserved_count, active)
            VALUES (?, ?, ?, ?, 30, ?, 1)
            ON CONFLICT(center_id, start_at) DO NOTHING
          `).run(slotId, centerId, startAt, endAt, win.reserved);

          db.prepare(`
            INSERT INTO queue_forecasts (slot_id, expected_arrivals, model_version)
            VALUES (?, ?, 'v1.0-crowd-ml')
            ON CONFLICT(slot_id) DO NOTHING
          `).run(slotId, win.expected);
        } catch {
          // Ignore conflict
        }
      }
    }
  }
}

// Universal Query function
export async function query(text, params = []) {
  if (pgPool) {
    try {
      return await pgPool.query(text, params);
    } catch (err) {
      console.warn('[DB] PG query error, falling back to SQLite:', err.message);
      initSqlite();
    }
  }

  // SQLite execution
  if (!sqliteDb) initSqlite();

  // Adapt PostgreSQL SQL syntax to SQLite
  let adaptedSql = text
    // Replace $1, $2 with ?1, ?2
    .replace(/\$(\d+)/g, '?$1')
    // Replace ::text, ::decimal, ::date casting
    .replace(/::text/gi, '')
    .replace(/::decimal/gi, '')
    .replace(/::date/gi, '')
    // Replace ILIKE with LIKE
    .replace(/\bILIKE\b/gi, 'LIKE')
    // Remove FOR UPDATE
    .replace(/\bFOR UPDATE\b/gi, '')
    // Replace boolean true/false
    .replace(/\btrue\b/gi, '1')
    .replace(/\bfalse\b/gi, '0');

  // Handle start_at::date = $2 comparison
  adaptedSql = adaptedSql.replace(/start_at = \?(\d+)/g, 'substr(start_at, 1, 10) = ?$1');
  adaptedSql = adaptedSql.replace(/s\.start_at = \?(\d+)/g, 'substr(s.start_at, 1, 10) = ?$1');

  try {
    const stmt = sqliteDb.prepare(adaptedSql);
    
    // Check if statement returns rows
    const isSelect = /^\s*(SELECT|WITH)\b/i.test(adaptedSql) || /RETURNING\b/i.test(adaptedSql);
    
    // Sanitize parameters for SQLite (serialize objects to JSON strings, dates to ISO, undefined to null)
    const sanitizedParams = params.map((p) => {
      if (p === undefined) return null;
      if (p instanceof Date) return p.toISOString();
      if (typeof p === 'object' && p !== null && !(p instanceof Uint8Array) && !(p instanceof ArrayBuffer)) {
        return JSON.stringify(p);
      }
      return p;
    });

    if (isSelect) {
      const rows = stmt.all(...sanitizedParams);
      // Clean null prototype if present
      const cleanRows = rows.map((r) => ({ ...r }));
      return { rows: cleanRows, rowCount: cleanRows.length };
    } else {
      const info = stmt.run(...sanitizedParams);
      return { rows: [], rowCount: info.changes };
    }
  } catch (err) {
    console.error('[DB-SQLite Error]', err.message, '\nSQL:', adaptedSql, '\nParams:', params);
    throw err;
  }
}

// Universal Transaction function
export async function transaction(work) {
  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // SQLite transaction
  if (!sqliteDb) initSqlite();
  sqliteDb.exec('BEGIN TRANSACTION');
  try {
    const client = { query };
    const result = await work(client);
    sqliteDb.exec('COMMIT');
    return result;
  } catch (e) {
    try { sqliteDb.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

export const pool = {
  query,
  connect: async () => ({ query, release: () => {} })
};

