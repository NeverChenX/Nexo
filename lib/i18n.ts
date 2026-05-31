'use client';

import { createContext, useContext } from 'react';
import zh from '@/lib/locales/zh';
import en from '@/lib/locales/en';

export type Locale = 'zh' | 'en';

const locales: Record<Locale, Record<string, string>> = { zh, en };

const STORAGE_KEY = 'nexo_locale';

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en') return 'en';
  return 'zh';
}

export function setStoredLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

/**
 * 翻译函数：根据 key 返回当前语言的字符串
 * 支持插值：t('key', { name: 'foo' }) => "hello foo"
 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = locales[locale] ?? locales.zh;
  let text = dict[key] ?? locales.zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

// React Context
interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => translate('zh', key),
});

export function useI18n() {
  return useContext(I18nContext);
}
