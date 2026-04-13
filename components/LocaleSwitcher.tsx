'use client';

import { useI18n, type Locale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="nx-hoverable flex items-center gap-1.5 px-2 py-1 rounded text-xs"
      style={{ color: 'var(--c-texTer)' }}
      title={t('locale.switch')}
    >
      <span style={{ fontSize: '12px' }}>
        {locale === 'zh' ? 'EN' : '中'}
      </span>
    </button>
  );
}
