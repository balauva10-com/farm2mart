import { Router } from 'express';
import { z } from 'zod';
import { query, seedRollingSlots } from '../../lib/db.js';
import { asyncRoute } from '../../lib/http.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  const { district, crop } = z.object({
    district: z.string().optional(),
    crop: z.string().optional()
  }).parse(req.query);

  const { rows } = await query(`
    SELECT DISTINCT c.* 
    FROM procurement_centers c 
    LEFT JOIN center_crops cc ON cc.center_id = c.id 
    WHERE c.active = 1 
      AND ($1 IS NULL OR c.district LIKE $1) 
      AND ($2 IS NULL OR LOWER(cc.crop_code) = LOWER($2)) 
    ORDER BY c.name
  `, [district ? `%${district}%` : null, crop || null]);

  // Attach supported crops for each center
  for (const center of rows) {
    const cropsResult = await query('SELECT crop_code FROM center_crops WHERE center_id = $1', [center.id]);
    center.crops = cropsResult.rows.map(r => r.crop_code);
  }

  res.json(rows);
}));

router.get('/:centerId/slots', asyncRoute(async (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const queryDate = req.query.date ? String(req.query.date).slice(0, 10) : todayStr;

  let { rows } = await query(`
    SELECT 
      s.id, 
      s.start_at, 
      s.end_at, 
      s.capacity, 
      s.reserved_count, 
      ROUND(100.0 * s.reserved_count / NULLIF(s.capacity, 0)) AS occupancy_percent, 
      CASE 
        WHEN s.reserved_count * 1.0 / NULLIF(s.capacity, 0) < 0.45 THEN 'low' 
        WHEN s.reserved_count * 1.0 / NULLIF(s.capacity, 0) < 0.75 THEN 'medium' 
        ELSE 'high' 
      END AS crowd_level 
    FROM slots s 
    WHERE s.center_id = $1 
      AND substr(s.start_at, 1, 10) = $2 
      AND s.active = 1 
    ORDER BY s.start_at
  `, [req.params.centerId, queryDate]);

  // If no slots exist for this date, seed rolling slots and re-query
  if (rows.length === 0) {
    seedRollingSlots();
    const retry = await query(`
      SELECT 
        s.id, 
        s.start_at, 
        s.end_at, 
        s.capacity, 
        s.reserved_count, 
        ROUND(100.0 * s.reserved_count / NULLIF(s.capacity, 0)) AS occupancy_percent, 
        CASE 
          WHEN s.reserved_count * 1.0 / NULLIF(s.capacity, 0) < 0.45 THEN 'low' 
          WHEN s.reserved_count * 1.0 / NULLIF(s.capacity, 0) < 0.75 THEN 'medium' 
          ELSE 'high' 
        END AS crowd_level 
      FROM slots s 
      WHERE s.center_id = $1 
        AND substr(s.start_at, 1, 10) = $2 
        AND s.active = 1 
      ORDER BY s.start_at
    `, [req.params.centerId, queryDate]);
    rows = retry.rows;
  }

  res.json(rows);
}));

router.get(['/operations/metrics', '/:centerId/metrics'], asyncRoute(async (req, res) => {
  const centerId = req.params.centerId || '00000000-0000-0000-0000-000000000001';
  
  // Calculate summary metrics from SQLite / Postgres
  const totalWeightRes = await query('SELECT SUM(COALESCE(produce_records.accepted_quantity_kg, bookings.estimated_quantity_kg, 0)) as total_kg FROM bookings LEFT JOIN produce_records ON bookings.id = produce_records.booking_id WHERE bookings.status != $1', ['cancelled']);
  const totalKg = Number(totalWeightRes.rows[0]?.total_kg || 0);
  const totalQtl = Math.round(totalKg / 100);

  const activePassesRes = await query("SELECT count(*) as cnt FROM bookings WHERE status IN ('booked', 'arrived', 'quality_check')");
  const activePasses = Number(activePassesRes.rows[0]?.cnt || 0);

  const vehiclesQueueRes = await query("SELECT count(*) as cnt FROM bookings WHERE status = 'arrived'");
  const vehiclesQueue = Number(vehiclesQueueRes.rows[0]?.cnt || 0);

  const paidRes = await query("SELECT count(*) as paid_cnt, SUM(COALESCE(accepted_quantity_kg, 0)) as paid_kg FROM produce_records WHERE payment_status = 'paid'");
  const paidKg = Number(paidRes.rows[0]?.paid_kg || 0);
  // Approx MSP calculation: ~₹2,275 per Qtl
  const dbtAmountLakhs = Number((paidKg * 22.75 / 100000).toFixed(2));

  res.json({
    centerId,
    centerName: 'Central Mandi #402',
    totalProcuredQtl: totalQtl,
    totalProcuredTrend: activePasses > 0 ? `${activePasses} active passes` : 'No active bookings',
    activeGatePasses: activePasses,
    vehiclesInQueue: vehiclesQueue,
    qualityPassRate: activePasses > 0 ? '100%' : 'N/A',
    dbtDisbursedLakhs: dbtAmountLakhs,
    systemStatus: 'Optimal'
  });
}));

export default router;

