import type { IconName } from './types';

/** 24x24 线性图标（heroicons 风格，stroke 绘制） */
const PATHS: Record<IconName, string> = {
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' +
    '<path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>' +
    '<circle cx="15.6" cy="8.4" r="1" fill="currentColor" stroke="none"/>',
  scan:
    '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>' +
    '<path d="M4 12h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.8-3.8"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronsLeft: '<path d="m11 7-5 5 5 5M18 7l-5 5 5 5"/>',
  home:
    '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5"/>' +
    '<path d="M9.5 21v-6h5v6"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
    '<path d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9s1.4-6.4 3.9-9z"/>',
  store:
    '<path d="M4 9l1.4-5h13.2L20 9"/><path d="M4 9h16"/>' +
    '<path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9.5 20v-5h5v5"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/>' +
    '<path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>' +
    '<path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>',
  task:
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
  robot:
    '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5"/>' +
    '<circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="13" r=".7" fill="currentColor" stroke="none"/>' +
    '<circle cx="14.5" cy="13" r=".7" fill="currentColor" stroke="none"/><path d="M9.5 16.2h5"/>' +
    '<path d="M2.5 12v3M21.5 12v3"/>',
  building:
    '<rect x="5" y="3" width="14" height="18" rx="1.5"/>' +
    '<path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10.5 21v-3h3v3"/>',
  chip:
    '<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.5" y="10.5" width="3" height="3"/>' +
    '<path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3"/>',
  info:
    '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/>' +
    '<circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3.5V9h-5.5"/>',
  sparkles:
    '<path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/>' +
    '<path d="M18.6 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' +
    '<circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  external: '<path d="M13.5 5H19v5.5"/><path d="M19 5l-8.5 8.5"/><path d="M19 13.5V19H5V5h5.5"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  shield:
    '<path d="M12 3l7 2.8v5.4c0 4.4-3 8.1-7 9.8-4-1.7-7-5.4-7-9.8V5.8z"/>' +
    '<path d="m9 11.8 2.2 2.2 3.8-4"/>',
};

export function icon(name: IconName, size = 18, cls = ''): string {
  const clsAttr = cls ? ` ${cls}` : '';
  return (
    `<svg class="ic${clsAttr}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${PATHS[name]}</svg>`
  );
}
