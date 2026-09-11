import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, AppError } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { createBooking, listBookings } from './service.js';
import { query } from '../../lib/db.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncRoute(async (req, res) => res.json(await listBookings(req.user.sub, req.user.role, req.query.centerId))));

// Clear accepted / completed / all bookings (Mandi Admin)
router.all('/clear-accepted', asyncRoute(async (req, res) => {
  const scope = req.query.scope || req.body?.scope || 'accepted';

  if (scope === 'all') {
    await query('DELETE FROM booking_events');
    await query('DELETE FROM produce_records');
    const delRes = await query('DELETE FROM bookings');
    return res.json({ success: true, count: delRes.rowCount || 0, message: 'All bookings cleared successfully', scope: 'all' });
  }

  // Find bookings with status IN ('paid', 'payment_pending', 'cancelled')
  const toClear = await query(`
    SELECT b.id FROM bookings b
    LEFT JOIN produce_records p ON p.booking_id = b.id
    WHERE b.status IN ('paid', 'payment_pending', 'cancelled') 
       OR p.payment_status = 'paid'
  `);
  const ids = toClear.rows.map(r => r.id);

  if (ids.length > 0) {
    for (const id of ids) {
      await query('DELETE FROM booking_events WHERE booking_id = $1', [id]);
      await query('DELETE FROM produce_records WHERE booking_id = $1', [id]);
      await query('DELETE FROM bookings WHERE id = $1', [id]);
    }
  }

  res.json({ success: true, count: ids.length, message: `Cleared ${ids.length} accepted request(s)`, scope: 'accepted' });
}));

router.get('/active/current', asyncRoute(async (req, res) => {
  const { rows } = await query(`
    SELECT 
      b.*, 
      s.start_at, 
      s.end_at, 
      c.name AS center_name, 
      c.address AS center_address, 
      p.quality_grade, 
      p.accepted_quantity_kg, 
      p.payment_status, 
      p.payment_reference 
    FROM bookings b 
    JOIN slots s ON s.id = b.slot_id 
    JOIN procurement_centers c ON c.id = s.center_id 
    LEFT JOIN produce_records p ON p.booking_id = b.id 
    WHERE b.farmer_id = $1 
      AND b.status IN ('booked', 'arrived', 'quality_check', 'payment_pending')
    ORDER BY b.created_at DESC 
    LIMIT 1
  `, [req.user.sub]);

  if (!rows[0]) return res.json(null);
  const events = await query('SELECT status, note, created_at FROM booking_events WHERE booking_id=$1 ORDER BY created_at', [rows[0].id]);
  res.json({ ...rows[0], events: events.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const body = z.object({
    slotId: z.string().min(1),
    cropCode: z.string().min(2).max(30),
    estimatedQuantityKg: z.coerce.number().positive().max(100000),
    replaceActive: z.boolean().optional()
  }).parse(req.body);

  const booking = await createBooking({
    farmerId: req.user.sub,
    ...body
  });
  res.status(201).json(booking);
}));

router.get('/:bookingId', asyncRoute(async (req, res) => {
  const { rows } = await query(`
    SELECT 
      b.*, 
      s.start_at, 
      s.end_at, 
      c.name AS center_name, 
      c.address AS center_address,
      p.quality_grade, 
      p.accepted_quantity_kg, 
      p.payment_status, 
      p.payment_reference 
    FROM bookings b 
    JOIN slots s ON s.id = b.slot_id 
    JOIN procurement_centers c ON c.id = s.center_id 
    LEFT JOIN produce_records p ON p.booking_id = b.id 
    WHERE b.id = $1 AND (b.farmer_id = $2 OR $3 = 'staff' OR $3 = 'admin')
  `, [req.params.bookingId, req.user.sub, req.user.role || 'farmer']);

  if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
  
  const events = await query('SELECT status, note, created_at FROM booking_events WHERE booking_id=$1 ORDER BY created_at', [req.params.bookingId]);
  res.json({ ...rows[0], events: events.rows });
}));

router.post('/:bookingId/reschedule', asyncRoute(async (req, res) => {
  const { slotId } = z.object({ slotId: z.string().min(1) }).parse(req.body);
  const found = await query('SELECT * FROM bookings WHERE id=$1 AND farmer_id=$2', [req.params.bookingId, req.user.sub]);
  if (!found.rows[0]) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  
  const slot = await query('SELECT * FROM slots WHERE id=$1 AND active=1', [slotId]);
  if (!slot.rows[0]) throw new AppError(404, 'Slot not found', 'SLOT_NOT_FOUND');

  // Decrement old slot count, increment new slot count
  await query('UPDATE slots SET reserved_count = CASE WHEN reserved_count > 0 THEN reserved_count - 1 ELSE 0 END WHERE id=$1', [found.rows[0].slot_id]);
  await query('UPDATE slots SET reserved_count = reserved_count + 1 WHERE id=$1', [slotId]);

  await query('UPDATE bookings SET slot_id=$2, updated_at=now() WHERE id=$1', [req.params.bookingId, slotId]);
  await query("INSERT INTO booking_events(booking_id, status, note) VALUES ($1, $2, 'Slot timing rescheduled by farmer')", [req.params.bookingId, found.rows[0].status]);

  const updated = await query(`
    SELECT 
      b.*, 
      s.start_at, 
      s.end_at, 
      c.name AS center_name, 
      c.address AS center_address,
      p.quality_grade, 
      p.accepted_quantity_kg, 
      p.payment_status, 
      p.payment_reference 
    FROM bookings b 
    JOIN slots s ON s.id = b.slot_id 
    JOIN procurement_centers c ON c.id = s.center_id 
    LEFT JOIN produce_records p ON p.booking_id = b.id 
    WHERE b.id = $1
  `, [req.params.bookingId]);
  
  res.json(updated.rows[0]);
}));

router.post('/:bookingId/cancel', asyncRoute(async (req, res) => {
  const result = await query(
    "UPDATE bookings SET status='cancelled', cancelled_at=now() WHERE id=$1 AND farmer_id=$2 AND status='booked' RETURNING slot_id",
    [req.params.bookingId, req.user.sub]
  );
  if (!result.rows[0]) return res.status(409).json({ error: { code: 'CANNOT_CANCEL', message: 'Only a booked slot can be cancelled' } });
  
  await query('UPDATE slots SET reserved_count=GREATEST(reserved_count-1, 0) WHERE id=$1', [result.rows[0].slot_id]);
  await query("INSERT INTO booking_events(booking_id, status, note) VALUES ($1, 'cancelled', 'Cancelled by farmer')", [req.params.bookingId]);
  res.status(204).end();
}));

export default router;

