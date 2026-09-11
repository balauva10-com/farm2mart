import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../lib/db.js';
import { asyncRoute, AppError } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { queueNotification } from '../notifications/service.js';

const router = Router();
router.use(requireAuth);

// Advance stage for demo simulation
router.post('/:bookingId/advance', asyncRoute(async (req, res) => {
  const found = await query('SELECT b.*, p.quality_grade, p.accepted_quantity_kg FROM bookings b LEFT JOIN produce_records p ON p.booking_id = b.id WHERE b.id=$1', [req.params.bookingId]);
  if (!found.rows[0]) throw new AppError(404, 'Booking not found', 'NOT_FOUND');

  const currentStatus = found.rows[0].status;
  let nextStatus = 'arrived';
  let note = 'Gate Arrival & Weighbridge 1 Gross Weigh-in confirmed';
  let qualityGrade = found.rows[0].quality_grade || 'Grade A';
  let acceptedKg = found.rows[0].accepted_quantity_kg || found.rows[0].estimated_quantity_kg;

  if (currentStatus === 'booked') {
    nextStatus = 'arrived';
    note = 'Vehicle entered Gate 02. Electronic gross weigh-in confirmed: 6,420 kg.';
  } else if (currentStatus === 'arrived') {
    nextStatus = 'quality_check';
    note = 'Assaying lab core sample verified: Moisture 14.2% (Pass), Purity 98.4% (Grade A).';
    qualityGrade = 'Grade A';
  } else if (currentStatus === 'quality_check') {
    nextStatus = 'payment_pending';
    note = 'Unloaded at Bay 04. Tare weigh-out complete. Net grain yield: 4,010 kg.';
    acceptedKg = 4010;
  } else if (currentStatus === 'payment_pending') {
    nextStatus = 'paid';
    note = 'PFMS DBT Disbursal cleared directly into Aadhaar-linked account. Ref: DBT-TN-2026-88291.';
  } else if (currentStatus === 'paid') {
    // Reset back to booked for endless demo
    nextStatus = 'booked';
    note = 'Resetting demo cycle to Booked.';
  }

  await query('UPDATE bookings SET status=$2, updated_at=now() WHERE id=$1', [req.params.bookingId, nextStatus]);
  
  await query(`
    INSERT INTO produce_records(booking_id, quality_grade, accepted_quantity_kg, payment_status, payment_reference)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(booking_id) DO UPDATE SET
      quality_grade = COALESCE(EXCLUDED.quality_grade, produce_records.quality_grade),
      accepted_quantity_kg = COALESCE(EXCLUDED.accepted_quantity_kg, produce_records.accepted_quantity_kg),
      payment_status = EXCLUDED.payment_status,
      payment_reference = COALESCE(EXCLUDED.payment_reference, produce_records.payment_reference),
      updated_at = now()
  `, [
    req.params.bookingId,
    qualityGrade,
    acceptedKg,
    nextStatus === 'paid' ? 'paid' : 'pending',
    nextStatus === 'paid' ? 'DBT-TN-2026-88291' : null
  ]);

  await query('INSERT INTO booking_events(booking_id, status, note) VALUES ($1, $2, $3)', [
    req.params.bookingId,
    nextStatus,
    note
  ]);

  await queueNotification({
    farmerId: found.rows[0].farmer_id,
    template: 'produce_status_changed',
    payload: { status: nextStatus }
  });

  res.json({
    bookingId: req.params.bookingId,
    status: nextStatus,
    note,
    qualityGrade,
    acceptedQuantityKg: acceptedKg
  });
}));

router.patch('/:bookingId', asyncRoute(async (req, res) => {
  const found = await query('SELECT farmer_id FROM bookings WHERE id=$1', [req.params.bookingId]);
  if (!found.rows[0]) throw new AppError(404, 'Booking not found', 'NOT_FOUND');

  // Allow staff/admin OR the farmer who owns the booking in demo mode
  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';
  const isOwner = req.user.sub === found.rows[0].farmer_id;
  if (!isStaff && !isOwner) {
    throw new AppError(403, 'You do not have access to update this consignment', 'FORBIDDEN');
  }

  const body = z.object({
    status: z.enum(['booked', 'arrived', 'quality_check', 'payment_pending', 'paid', 'rejected']),
    qualityGrade: z.string().max(20).optional(),
    acceptedQuantityKg: z.number().nonnegative().optional(),
    paymentReference: z.string().max(100).optional()
  }).parse(req.body);

  await query('UPDATE bookings SET status=$2, updated_at=now() WHERE id=$1', [req.params.bookingId, body.status]);
  
  await query(`
    INSERT INTO produce_records(booking_id, quality_grade, accepted_quantity_kg, payment_status, payment_reference)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(booking_id) DO UPDATE SET
      quality_grade = COALESCE(EXCLUDED.quality_grade, produce_records.quality_grade),
      accepted_quantity_kg = COALESCE(EXCLUDED.accepted_quantity_kg, produce_records.accepted_quantity_kg),
      payment_status = EXCLUDED.payment_status,
      payment_reference = COALESCE(EXCLUDED.payment_reference, produce_records.payment_reference),
      updated_at = now()
  `, [
    req.params.bookingId,
    body.qualityGrade,
    body.acceptedQuantityKg,
    body.status === 'paid' ? 'paid' : 'pending',
    body.paymentReference
  ]);

  await query('INSERT INTO booking_events(booking_id, status, note) VALUES ($1, $2, $3)', [
    req.params.bookingId,
    body.status,
    `Updated by ${isStaff ? 'procurement staff' : 'farmer simulation'}`
  ]);

  await queueNotification({
    farmerId: found.rows[0].farmer_id,
    template: 'produce_status_changed',
    payload: { status: body.status }
  });

  res.json({ bookingId: req.params.bookingId, status: body.status });
}));

export default router;

