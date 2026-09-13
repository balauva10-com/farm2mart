import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'farm2mart-jwt-secret-prototype-2026-secure',
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM_NUMBER
  },
  exotel: {
    accountSid: process.env.EXOTEL_ACCOUNT_SID || '',
    apiKey: process.env.EXOTEL_API_KEY || '',
    apiToken: process.env.EXOTEL_API_TOKEN || '',
    subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.in.exotel.com',
    callerId: process.env.EXOTEL_CALLER_ID || process.env.EXOTEL_VIRTUAL_NUMBER || process.env.EXOTEL_EXOPHONE || '',
    dltEntityId: process.env.EXOTEL_DLT_ENTITY_ID || '',
    dltTemplateId: process.env.EXOTEL_DLT_TEMPLATE_ID || ''
  },
  baseUrl: process.env.BASE_URL || 'https://farm2mart.onrender.com',
  isPostgres: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
};

