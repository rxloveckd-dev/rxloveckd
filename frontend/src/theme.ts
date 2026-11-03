import { useState } from 'react';

export const THEMES = [
  { id: 'navy', label: 'น้ำเงิน-เหลือง (เดิม)', swatch: 'linear-gradient(135deg, #1f2a44 50%, #ffe27a 50%)' },
  { id: 'pink', label: 'ชมพูพาสเทล', swatch: 'linear-gradient(135deg, #9c3d63 50%, #ffc9dd 50%)' },
  { id: 'mint', label: 'เขียวมิ้นต์', swatch: 'linear-gradient(135deg, #1d6b5b 50%, #b7ecd8 50%)' },
  { id: 'sky', label: 'ฟ้าสดใส', swatch: 'linear-gradient(135deg, #1c5ea6 50%, #c3e4ff 50%)' },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'loveckd-theme';

function read(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    /* storage blocked: use the default theme */
  }
  return 'navy';
}

function apply(id: ThemeId) {
  if (id === 'navy') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
}

/** Call once at startup so the saved theme shows before the first paint. */
export const applySavedTheme = () => apply(read());

export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(read);
  return [
    theme,
    (id) => {
      setTheme(id);
      apply(id);
      try {
        localStorage.setItem(KEY, id);
      } catch {
        /* the choice still applies for this visit */
      }
    },
  ];
}
