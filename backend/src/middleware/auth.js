import { verifyAccessToken } from '../utils/token.js';
import prisma from '../config/prisma.js';

/**
 * Verifies the JWT access token from the Authorization header
 * and attaches `req.user = { id, email, role }`.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles, e.g. requireRole('ADMIN', 'SUPER_ADMIN')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Optional auth: attaches req.user if a valid token is present, but never blocks the request.
 * Useful for endpoints that vary behavior for logged-in vs anonymous users (e.g. premium blur).
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) req.user = verifyAccessToken(token);
  } catch (_e) {
    /* ignore invalid token for optional auth */
  }
  next();
}
