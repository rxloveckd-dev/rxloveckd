declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;

const built = new Date(__APP_BUILT__);

/** e.g. "เวอร์ชัน 1.0.0" */
export const VERSION_LABEL = `เวอร์ชัน ${__APP_VERSION__}`;

/** e.g. "อัปเดต 3 พ.ย. 2569 · adb149a" — tells staff which build they are on. */
export const BUILD_LABEL = [
  `อัปเดต ${built.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  __APP_COMMIT__,
]
  .filter(Boolean)
  .join(' · ');
