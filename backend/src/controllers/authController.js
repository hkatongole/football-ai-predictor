import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { ApiError } from '../middleware/errorHandler.js';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req, res, next) {
  try {
    const { email, username, password, fullName } = req.body;
    if (!email || !username || !password) throw new ApiError(400, 'email, username and password are required');

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) throw new ApiError(409, 'Email or username already in use');

    const role = await prisma.role.upsert({
      where: { name: 'USER' }, update: {}, create: { name: 'USER' },
    });

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { email, username, passwordHash, fullName, roleId: role.id, emailVerifyToken },
    });

    // TODO: send verification email via services/emailService.js
    res.status(201).json({
      success: true,
      message: 'Registered successfully. Please verify your email.',
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
      include: { role: true },
    });
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid credentials');

    const payload = { id: user.id, email: user.email, role: user.role.name };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);
    res.json({
      success: true,
      accessToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role.name, isPremium: user.isPremium },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, 'No refresh token provided');

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new ApiError(401, 'Refresh token invalid or expired');
    }

    const decoded = verifyRefreshToken(token);
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role });
    res.json({ success: true, accessToken });
  } catch (err) {
    next(new ApiError(401, 'Could not refresh session'));
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
    }
    res.clearCookie(REFRESH_COOKIE);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond 200 to avoid user enumeration
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
      });
      // TODO: send reset email via services/emailService.js
    }
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiry: { gt: new Date() } } });
    if (!user) throw new ApiError(400, 'Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new ApiError(400, 'Invalid verification token');

    await prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true, emailVerifyToken: null } });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    if (!user) throw new ApiError(404, 'User not found');

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role.name,
        isPremium: user.isPremium,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    next(err);
  }
}
