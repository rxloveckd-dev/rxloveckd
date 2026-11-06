import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { AppointmentRow } from '@rx/shared';
import { Appointments } from '../src/pages/Appointments';

const row = (over: Partial<AppointmentRow>): AppointmentRow => ({
  id: 'p1',
  hn: '000000101',
  title: 'นาย',
  firstName: 'หนึ่ง',
  lastName: 'ทดสอบ',
  stage: '4',
  color: 'red',
  date: '2026-11-09',
  attendance: 'waiting',
  seePharmacist: 'yes',
  ...over,
});

const items = [
  row({}),
  row({ id: 'p2', hn: '000000102', firstName: 'สอง', color: null, seePharmacist: 'no', attendance: 'came' }),
  row({ id: 'p3', hn: '000000103', firstName: 'สาม', date: '2026-11-11', attendance: 'missed' }),
];

const useAppointments = vi.hoisted(() => vi.fn());
vi.mock('../src/api', async (original) => ({ ...(await original<typeof import('../src/api')>()), useAppointments }));

function Address() {
  return <output data-testid="address">{useLocation().search}</output>;
}

function open(search: string) {
  useAppointments.mockReturnValue({ data: { items }, isLoading: false, error: null });
  render(
    <MemoryRouter initialEntries={[`/appointments${search}`]}>
      <Appointments />
      <Address />
    </MemoryRouter>,
  );
}

describe('appointments page', () => {
  it('shows how many patients come on each day of the month', () => {
    open('?month=2026-11');

    expect(screen.getByRole('heading', { name: /พฤศจิกายน 2569/ })).toBeTruthy();
    expect(useAppointments).toHaveBeenCalledWith('2026-11');
    expect(screen.getByRole('button', { name: 'วันที่ 9 นัด 2 คน' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'วันที่ 11 นัด 1 คน' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'วันที่ 10 นัด 0 คน' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^วันที่ / })).toHaveLength(30);
  });

  it('lists who comes on the day picked, and keeps the day in the address', async () => {
    open('?month=2026-11');

    await userEvent.click(screen.getByRole('button', { name: 'วันที่ 9 นัด 2 คน' }));

    expect(screen.getByRole('heading', { name: /9 พ\.ย\. 2569: นัด 2 คน/ })).toBeTruthy();
    expect(screen.getByText('ต้องพบเภสัชกร 1 คน, มาแล้ว 1 คน')).toBeTruthy();
    const list = within(screen.getByRole('list'));
    expect(list.getByRole('link', { name: 'นายหนึ่ง ทดสอบ' }).getAttribute('href')).toBe('/patients/p1');
    expect(list.getByText('ยังไม่มา')).toBeTruthy();
    expect(list.getByText('มาแล้ว')).toBeTruthy();
    expect(list.getByText('ไม่ต้องพบเภสัชกร')).toBeTruthy();
    expect(list.queryByText(/สาม/)).toBeNull();
    expect(screen.getByTestId('address').textContent).toBe('?month=2026-11&day=2026-11-09');
  });

  it('opens on the day in the address and shows a missed appointment', () => {
    open('?month=2026-11&day=2026-11-11');

    expect(within(screen.getByRole('list')).getByText('เลยนัด')).toBeTruthy();
  });

  it('says so when the day has no appointments', async () => {
    open('?month=2026-11&day=2026-11-10');

    expect(screen.getByText('ไม่มีนัดในวันนี้')).toBeTruthy();
  });

  it('moves between months, including across a year', async () => {
    open('?month=2026-12&day=2026-12-01');

    await userEvent.click(screen.getByRole('button', { name: 'เดือนถัดไป' }));

    expect(screen.getByTestId('address').textContent).toBe('?month=2027-01');
    expect(useAppointments).toHaveBeenLastCalledWith('2027-01');
    expect(screen.getByText('เลือกวันในปฏิทินเพื่อดูรายชื่อ')).toBeTruthy();
  });
});
