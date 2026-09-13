import { Router } from 'express';
import { query } from '../../lib/db.js';
import { queueNotification } from '../notifications/service.js';

const router = Router();

/**
 * Normalise Indian mobile phone number
 */
function normalisePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s-]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith('+') && cleaned.length === 10) cleaned = `+91${cleaned}`;
  return cleaned;
}

/**
 * Exotel Passthrough Applet Handler
 * Exotel sends GET or POST with:
 *  - CallSid: Call identifier
 *  - From: Caller mobile number
 *  - To: Exotel virtual number
 *  - Digits: Keypad pressed (optional)
 *  - CallType: inbound / outbound
 */
async function handlePassthrough(req, res) {
  // Support both urlencoded / JSON body and query params
  const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
  const rawFrom = params.From || params.Caller || params.phone || '';
  const digits = params.Digits || params.digits || '';
  const phone = normalisePhone(rawFrom);

  console.log(`[Exotel Passthrough] 📞 Incoming call from: ${phone} (Raw: "${rawFrom}"), Digits: "${digits}"`);

  let speechText = 'Namaste. Welcome to Farm2Mart Kisan Procurement Platform.';
  let bookingInfo = null;

  if (phone) {
    try {
      // Find or auto-register farmer
      let farmerRes = await query('SELECT id, full_name FROM farmers WHERE phone = $1 OR phone LIKE $2', [phone, '%' + phone.slice(-10)]);
      let farmerId = farmerRes.rows[0]?.id;
      let farmerName = farmerRes.rows[0]?.full_name;

      if (!farmerId) {
        farmerName = 'Kisan ' + phone.slice(-4);
        const newFarmer = await query(
          "INSERT INTO farmers (phone, full_name, village, preferred_language) VALUES ($1, $2, 'Perungudi Block', 'en') RETURNING id, full_name",
          [phone, farmerName]
        );
        farmerId = newFarmer.rows[0].id;
      } else if (!farmerName) {
        farmerName = 'Kisan ' + phone.slice(-4);
      }

      // If caller specifically pressed 1 for status check, return active status
      if (digits === '1') {
        const activeRes = await query(`
          SELECT b.id, b.token_number, b.crop_code, b.status, b.estimated_quantity_kg, c.name AS center_name
          FROM bookings b
          JOIN slots s ON s.id = b.slot_id
          JOIN procurement_centers c ON c.id = s.center_id
          WHERE b.farmer_id = $1 AND b.status IN ('booked', 'arrived', 'quality_check', 'payment_pending')
          ORDER BY b.created_at DESC LIMIT 1
        `, [farmerId]);

        if (activeRes.rows && activeRes.rows.length > 0) {
          const b = activeRes.rows[0];
          bookingInfo = b;
          const spelledToken = b.token_number.split('').join(' ');
          const qtl = Math.round(b.estimated_quantity_kg / 100);
          speechText = `Namaste ${farmerName}. Your active procurement pass is ${spelledToken}. For ${b.crop_code}, ${qtl} quintals at ${b.center_name}. Status is ${b.status.replace('_', ' ')}.`;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(200).send(speechText);
        }
      }

      // Get next available slot at FCI Warehouse
      const slotRes = await query("SELECT id, center_id, start_at, end_at FROM slots WHERE center_id = '00000000-0000-0000-0000-000000000001' AND active = 1 ORDER BY start_at LIMIT 1");
      const slotId = slotRes.rows[0]?.id || 'slot-default-001';

      const tokenNumber = `F2M-${Math.floor(1000 + Math.random() * 9000)}`;
      const cropCode = (digits === '2' ? 'wheat' : 'paddy');
      const qtyKg = 4000;
      const vehicleNumber = 'TN-' + phone.slice(-2) + '-IVR-' + Math.floor(1000 + Math.random() * 9000);

      // Auto-create confirmed slot booking & Gate Pass for this caller!
      const insertRes = await query(`
        INSERT INTO bookings (farmer_id, slot_id, crop_code, estimated_quantity_kg, token_number, status, vehicle_number)
        VALUES ($1, $2, $3, $4, $5, 'booked', $6)
        RETURNING *
      `, [farmerId, slotId, cropCode, qtyKg, tokenNumber, vehicleNumber]);

      await query("INSERT INTO booking_events(booking_id, status, note) VALUES ($1, 'booked', 'Slot booked automatically via Exotel IVR Call')", [insertRes.rows[0].id]);

      // Automatically dispatch SMS to caller's registered mobile number!
      const baseUrl = process.env.BASE_URL || 'https://farm2mart.onrender.com';
      const cleanSmsText = `Farm2Mart: Namaste ${farmerName}! Your procurement slot is CONFIRMED. Gate Pass Token: #${tokenNumber}. Commodity: ${cropCode.toUpperCase()} (40 Qtl) at FCI Warehouse, Perungudi. Vehicle: ${vehicleNumber}. View Pass: ${baseUrl}/token-pass.html?token=${tokenNumber}`;

      try {
        await queueNotification({
          farmerId,
          channel: 'sms',
          template: 'slot_confirmed',
          payload: {
            token: tokenNumber,
            crop: cropCode,
            qtyQtl: Math.round(qtyKg / 100),
            farmerName,
            center: 'FCI Warehouse, Perungudi',
            vehicle: vehicleNumber,
            phone: phone
          }
        });
      } catch (smsErr) {
        console.warn('[Exotel SMS Error]', smsErr.message);
      }

      bookingInfo = {
        ...insertRes.rows[0],
        farmer_name: farmerName,
        farmer_phone: phone,
        center_name: 'FCI Warehouse, Perungudi',
        sms_text: cleanSmsText
      };

      console.log(`[Exotel Passthrough] 🎫 NEW GATE PASS BOOKED: ${tokenNumber} for ${farmerName} (${phone}) - Truck: ${vehicleNumber}`);

      const spelledToken = tokenNumber.split('').join(' ');
      speechText = `Namaste ${farmerName}! Your procurement slot has been confirmed via Exotel. Your digital gate pass number is ${spelledToken}. Commodity is ${cropCode}, 40 quintals at FCI Warehouse, Perungudi. Your gate pass is now active on the Mandi Admin Console.`;
    } catch (err) {
      console.warn('[Exotel Passthrough DB Error]', err.message);
      speechText = 'Welcome to Farm2Mart Kisan Procurement. All mandi weighbridges are operating normally.';
    }
  }

  // Handle DTMF digits if configured in IVR flow
  if (digits === '1' && bookingInfo) {
    speechText = `Your pass number is ${bookingInfo.token_number.split('').join(' ')}. Status is ${bookingInfo.status.replace('_', ' ')}.`;
  } else if (digits === '2') {
    speechText = 'Today MSP rates are: Wheat rupees 2275 per quintal. Paddy rupees 2183 per quintal. Cotton rupees 7122 per quintal.';
  }

  // Set response headers for Exotel Flow variables
  if (bookingInfo?.token_number) {
    res.setHeader('X-Gate-Pass-Token', bookingInfo.token_number);
    res.setHeader('X-Exotel-SMS', bookingInfo.sms_text || '');
  }

  // If caller or Exotel applet specifically requests SMS format
  if (params.format === 'sms' || params.type === 'sms') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(bookingInfo?.sms_text || speechText);
  }

  // If client wants JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({
      status: 'success',
      speech: speechText,
      sms: bookingInfo?.sms_text,
      booking: bookingInfo
    });
  }

  // Plain text (read directly by Exotel Say Applet)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(speechText);
}

