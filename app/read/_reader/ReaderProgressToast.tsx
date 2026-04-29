'use client';

interface Props {
  progress: number;
  visible: boolean;
  onDismiss: () => void;
  onResumeToTop: () => void;
}

export function ReaderProgressToast({ progress, visible, onDismiss, onResumeToTop }: Props) {
  if (!visible) return null;
  const pct = Math.round(progress * 100);
  return (
    <div className="rd-resume-toast" role="status" aria-live="polite">
      <span className="rd-resume-toast__text">↩ 上次读到 {pct}%</span>
      <button
        type="button"
        className="rd-resume-toast__action"
        onClick={onResumeToTop}
      >
        从头开始
      </button>
      <button
        type="button"
        className="rd-resume-toast__close"
        aria-label="dismiss"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
