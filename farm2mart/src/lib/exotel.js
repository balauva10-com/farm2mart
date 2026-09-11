/**
 * Exotel Cloud Telephony & SMS Client for Farm2Mart
 * Supports SMS OTP dispatch, booking alerts, and automated IVR voice calls.
 */
import { env } from '../config/env.js';

export function isExotelConfigured() {
  const c = env.exotel || {};
  return Boolean(c.accountSid && c.apiKey && c.apiToken);
}

const normalizePhone = (phone) => {
  let cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith('+') && cleaned.length === 10) cleaned = '+91' + cleaned;
  return cleaned;
};

/**
 * Send SMS via Exotel REST API
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. +919876543210)
 * @param {string} options.body - Message text
 * @param {string} [options.dltTemplateId] - DLT Template ID
 * @param {string} [options.dltEntityId] - DLT Principal Entity ID
 */
export async function sendExotelSms({ to, body, dltTemplateId, dltEntityId }) {
  const formattedTo = normalizePhone(to);
  const cfg = env.exotel || {};

  if (!isExotelConfigured()) {
    console.log(`[Exotel Demo/Mock] 📩 SMS dispatched to ${formattedTo}: "${body}"`);
    return {
      success: true,
      mode: 'mock',
      sid: 'EXO_MOCK_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      to: formattedTo,
      body,
      timestamp: new Date().toISOString()
    };
  }

  const subdomain = cfg.subdomain || 'api.in.exotel.com';
  const url = `https://${subdomain}/v1/Accounts/${cfg.accountSid}/Sms/send.json`;
  const authHeader = 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('From', cfg.callerId || '08045680000');
  params.append('To', formattedTo);
  params.append('Body', body);

  const tId = dltTemplateId || cfg.dltTemplateId;
  const eId = dltEntityId || cfg.dltEntityId;
  if (tId) params.append('DltTemplateId', tId);
  if (eId) params.append('DltEntityId', eId);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Exotel Error]', data);
      throw new Error(data.RestException?.Message || 'Exotel SMS dispatch failed');
    }

    const sid = data.SMSMessage?.Sid || data.Sid || 'EXO_SENT';
    console.log(`[Exotel] ✅ Live SMS delivered to ${formattedTo}. SID: ${sid}`);
    return {
      success: true,
      mode: 'live',
      sid,
      data
    };
  } catch (err) {
    console.warn('[Exotel Error]', err.message);
    // Fallback to mock logging so app never crashes
    return {
      success: false,
      mode: 'fallback',
      error: err.message,
      to: formattedTo
    };
  }
}

/**
 * Trigger an Automated Voice IVR Call via Exotel
 * @param {Object} options
 * @param {string} options.to - Farmer phone number
 * @param {string} [options.flowUrl] - Exotel App / Voice Flow URL
 */
export async function triggerExotelCall({ to, flowUrl }) {
  const formattedTo = normalizePhone(to);
  const cfg = env.exotel || {};

  if (!isExotelConfigured()) {
    console.log(`[Exotel Demo/Mock] 📞 Outbound IVR call triggered to ${formattedTo} (Flow: ${flowUrl || 'default-kisan-flow'})`);
    return {
      success: true,
      mode: 'mock',
      callSid: 'EXO_CALL_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      to: formattedTo
    };
  }

  const subdomain = cfg.subdomain || 'api.in.exotel.com';
  const url = `https://${subdomain}/v1/Accounts/${cfg.accountSid}/Calls/connect.json`;
  const authHeader = 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('From', formattedTo);
  params.append('To', cfg.callerId || '08045680000');
  params.append('CallerId', cfg.callerId || '08045680000');
  if (flowUrl) params.append('Url', flowUrl);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.RestException?.Message || 'Exotel Call connect failed');
    }
    return { success: true, mode: 'live', data };
  } catch (err) {
    console.warn('[Exotel Call Error]', err.message);
    return { success: false, error: err.message };
  }
}
