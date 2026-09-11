import { Router } from 'express';
import { query } from '../../lib/db.js';
import { asyncRoute } from '../../lib/http.js';

const router = Router();

router.get('/centers/:centerId/recommendations', asyncRoute(async (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const queryDate = req.query.date ? String(req.query.date).slice(0, 10) : todayStr;

  const { rows } = await query(`
    SELECT 
      s.id AS slot_id,
      s.start_at,
      s.end_at,
      s.capacity,
      s.reserved_count,
      COALESCE(f.expected_arrivals, s.reserved_count) AS expected_arrivals,
      ROUND(100.0 * COALESCE(f.expected_arrivals, s.reserved_count) / NULLIF(s.capacity, 0)) AS predicted_occupancy_percent,
      CASE 
        WHEN COALESCE(f.expected_arrivals, s.reserved_count) * 1.0 / NULLIF(s.capacity, 0) < 0.45 THEN 'low' 
        WHEN COALESCE(f.expected_arrivals, s.reserved_count) * 1.0 / NULLIF(s.capacity, 0) < 0.75 THEN 'medium' 
        ELSE 'high' 
      END AS crowd_level 
    FROM slots s 
    LEFT JOIN queue_forecasts f ON f.slot_id = s.id 
    WHERE s.center_id = $1 
      AND substr(s.start_at, 1, 10) = $2 
      AND s.active = 1 
    ORDER BY predicted_occupancy_percent, s.start_at
  `, [req.params.centerId, queryDate]);

  res.json(rows);
}));

export default router;

