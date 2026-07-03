import jwt from 'jsonwebtoken';
import 'dotenv/config';

/**
 * Same verification approach as football-ai-predictor/backend/src/middleware/auth.js's
 * optionalAuth — decodes the JWT issued by the main auth service if present, but never
 * blocks the request. The bridge does not issue its own tokens; it trusts tokens minted
 * by the existing auth backend (same JWT_ACCESS_SECRET).
 */
export function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (_e) {
    // invalid/missing token is fine for optional auth
  }
  next();
}
