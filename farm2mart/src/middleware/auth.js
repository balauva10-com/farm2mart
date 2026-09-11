import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/http.js';
export function requireAuth(req, _res, next) { try { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new Error(); req.user = jwt.verify(token, env.jwtSecret); next(); } catch { next(new AppError(401, 'A valid access token is required', 'UNAUTHORIZED')); } }
export const requireRole = (...roles) => (req, _res, next) => roles.includes(req.user.role) ? next() : next(new AppError(403, 'You do not have access to this action', 'FORBIDDEN'));
