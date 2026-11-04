import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DateKind } from '@rx/shared';
import { DateInput } from '../src/components/DateInput';

function Harness({ start = '', min, kind }: { start?: string; min?: string; kind?: DateKind }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <DateInput id="d" value={value} min={min} kind={kind} onChange={setValue} />
      <div data-testid="iso">{value}</div>
      <button>อื่น</button>
    </>
  );
}

const field = () => screen.getByRole('textbox') as HTMLInputElement;
const iso = () => screen.getByTestId('iso').textContent;

/** Puts the cursor at `at`, as a click on that digit would. */
async function caretAt(user: ReturnType<typeof userEvent.setup>, at: number) {
  await user.click(field());
  field().setSelectionRange(at, at);
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-04T05:00:00Z'), toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('typing a date', () => {
  it('adds the slashes and reads the year as พ.ศ.', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), '01122568');
    expect(field().value).toBe('01/12/2568');
    expect(iso()).toBe('2025-12-01');
  });

  it('also accepts a ค.ศ. year', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), '01122025');
    expect(iso()).toBe('2025-12-01');
  });
});

describe('editing a finished date', () => {
  it('replaces the digit after the cursor', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await caretAt(user, 0);
    await user.keyboard('2');
    expect(field().value).toBe('23/07/2569');
    expect(field().selectionStart).toBe(1);
    await user.keyboard('5');
    expect(field().value).toBe('25/07/2569');
    expect(iso()).toBe('2026-07-25');
  });

  it('moves on to the month after the last digit of the day', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await caretAt(user, 2);
    await user.keyboard('0');
    expect(field().value).toBe('13/07/2569');
    await user.keyboard('8');
    expect(field().value).toBe('13/08/2569');
  });

  it('keeps the month and year in place when a day digit is deleted', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await caretAt(user, 2);
    await user.keyboard('{Backspace}');
    expect(field().value).toBe('1/07/2569');
    await user.keyboard('5');
    expect(field().value).toBe('15/07/2569');
    expect(iso()).toBe('2026-07-15');
  });

  it('steps over a slash on Backspace instead of getting stuck', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await caretAt(user, 3);
    await user.keyboard('{Backspace}');
    expect(field().value).toBe('13/07/2569');
    expect(field().selectionStart).toBe(2);
    await user.keyboard('{Backspace}');
    expect(field().value).toBe('1/07/2569');
  });

  it('pads a one-digit day on leaving the field', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await user.click(field());
    field().setSelectionRange(0, 2);
    await user.keyboard('3');
    await user.tab();
    expect(field().value).toBe('03/07/2569');
    expect(iso()).toBe('2026-07-03');
  });
});

describe('warnings', () => {
  it('flags a future visit but keeps the date', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), '04112596');
    expect(screen.getByRole('status').textContent).toContain('อนาคต');
    expect(iso()).toBe('2053-11-04');
  });

  it('says so when the date does not exist', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), '31022569');
    expect(screen.getByRole('status').textContent).toContain('ไม่มีวันที่นี้');
    expect(iso()).toBe('');
  });

  it('allows a future appointment', async () => {
    const user = userEvent.setup();
    render(<Harness kind="appointment" />);
    await user.type(field(), '01022570');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('พ.ศ. calendar', () => {
  const openCalendar = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'เลือกจากปฏิทิน' }));

  it('opens on the chosen month in พ.ศ. and fills the field', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" />);
    await openCalendar(user);
    expect((screen.getByLabelText('ปี พ.ศ.') as HTMLSelectElement).selectedOptions[0]?.textContent).toBe('2569');
    await user.click(screen.getByRole('button', { name: '20 กรกฎาคม 2569' }));
    expect(field().value).toBe('20/07/2569');
    expect(iso()).toBe('2026-07-20');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('jumps to an older year for back-entered visits', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openCalendar(user);
    await user.selectOptions(screen.getByLabelText('ปี พ.ศ.'), '2566');
    await user.selectOptions(screen.getByLabelText('เดือน'), 'มีนาคม');
    await user.click(screen.getByRole('button', { name: '5 มีนาคม 2566' }));
    expect(iso()).toBe('2023-03-05');
  });

  it('crosses the year on the month arrows', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-01-10" />);
    await openCalendar(user);
    await user.click(screen.getByRole('button', { name: 'เดือนก่อน' }));
    expect(screen.getByRole('button', { name: '31 ธันวาคม 2568' })).toBeTruthy();
  });

  it('blocks days before `min`', async () => {
    const user = userEvent.setup();
    render(<Harness start="2026-07-13" min="2026-07-10" />);
    await openCalendar(user);
    expect((screen.getByRole('button', { name: '9 กรกฎาคม 2569' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '10 กรกฎาคม 2569' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('closes on Escape and on a click elsewhere', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openCalendar(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await openCalendar(user);
    await user.click(screen.getByRole('button', { name: 'อื่น' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
