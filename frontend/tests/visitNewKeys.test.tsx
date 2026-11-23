import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VisitNew } from '../src/pages/VisitNew';

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock('../src/api', async (original) => ({
  ...(await original<typeof import('../src/api')>()),
  usePatient: () => ({
    isLoading: false,
    error: null,
    data: { patient: { id: 'p1', title: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ', hn: '000000123', age: 70, latestGfr: null, color: null } },
  }),
  usePatientMutation: () => ({ mutateAsync, isPending: false }),
}));

function open() {
  render(
    <MemoryRouter initialEntries={['/patients/p1/visits/new']}>
      <Routes>
        <Route path="/patients/:id/visits/new" element={<VisitNew />} />
        <Route path="/patients/:id" element={<p>หน้าผู้ป่วย</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('new visit form keys', () => {
  beforeEach(() => {
    // This jsdom build has no localStorage, so give the page a small in-memory one.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    mutateAsync.mockReset().mockResolvedValue({});
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens with the cursor in Note เภสัชกร when that was ticked on the patient page', () => {
    localStorage.setItem('loveckd-visit-jump-to-note', '1');
    open();
    expect(document.activeElement).toBe(screen.getByLabelText('Note เภสัชกร'));
  });

  it('opens at the top as before when it was not ticked', () => {
    open();
    expect(document.activeElement).not.toBe(screen.getByLabelText('Note เภสัชกร'));
  });

  it('checks the form on F9 like the save button does', async () => {
    open();
    await userEvent.keyboard('{F9}');
    expect((await screen.findByRole('alert')).textContent).toContain('ACEI/ARB');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('when ticked, saves without ACEI/ARB chosen', async () => {
    localStorage.setItem('loveckd-visit-jump-to-note', '1');
    open();
    expect(screen.getByText('ยากลุ่ม ACEI/ARB (ไม่บังคับ)')).toBeTruthy();
    await userEvent.keyboard('{F9}');
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({ skipAceiArb: true });
    expect(mutateAsync.mock.calls[0]?.[0].aceiArb).toBeUndefined();
  });

  it('saves on F9, with what was typed in the note', async () => {
    localStorage.setItem('loveckd-visit-jump-to-note', '1');
    open();
    await userEvent.keyboard('สอนวิธีใช้ยา');
    await userEvent.click(document.querySelector<HTMLInputElement>('input[name="aceiArb"][value="yes"]')!);
    await userEvent.click(screen.getByRole('radio', { name: 'Enalapril' }));
    await userEvent.keyboard('{F9}');
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({ furtherAdjustments: 'สอนวิธีใช้ยา' });
    expect(await screen.findByText('หน้าผู้ป่วย')).toBeTruthy();
  });
});
