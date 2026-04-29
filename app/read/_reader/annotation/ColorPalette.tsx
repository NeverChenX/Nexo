'use client';

import type { MarkColor } from '@/lib/reader/prefs';

const COLORS: { id: MarkColor; var: string; label: string }[] = [
  { id: 'yellow', var: 'var(--rd-mark-yellow)', label: '重点' },
  { id: 'red', var: 'var(--rd-mark-red)', label: '疑问' },
  { id: 'green', var: 'var(--rd-mark-green)', label: '同意' },
  { id: 'blue', var: 'var(--rd-mark-blue)', label: '待复习' },
];

export function ColorPalette({ onPick }: { onPick: (c: MarkColor) => void }) {
  return (
    <div className="rd-palette" role="toolbar" aria-label="选择划线颜色">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="rd-palette__dot"
          style={{ background: c.var }}
          aria-label={c.label}
          title={c.label}
          onClick={() => onPick(c.id)}
        />
      ))}
    </div>
  );
}
