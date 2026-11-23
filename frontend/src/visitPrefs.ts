import { useState } from 'react';

const KEY = 'loveckd-visit-jump-to-note';

/** Whether a new visit form opens with the cursor already in "Note เภสัชกร". Kept in this browser. */
export function readJumpToNote(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false; // storage blocked: open at the top as before
  }
}

export function useJumpToNote(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readJumpToNote);
  return [
    on,
    (next) => {
      setOn(next);
      try {
        if (next) localStorage.setItem(KEY, '1');
        else localStorage.removeItem(KEY);
      } catch {
        /* the choice still applies until the page is reloaded */
      }
    },
  ];
}