/**
 * Exotel SMS Applet Dedicated Handler
 * Can be plugged directly into Exotel Call Flow (SMS Applet URL)
 * GET or POST: /api/v1/exotel/sms?From=+919876543210
 */
async function handleSmsWebhook(req, res) {
  const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
  const rawFrom = params.From || params.Caller || params.phone || '';
  const phone = normalisePhone(rawFrom);
  const baseUrl = process.env.BASE_URL || 'https://farm2mart.onrender.com';

  if (!phone) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send('Farm2Mart: Welcome! Call this number to book your mandi procurement slot.');
  }

  try {
    const bookingRes = await query(`
      SELECT b.token_number, b.crop_code, b.estimated_quantity_kg, b.vehicle_number, b.status, c.name AS center_name, f.full_name AS farmer_name
      FROM bookings b
      JOIN farmers f ON f.id = b.farmer_id
      JOIN slots s ON s.id = b.slot_id
      JOIN procurement_centers c ON c.id = s.center_id
      WHERE f.phone = $1 OR f.phone LIKE $2
      ORDER BY b.created_at DESC LIMIT 1
    `, [phone, '%' + phone.slice(-10)]);

    if (bookingRes.rows && bookingRes.rows.length > 0) {
      const b = bookingRes.rows[0];
      const qtl = Math.round((b.estimated_quantity_kg || 4000) / 100);
      const sms = `Farm2Mart: Namaste ${b.farmer_name || 'Kisan'}! Your slot is CONFIRMED. Gate Pass #${b.token_number} for ${(b.crop_code || 'Paddy').toUpperCase()} (${qtl} Qtl) at ${b.center_name || 'FCI Warehouse'}. Gate Entry: ${b.vehicle_number}. View Pass: ${baseUrl}/token-pass.html?token=${b.token_number}`;

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(200).json({ status: 'success', sms, token: b.token_number });
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(sms);
    }
  } catch (err) {
    console.warn('[Exotel SMS Webhook Error]', err.message);
  }

  const fallback = 'Farm2Mart: Namaste! Your mandi procurement slot is active. Call our IVR anytime to view your status.';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(fallback);
}

// Support both GET and POST for Exotel Passthrough applet
router.get('/', handlePassthrough);
router.post('/', handlePassthrough);

// Dedicated SMS applet endpoint
router.all('/sms', handleSmsWebhook);

export default router;
