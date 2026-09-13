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
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith('+') && cleaned.length === 10) cleaned = '+91' + cleaned;
  return cleaned;
};

/**
 * Send SMS via Exotel REST API (with Fast2SMS & Twilio automatic fallback)
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. +919876543210 or 9876543210)
 * @param {string} options.body - Message text
 * @param {string} [options.dltTemplateId] - DLT Template ID
 * @param {string} [options.dltEntityId] - DLT Principal Entity ID
 */
export async function sendExotelSms({ to, body, dltTemplateId, dltEntityId }) {
  const formattedTo = normalizePhone(to);
  const clean10 = formattedTo.slice(-10);
  const cfg = env.exotel || {};

  // 1. Primary: Exotel Official REST SMS API
  if (isExotelConfigured()) {
    const subdomain = cfg.subdomain || 'api.in.exotel.com';
    const url = `https://${subdomain}/v1/Accounts/${cfg.accountSid}/Sms/send.json`;
    const authHeader = 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', cfg.callerId || '08045680000');
    params.append('To', formattedTo);
    params.append('Body', body);
    params.append('Priority', 'high');
    params.append('EncodingType', 'plain');

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
        body: params.toString(),
        signal: AbortSignal.timeout(6000)
      });

      const data = await res.json();
      if (res.ok) {
        const sid = data.SMSMessage?.Sid || data.Sid || 'EXO_SENT';
        console.log(`[Exotel SMS] ✅ Live SMS delivered to ${formattedTo}. SID: ${sid}`);
        return {
          success: true,
          mode: 'exotel_live',
          sid,
          to: formattedTo,
          data
        };
      } else {
        console.warn('[Exotel SMS Error Response]', data);
      }
    } catch (err) {
      console.warn('[Exotel SMS Network Error]', err.message);
    }
  }

  // 2. Secondary: Fast2SMS Quick SMS (Popular for Indian Devs & Hackathons without DLT)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: body,
          language: 'english',
          flash: 0,
          numbers: clean10
        }),
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (data && data.return) {
        console.log(`[Fast2SMS] ✅ Live SMS delivered to ${clean10}: ${data.message?.[0] || 'Delivered'}`);
        return {
          success: true,
          mode: 'fast2sms_live',
          to: formattedTo,
          body,
          sid: 'F2S_' + Date.now()
        };
      } else {
        console.warn('[Fast2SMS Warning]', data);
      }
    } catch (fErr) {
      console.warn('[Fast2SMS Error]', fErr.message);
    }
  }

  // 3. Tertiary: Twilio Fallback
  if (env.twilio?.sid && env.twilio?.token && env.twilio?.from) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.sid}/Messages.json`;
      const twAuth = 'Basic ' + Buffer.from(`${env.twilio.sid}:${env.twilio.token}`).toString('base64');
      const twParams = new URLSearchParams();
      twParams.append('From', env.twilio.from);
      twParams.append('To', formattedTo);
      twParams.append('Body', body);

      const twRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': twAuth,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: twParams.toString(),
        signal: AbortSignal.timeout(5000)
      });
      const twData = await twRes.json();
      if (twRes.ok) {
        console.log(`[Twilio SMS] ✅ Live SMS delivered to ${formattedTo}. SID: ${twData.sid}`);
        return {
          success: true,
          mode: 'twilio_live',
          sid: twData.sid,
          to: formattedTo
        };
      }
    } catch (tErr) {
      console.warn('[Twilio SMS Error]', tErr.message);
    }
  }

  // 4. Default: Demo / Mock Mode with Console and Database Logging
  console.log(`[Farm2Mart SMS Simulator] 📩 SMS dispatched to ${formattedTo}: "${body}"`);
  return {
    success: true,
    mode: 'mock',
    sid: 'EXO_MOCK_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
    to: formattedTo,
    body,
    timestamp: new Date().toISOString()
  };
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
