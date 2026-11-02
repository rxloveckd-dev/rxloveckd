import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'ข้อมูล') => new HttpError(404, 'not_found', `ไม่พบ${what}`);

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  nationalId: 'เลขบัตรประชาชนนี้ลงทะเบียนแล้ว',
  hn: 'HN นี้ลงทะเบียนแล้ว',
};

/** Thai messages without patient identifiers; details only in server logs (FR-033). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      error: { code: 'validation', message: first?.message ?? 'ข้อมูลไม่ถูกต้อง', field: first?.path.join('.') },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String((err.meta?.target as string[] | string | undefined) ?? '');
    const field = Object.keys(UNIQUE_FIELD_MESSAGES).find((f) => target.includes(f));
    res.status(409).json({
      error: { code: 'duplicate', message: field ? UNIQUE_FIELD_MESSAGES[field] : 'ข้อมูลซ้ำ', field },
    });
    return;
  }
  console.error('[error]', err instanceof Error ? err.stack : err);
  res.status(500).json({ error: { code: 'server_error', message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' } });
};
