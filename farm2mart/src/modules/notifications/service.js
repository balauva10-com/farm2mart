import { query } from '../../lib/db.js';
import { sendExotelSms, triggerExotelCall } from '../../lib/exotel.js';

/**
 * Format human-readable message text for farmer SMS
 */
function buildMessageBody(template, payload = {}) {
  const baseUrl = process.env.BASE_URL || 'https://farm2mart.onrender.com';
  switch (template) {
    case 'slot_confirmed':
      return `Farm2Mart: Namaste ${payload.farmerName || 'Kisan'}! Your procurement slot is CONFIRMED. Gate Pass Token: #${payload.token || 'N/A'}. Commodity: ${(payload.crop || 'Paddy').toUpperCase()} (${payload.qtyQtl || 40} Qtl) at ${payload.center || 'FCI Warehouse, Perungudi'}. Vehicle: ${payload.vehicle || 'Mandi Gate Entry'}. View Pass: ${baseUrl}/token-pass.html?token=${payload.token || ''}`;
    case 'produce_stage_advanced':
      return `Farm2Mart: Gate Pass #${payload.token || ''} has progressed to stage: ${(payload.stage || '').replace('_', ' ').toUpperCase()} at Mandi Weighbridge.`;
    case 'grievance_updated':
      return `Farm2Mart: Your grievance status is updated to: ${(payload.status || '').toUpperCase()}. Log in to review the resolution details.`;
    default:
      return `Farm2Mart: You have an updated status on your account. Log in to Farm2Mart for details: ${baseUrl}`;
  }
}

/**
 * Queue and dispatch a notification via Exotel SMS/IVR
 */
export async function queueNotification({ farmerId, channel = 'sms', template, payload = {} }) {
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // 1. Record in notifications table
  let notifId = null;
  try {
    const insertRes = await query(
      'INSERT INTO notifications(farmer_id, channel, template, payload, status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [farmerId, channel, template, payloadStr, 'queued']
    );
    notifId = insertRes.rows?.[0]?.id;
  } catch (err) {
    console.warn('[Notification DB Warning]', err.message);
  }

  // 2. Fetch farmer contact details if not supplied directly in payload
  let farmer = null;
  if (!payload.phone || !payload.farmerName) {
    try {
      const { rows } = await query('SELECT phone, full_name, preferred_language FROM farmers WHERE id = $1', [farmerId]);
      farmer = rows?.[0];
    } catch (err) {
      console.warn('[Notification Farmer Lookup Warning]', err.message);
    }
  }

  const targetPhone = payload.phone || farmer?.phone;
  if (!targetPhone) {
    console.log(`[Notification] Farmer ID ${farmerId} has no registered phone number. Notification logged as queued.`);
    return { queued: true, dispatched: false, reason: 'no_phone' };
  }

  if (farmer && !payload.farmerName && farmer.full_name) {
    payload.farmerName = farmer.full_name;
  }

  // 3. Dispatch via Exotel
  const body = buildMessageBody(template, payload);
  try {
    let result;
    if (channel === 'call' || channel === 'ivr') {
      result = await triggerExotelCall({ to: targetPhone });
    } else {
      result = await sendExotelSms({ to: targetPhone, body });
    }

    const finalStatus = result.success ? 'sent' : 'failed';
    if (notifId) {
      await query('UPDATE notifications SET status = $1, sent_at = now() WHERE id = $2', [finalStatus, notifId]);
    }

    return { queued: true, dispatched: result.success, mode: result.mode, result };
  } catch (ex) {
    console.warn('[Notification Dispatch Error]', ex.message);
    if (notifId) {
      await query('UPDATE notifications SET status = $1 WHERE id = $2', ['failed', notifId]);
    }
    return { queued: true, dispatched: false, error: ex.message };
  }
}
