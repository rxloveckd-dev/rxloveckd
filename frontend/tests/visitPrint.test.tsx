import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useVisitPrint, VisitPrintSheet, type VisitRow } from '../src/components/VisitDetails';

const visit: VisitRow = {
  id: 'v1',
  visitNo: 1,
  visitDate: '2026-11-05',
  medicationTaking: 'incorrect',
  medicationTakingDetail: 'แบ่งเม็ดยาไม่ได้',
  leftoverMeds: null,
  herbalOrPainkiller: false,
  herbalDetail: null,
  dietControlled: true,
  seasoning: 'adjusted',
  furtherAdjustments: 'สอนวิธีใช้ที่ตัดเม็ดยา',
  nextAppointment: '2027-02-11',
  aceiArb: 'no',
  aceiArbNoReason: 'BP ต่ำ',
  urgencyColor: 'red',
  pharmacistName: 'ภก.ทดสอบ',
};
const patient = { title: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ', hn: '000000123', nationalIdMasked: 'x-xxxx-xxxxx-03-0', age: 70, sex: 'male' as const };

function Harness({ log }: { log: (id: string) => Promise<unknown> }) {
  const printing = useVisitPrint(log);
  return (
    <>
      <button disabled={printing.busy} onClick={() => printing.print(visit)}>พิมพ์</button>
      {printing.error && <div role="alert">{printing.error}</div>}
      {printing.visit && <VisitPrintSheet patient={patient} visit={printing.visit} printedBy="ภญ.ผู้พิมพ์" />}
    </>
  );
}

describe('printing a visit', () => {
  let print: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    print = vi.fn();
    window.print = print as unknown as typeof window.print;
  });
  afterEach(() => vi.restoreAllMocks());

  it('logs first, then prints a sheet that says whose visit it is', async () => {
    const order: string[] = [];
    print.mockImplementation(() => order.push('print'));
    const log = vi.fn(async () => order.push('log'));
    render(<Harness log={log} />);

    await userEvent.click(screen.getByRole('button', { name: 'พิมพ์' }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['log', 'print']);
    expect(log).toHaveBeenCalledWith('v1');
    const sheet = document.querySelector('.print-sheet')!;
    expect(sheet.parentElement).toBe(document.body);
    expect(sheet.textContent).toContain('นายทดสอบ ระบบ');
    expect(sheet.textContent).toContain('HN 000000123');
    expect(sheet.textContent).toContain('ติดตามครั้งที่ 1');
    expect(sheet.textContent).toContain('สอนวิธีใช้ที่ตัดเม็ดยา');
    expect(sheet.textContent).toContain('โดย ภญ.ผู้พิมพ์');
    expect(document.body.classList.contains('printing')).toBe(true);
  });

  it('clears the sheet when the print dialog closes', async () => {
    render(<Harness log={async () => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'พิมพ์' }));
    await waitFor(() => expect(print).toHaveBeenCalled());

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });

    expect(document.querySelector('.print-sheet')).toBeNull();
    expect(document.body.classList.contains('printing')).toBe(false);
  });

  it('prints nothing when the log fails', async () => {
    render(<Harness log={() => Promise.reject(new Error('ออฟไลน์'))} />);

    await userEvent.click(screen.getByRole('button', { name: 'พิมพ์' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'พิมพ์ไม่สำเร็จ กรุณาลองใหม่');
    expect(print).not.toHaveBeenCalled();
    expect(document.querySelector('.print-sheet')).toBeNull();
  });
});
