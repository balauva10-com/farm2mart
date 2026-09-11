import { Router } from 'express'; import { z } from 'zod'; import { asyncRoute } from '../../lib/http.js'; import { requestOtp, verifyOtp, staffLogin } from './service.js';
const router = Router(); const phone = z.string().transform(v => String(v).replace(/[\s-]/g, '')).pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Use a valid phone number'));
router.post('/otp/request', asyncRoute(async (req, res) => { const { phone: number } = z.object({ phone }).parse(req.body); const result = await requestOtp(number); res.status(202).json({ message: 'OTP requested', expiresAt: result.expiresAt, ...(result.developmentCode && { developmentCode: result.developmentCode }) }); }));
router.post('/otp/verify', asyncRoute(async (req, res) => { const body = z.object({ phone, code: z.string().regex(/^\d{6}$/) }).parse(req.body); res.json(await verifyOtp(body.phone, body.code)); }));
router.post('/staff/login', asyncRoute(async (req,res) => { const body = z.object({ phone, password: z.string().min(4).max(200) }).parse(req.body); res.json(await staffLogin(body.phone, body.password)); }));
export default router;
