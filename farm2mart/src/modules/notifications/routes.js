import { Router } from 'express';
import { query } from '../../lib/db.js';
import { asyncRoute } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/**
 * List recent dispatched notifications (SMS / IVR)
 */
router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query(`
    SELECT 
      n.id,
      n.farmer_id,
      n.channel,
      n.template,
      n.payload,
      n.status,
      n.sent_at,
      n.created_at,
      COALESCE(f.full_name, 'Farmer') AS farmer_name,
      f.phone AS farmer_phone
    FROM notifications n
    LEFT JOIN farmers f ON f.id = n.farmer_id
    ORDER BY n.created_at DESC
    LIMIT 100
  `);
  res.json(rows);
}));

export default router;
