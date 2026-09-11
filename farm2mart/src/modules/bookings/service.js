import crypto from 'crypto';
import { transaction, query } from '../../lib/db.js';
import { AppError } from '../../lib/http.js';
import { queueNotification } from '../notifications/service.js';

const token = () => `F2M-${crypto.randomInt(1000, 10000)}`;

export async function createBooking({ farmerId, slotId, cropCode, estimatedQuantityKg, replaceActive = false }) {
  const booking = await transaction(async (client) => {
    const slot = await client.query('SELECT id, capacity, reserved_count, center_id FROM slots WHERE id=$1 AND active=1', [slotId]);
    if (!slot.rows[0]) throw new AppError(404, 'Slot not found', 'SLOT_NOT_FOUND');
    if (slot.rows[0].reserved_count >= slot.rows[0].capacity) throw new AppError(409, 'This slot is full. Choose another time.', 'SLOT_FULL');

    const existing = await client.query(
      "SELECT id, token_number FROM bookings WHERE farmer_id=$1 AND status IN ('booked','arrived','quality_check','payment_pending') ORDER BY created_at DESC LIMIT 1",
      [farmerId]
    );

    if (existing.rows[0]) {
      if (replaceActive) {
        // Auto cancel active previous booking to allow fresh booking
        await client.query("UPDATE bookings SET status='cancelled', cancelled_at=now() WHERE id=$1", [existing.rows[0].id]);
        await client.query("INSERT INTO booking_events(booking_id, status, note) VALUES ($1, 'cancelled', 'Replaced by farmer with new booking')", [existing.rows[0].id]);
      } else {
        throw new AppError(409, 'You already have an active booking', 'ACTIVE_BOOKING_EXISTS', {
          existingBookingId: existing.rows[0].id,
          tokenNumber: existing.rows[0].token_number
        });
      }
    }

    const tokenNumber = token();
    const result = await client.query(
      "INSERT INTO bookings(farmer_id, slot_id, crop_code, estimated_quantity_kg, token_number, status) VALUES ($1,$2,$3,$4,$5,'booked') RETURNING *",
      [farmerId, slotId, cropCode.toLowerCase(), estimatedQuantityKg, tokenNumber]
    );

    await client.query('UPDATE slots SET reserved_count = reserved_count + 1 WHERE id=$1', [slotId]);
    await client.query("INSERT INTO booking_events(booking_id, status, note) VALUES ($1,'booked','Slot confirmed')", [result.rows[0].id]);

    return result.rows[0];
  });

  await queueNotification({ farmerId, template: 'slot_confirmed', payload: { token: booking.token_number } });
  return booking;
}

export async function listBookings(userId, role = 'farmer', centerId = null) {
  if (role === 'staff' || role === 'admin') {
    let sql = `
      SELECT 
        b.*, 
        s.start_at, 
        s.end_at, 
        c.name AS center_name, 
        c.address AS center_address,
        COALESCE(f.full_name, 'Farmer') AS farmer_name,
        f.phone AS farmer_phone,
        f.village AS farmer_village,
        p.quality_grade,
        p.accepted_quantity_kg,
        p.payment_status,
        p.payment_reference
      FROM bookings b 
      JOIN slots s ON s.id = b.slot_id 
      JOIN procurement_centers c ON c.id = s.center_id 
      LEFT JOIN farmers f ON f.id = b.farmer_id
      LEFT JOIN produce_records p ON p.booking_id = b.id
    `;
    const params = [];
    if (centerId) {
      sql += ` WHERE s.center_id = $1`;
      params.push(centerId);
    }
    sql += ` ORDER BY b.created_at DESC`;
    const { rows } = await query(sql, params);
    return rows;
  }

  const { rows } = await query(`
    SELECT b.*, s.start_at, s.end_at, c.name AS center_name, c.address 
    FROM bookings b 
    JOIN slots s ON s.id = b.slot_id 
    JOIN procurement_centers c ON c.id = s.center_id 
    WHERE b.farmer_id = $1 
    ORDER BY b.created_at DESC
  `, [userId]);
  return rows;
}


