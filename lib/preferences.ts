// 设备级 UI 偏好（localStorage 持久化），不进后端。
// 修改后 dispatch 'nexo:pref-changed' 自定义事件，监听方实时响应。

const PREF_EVENT = 'nexo:pref-changed';
const KEY_AI_CLASSIFY_HINT = 'nexo_pref_ai_classify_hint';

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === 'true';
  } catch {
    return defaultValue;
  }
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(value));
    window.dispatchEvent(new CustomEvent(PREF_EVENT, { detail: { key, value } }));
  } catch {
    /* localStorage 不可用时静默 */
  }
}

export function getAiClassifyHintEnabled(): boolean {
  return readBool(KEY_AI_CLASSIFY_HINT, false);
}

export function setAiClassifyHintEnabled(enabled: boolean): void {
  writeBool(KEY_AI_CLASSIFY_HINT, enabled);
}

export function onPreferencesChanged(handler: (key: string, value: unknown) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const ce = e as CustomEvent<{ key: string; value: unknown }>;
    if (ce.detail) handler(ce.detail.key, ce.detail.value);
  };
  window.addEventListener(PREF_EVENT, listener);
  return () => window.removeEventListener(PREF_EVENT, listener);
}

export const PREF_KEYS = {
  AI_CLASSIFY_HINT: KEY_AI_CLASSIFY_HINT,
} as const;
