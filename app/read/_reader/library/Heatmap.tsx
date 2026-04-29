'use client';

interface Props {
  dailyMinutes: Record<string, number>;
}

const CELL = 11;
const GAP = 2;
const WEEKS = 53;

function dateMinusDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - days);
  return r;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function color(mins: number): string {
  if (mins <= 0) return '#1c1c1e';
  if (mins < 5) return '#2a2f4a';
  if (mins < 15) return '#3b4a7a';
  if (mins < 30) return '#5470b8';
  if (mins < 60) return '#7aa2f7';
  return '#aac1ff';
}

export function Heatmap({ dailyMinutes }: Props) {
  const today = new Date();
  // Build 53 weeks × 7 days from oldest to newest
  const days: { date: Date; key: string; mins: number }[] = [];
  const totalDays = WEEKS * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = dateMinusDays(today, i);
    const key = ymd(d);
    days.push({ date: d, key, mins: dailyMinutes[key] || 0 });
  }
  const width = WEEKS * (CELL + GAP);
  const height = 7 * (CELL + GAP);
  const totalMins = days.reduce((acc, d) => acc + d.mins, 0);
  const activeDays = days.filter((d) => d.mins > 0).length;
  const streak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].mins > 0) s++;
      else break;
    }
    return s;
  })();

  return (
    <div className="rd-heatmap">
      <div className="rd-heatmap__summary">
        <div>
          <b>{Math.round(totalMins)}</b> 分钟 · 365 天
        </div>
        <div>
          <b>{activeDays}</b> 个活跃日
        </div>
        <div>
          <b>{streak}</b> 天连续
        </div>
      </div>
      <svg
        width={width}
        height={height}
        className="rd-heatmap__svg"
        role="img"
        aria-label="阅读热力图"
      >
        {days.map((d, i) => {
          const week = Math.floor(i / 7);
          const day = i % 7;
          return (
            <rect
              key={d.key}
              x={week * (CELL + GAP)}
              y={day * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={color(d.mins)}
            >
              <title>{`${d.key} · ${Math.round(d.mins)} 分钟`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="rd-heatmap__legend">
        <span>少</span>
        <span style={{ background: '#1c1c1e' }} />
        <span style={{ background: '#2a2f4a' }} />
        <span style={{ background: '#3b4a7a' }} />
        <span style={{ background: '#5470b8' }} />
        <span style={{ background: '#7aa2f7' }} />
        <span style={{ background: '#aac1ff' }} />
        <span>多</span>
      </div>
    </div>
  );
}
