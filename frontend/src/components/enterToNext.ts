import type { KeyboardEvent } from 'react';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;

const isStop = (el: Element): el is Control => {
  const fieldLike = el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
  const submit = el instanceof HTMLButtonElement && el.type === 'submit';
  return (fieldLike || submit) && !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0;
};

/** Radio buttons of one question, or a run of checkboxes, count as a single stop. */
const groupOf = (el: Element) => {
  if (!(el instanceof HTMLInputElement)) return null;
  if (el.type === 'radio') return `radio:${el.name}`;
  return el.type === 'checkbox' ? 'checkbox' : null;
};

/**
 * Form `onKeyDown`: Enter moves to the next field instead of saving. The last stop is the save
 * button, so saving is always a deliberate press. Enter still adds a new line in a textarea.
 */
export function enterToNext(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
  const current = e.target as Element;
  if (current instanceof HTMLTextAreaElement || current instanceof HTMLButtonElement) return;
  e.preventDefault();

  const stops = Array.from(e.currentTarget.elements).filter(isStop);
  const group = groupOf(current);
  const next = stops.slice(stops.indexOf(current as Control) + 1).find((el) => !group || groupOf(el) !== group);
  if (!next) return;
  const nextGroup = groupOf(next);
  const picked = nextGroup?.startsWith('radio:')
    ? stops.find((el) => groupOf(el) === nextGroup && (el as HTMLInputElement).checked)
    : undefined;
  (picked ?? next).focus();
}
