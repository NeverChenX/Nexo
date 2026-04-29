'use client';

import { useEffect, useState } from 'react';
import { Settings, X, Sparkles, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Z } from '@/lib/z-index';
import { getAiClassifyHintEnabled, setAiClassifyHintEnabled } from '@/lib/preferences';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThinkingMode = 'disabled' | 'enabled' | 'auto' | '';

interface LlmConfigPublic {
  provider: 'volcano';
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  thinking: ThinkingMode;
  apiKeyConfigured: boolean;
  apiKeySource: 'env' | 'file' | 'none';
}

type TestStatus =
  | { type: 'idle' }
  | { type: 'pending' }
  | { type: 'success'; reply: string; latencyMs: number }
  | { type: 'error'; message: string };

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const [tab] = useState<'llm'>('llm');

  const [config, setConfig] = useState<LlmConfigPublic | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 表单字段（用户编辑中）
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [timeoutMs, setTimeoutMs] = useState('60000');
  const [thinking, setThinking] = useState<ThinkingMode>('disabled');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>({ type: 'idle' });

  // 界面偏好（设备级，localStorage）
  const [aiClassifyHintOn, setAiClassifyHintOn] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setAiClassifyHintOn(getAiClassifyHintEnabled());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/settings/llm');
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || '加载失败');
        if (cancelled) return;
        const d: LlmConfigPublic = json.data;
        setConfig(d);
        setBaseUrl(d.baseUrl);
        setModel(d.model);
        setApiKey(d.apiKey);
        setTemperature(String(d.temperature));
        setMaxTokens(String(d.maxTokens));
        setTimeoutMs(String(d.timeoutMs));
        setThinking(d.thinking);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Esc 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, unknown> = {
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        temperature: Number(temperature),
        maxTokens: Number(maxTokens),
        timeoutMs: Number(timeoutMs),
        thinking,
        apiKey: apiKey.trim(),
      };
      const res = await fetch('/api/settings/llm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || '保存失败');
      const d: LlmConfigPublic = json.data;
      setConfig(d);
      setApiKey(d.apiKey);
      setSaveMsg(t('settings.saved'));
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg((err instanceof Error ? err.message : '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestStatus({ type: 'pending' });
    try {
      const body: Record<string, unknown> = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (baseUrl.trim()) body.baseUrl = baseUrl.trim();
      if (model.trim()) body.model = model.trim();
      body.thinking = thinking || 'disabled';
      const res = await fetch('/api/settings/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setTestStatus({ type: 'error', message: json.error || '测试失败' });
      } else {
        setTestStatus({ type: 'success', reply: json.data.reply, latencyMs: json.data.latencyMs });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: err instanceof Error ? err.message : '测试失败' });
    }
  };

  const apiKeySourceHint =
    config?.apiKeySource === 'env'
      ? t('settings.llm.apiKey.envHint')
      : config?.apiKeySource === 'file'
      ? t('settings.llm.apiKey.fileHint')
      : undefined;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z.MODAL, background: 'rgba(0,0,0,0.15)' }}
      onClick={onClose}
    >
      <div
        className="w-[540px] max-h-[85vh] overflow-hidden flex flex-col nx-fadein-fast"
        style={{
          background: 'var(--c-bacPri)',
          borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--c-borSec)' }}
        >
          <div
            className="flex items-center gap-2 text-sm"
            style={{ fontWeight: 500, color: 'var(--c-texPri)' }}
          >
            <Settings className="h-4 w-4" style={{ color: 'var(--c-icoSec)' }} />
            {t('settings.title')}
          </div>
          <button
            onClick={onClose}
            className="nx-hoverable rounded p-0.5"
            style={{ color: 'var(--c-icoSec)' }}
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab 区（目前仅 LLM 一个 Tab，留出未来扩展空间） */}
        <div className="flex items-center gap-1 px-4 pt-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <button
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t"
            style={{
              color: tab === 'llm' ? 'var(--c-texPri)' : 'var(--c-texTer)',
              borderBottom: tab === 'llm' ? '2px solid var(--nx-blue)' : '2px solid transparent',
              fontWeight: tab === 'llm' ? 500 : 400,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('settings.tab.llm')}
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texTer)' }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.loading')}
            </div>
          )}
          {loadError && !loading && (
            <div
              className="px-3 py-2 rounded text-sm flex items-start gap-1.5"
              style={{
                background: 'rgba(224,62,62,0.06)',
                border: '1px solid rgba(224,62,62,0.2)',
                color: 'var(--nx-red)',
              }}
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ marginTop: 2 }} />
              <span style={{ wordBreak: 'break-word' }}>{loadError}</span>
            </div>
          )}

          {!loading && !loadError && config && (
            <>
              <div
                className="px-3 py-2 rounded text-xs"
                style={{
                  background: 'var(--c-bacTer)',
                  color: 'var(--c-texTer)',
                  border: '1px solid var(--c-borSec)',
                }}
              >
                {t('settings.llm.desc')}
              </div>

              <Field label={t('settings.llm.provider')}>
                <div className="text-sm px-3 py-2 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texSec)' }}>
                  火山方舟（Volcano Ark / Doubao）
                </div>
              </Field>

              <Field label={t('settings.llm.baseUrl')}>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                  style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                />
              </Field>

              <Field label={t('settings.llm.apiKey')} hint={apiKeySourceHint}>
                <div className="flex items-center gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-md nx-form-input"
                    style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none', fontFamily: 'monospace' }}
                    placeholder="ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="nx-hoverable rounded p-1.5"
                    style={{ color: 'var(--c-icoSec)' }}
                    aria-label={showKey ? '隐藏' : '显示'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </Field>

              <Field label={t('settings.llm.model')}>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                  style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  placeholder="doubao-seed-1-6-lite-251015"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.llm.temperature')}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                  style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  />
                </Field>
                <Field label={t('settings.llm.maxTokens')}>
                  <input
                    type="number"
                    min="64"
                    max="65535"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                  style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  />
                </Field>
                <Field label={t('settings.llm.timeoutMs')}>
                  <input
                    type="number"
                    min="1000"
                    max="600000"
                    step="1000"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                  style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  />
                </Field>
                <Field label={t('settings.llm.thinking')} hint={t('settings.llm.thinking.hint')}>
                  <select
                    value={thinking}
                    onChange={(e) => setThinking(e.target.value as ThinkingMode)}
                    className="w-full px-3 py-2 text-sm rounded-md nx-form-input"
                    style={{ border: '1px solid var(--c-borPri)', background: 'var(--c-bacPri)', color: 'var(--c-texPri)', outline: 'none' }}
                  >
                    <option value="disabled">disabled（直答，快）</option>
                    <option value="enabled">enabled（深度思考）</option>
                    <option value="auto">auto（自动）</option>
                    <option value="">不发送</option>
                  </select>
                </Field>
              </div>

              {/* 测试结果 */}
              {testStatus.type === 'pending' && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texTer)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('settings.llm.testing')}
                </div>
              )}
              {testStatus.type === 'success' && (
                <div
                  className="px-3 py-2 rounded text-sm flex items-start gap-1.5"
                  style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.25)', color: '#1e7e44' }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{t('settings.llm.testOk', { ms: testStatus.latencyMs })}</div>
                    <div style={{ color: 'var(--c-texTer)', marginTop: 2, fontSize: 12 }}>
                      {t('settings.llm.reply')}：{testStatus.reply}
                    </div>
                  </div>
                </div>
              )}
              {testStatus.type === 'error' && (
                <div
                  className="px-3 py-2 rounded text-sm flex items-start gap-1.5"
                  style={{ background: 'rgba(224,62,62,0.06)', border: '1px solid rgba(224,62,62,0.2)', color: 'var(--nx-red)' }}
                >
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ marginTop: 2 }} />
                  <span style={{ wordBreak: 'break-word' }}>{testStatus.message}</span>
                </div>
              )}

              {saveMsg && (
                <div className="text-sm" style={{ color: 'var(--c-texTer)' }}>
                  {saveMsg}
                </div>
              )}

              {/* 界面偏好（设备级，localStorage） */}
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--c-borSec)' }}>
                <div className="text-xs mb-2" style={{ color: 'var(--c-texSec)', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {t('settings.ui.section')}
                </div>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aiClassifyHintOn}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAiClassifyHintOn(next);
                      setAiClassifyHintEnabled(next);
                    }}
                    style={{ marginTop: 2 }}
                  />
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                      {t('settings.ui.aiClassifyHint')}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--c-texTer)' }}>
                      {t('settings.ui.aiClassifyHint.desc')}
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--c-borSec)' }}>
          <button
            onClick={handleTest}
            disabled={loading || testStatus.type === 'pending'}
            className="nx-hoverable px-3 py-1.5 text-sm rounded-md disabled:opacity-40"
            style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
          >
            {t('settings.llm.test')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="nx-hoverable px-3 py-1.5 text-sm rounded-md"
              style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
            >
              {t('common.close')}
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="px-3 py-1.5 text-sm rounded-md text-white disabled:opacity-40"
              style={{ background: 'var(--nx-blue)' }}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs mb-1.5" style={{ color: 'var(--c-texSec)', fontWeight: 500 }}>
        {label}
      </div>
      {children}
      {hint && (
        <div className="text-xs mt-1" style={{ color: 'var(--c-texTer)' }}>
          {hint}
        </div>
      )}
    </label>
  );
}
