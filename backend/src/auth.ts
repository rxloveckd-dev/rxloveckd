import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type RequestHandler, type Response } from 'express';
import { loginSchema, type Role, type SessionUser } from '@rx/shared';
import { prisma } from './db';
import { audit } from './audit';
import { HttpError } from './errors';
import type { Config } from './config';

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

export const SESSION_COOKIE = 'rx_session';
const SESSION_HOURS = 8;

function setSession(res: Response, user: SessionUser, config: Config) {
  const token = jwt.sign(user, config.SESSION_SECRET, { expiresIn: `${SESSION_HOURS}h` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
}

export function sessionMiddleware(config: Config): RequestHandler {
  return (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      try {
        const { id, username, displayName, role } = jwt.verify(token, config.SESSION_SECRET) as SessionUser;
        req.user = { id, username, displayName, role };
      } catch {
        req.user = undefined;
      }
    }
    next();
  };
}

/** Server-side authorization for every protected route; hiding UI is not access control. */
export function requireRole(...roles: Role[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'unauthenticated', 'กรุณาเข้าสู่ระบบ'));
    if (!roles.includes(req.user.role)) {
      await audit(req, 'denied', req.baseUrl + req.path, null, 'denied');
      return next(new HttpError(403, 'forbidden', 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'));
    }
    next();
  };
}

export const CLINICAL: Role[] = ['pharmacist', 'supervisor'];

export function authRouter(config: Config): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    const ok = user?.active && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) {
      await prisma.auditLog.create({ data: { action: 'login', entity: 'user', outcome: 'denied' } });
      throw new HttpError(401, 'invalid_credentials', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    const session: SessionUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as Role,
    };
    setSession(res, session, config);
    req.user = session;
    await audit(req, 'login', 'user', user.id);
    res.json({ user: session });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    if (!req.user) throw new HttpError(401, 'unauthenticated', 'กรุณาเข้าสู่ระบบ');
    res.json({ user: req.user, demoMode: config.DEMO_MODE });
  });

  return router;
}
