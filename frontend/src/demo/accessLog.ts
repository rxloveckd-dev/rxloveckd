const REPEAT_AFTER_MS = 10 * 60 * 1000;

/**
 * Reports a patient being opened. Reopening within 10 minutes is the same look, and the page also
 * refetches on its own, so those are not logged again. A failed report is retried on the next open.
 */
export function createViewLogger(send: (patientId: string) => Promise<unknown>, now: () => number = Date.now) {
  const loggedAt = new Map<string, number>();
  return (patientId: string) => {
    const last = loggedAt.get(patientId);
    if (last !== undefined && now() - last < REPEAT_AFTER_MS) return;
    loggedAt.set(patientId, now());
    send(patientId).catch((err: unknown) => {
      loggedAt.delete(patientId);
      console.error('บันทึกการเปิดดูผู้ป่วยไม่สำเร็จ', err);
    });
  };
}
