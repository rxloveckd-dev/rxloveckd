import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateInput } from '../src/components/DateInput';
import { enterToNext } from '../src/components/enterToNext';

function Form({ onSave }: { onSave: () => void }) {
  return (
    <form
      onKeyDown={enterToNext}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <input aria-label="แรก" />
      <label><input type="radio" name="q" value="a" />ก</label>
      <label><input type="radio" name="q" value="b" defaultChecked />ข</label>
      <select aria-label="เลือก"><option>1</option></select>
      <textarea aria-label="บันทึกย่อ" />
      <input aria-label="ปิดอยู่" disabled />
      <DateInput value="2026-07-13" onChange={() => {}} />
      <button>บันทึก</button>
    </form>
  );
}

describe('Enter in a form', () => {
  it('moves through the fields and only saves from the save button', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Form onSave={onSave} />);

    await user.click(screen.getByLabelText('แรก'));
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByLabelText('ข')); // the picked answer of the group

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByLabelText('เลือก')); // one stop per radio group

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByLabelText('บันทึกย่อ'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps Enter as a new line in a textarea', async () => {
    const user = userEvent.setup();
    render(<Form onSave={() => {}} />);
    await user.click(screen.getByLabelText('บันทึกย่อ'));
    await user.keyboard('ก{Enter}ข');
    expect((screen.getByLabelText('บันทึกย่อ') as HTMLTextAreaElement).value).toBe('ก\nข');
  });

  it('skips disabled fields and the calendar button, ending on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Form onSave={onSave} />);
    const date = screen.getByDisplayValue('13/07/2569');
    await user.click(date);
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'บันทึก' }));
    expect(onSave).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('does not treat Enter in the calendar lists as moving on', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Form onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'เลือกจากปฏิทิน' }));
    const year = screen.getByLabelText('ปี พ.ศ.');
    year.focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(year);
    expect(onSave).not.toHaveBeenCalled();
  });
});
