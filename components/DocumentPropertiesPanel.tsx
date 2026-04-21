'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface DocumentPropertiesPanelHandle {
  openAddMenu: () => void;
  toggleCollapsed: () => void;
}

interface Property {
  key: string;
  value: string;
}

interface DocumentPropertiesPanelProps {
  properties: Record<string, unknown>;
  onChange: (properties: Record<string, unknown>) => void;
  readOnly?: boolean;
  hideTrigger?: boolean;
}

const BUILTIN_KEYS = ['tags', 'icon', 'cover', 'fullWidth', 'permission'];

const SUGGESTED_KEYS = [
  { key: 'status', label: 'props.status' },
  { key: 'priority', label: 'props.priority' },
  { key: 'due', label: 'props.due' },
  { key: 'author', label: 'props.author' },
  { key: 'category', label: 'props.category' },
];

// 属性名规则：首字符字母/下划线，后续字母数字下划线/中划线；长度 ≤ 40
const VALID_KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]{0,39}$/;

export const DocumentPropertiesPanel = forwardRef<DocumentPropertiesPanelHandle, DocumentPropertiesPanelProps>(function DocumentPropertiesPanel({
  properties,
  onChange,
  readOnly = false,
  hideTrigger = false,
}, ref) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [addingKey, setAddingKey] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openAddMenu: () => { setCollapsed(false); setShowAddMenu(true); },
    toggleCollapsed: () => setCollapsed((c) => !c),
  }));

  // 点击外部关闭属性下拉菜单
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
        setAddError(null);
      }
    };
    // 延迟一帧注册，避免当前触发 show 的点击立即被捕获
    const id = window.requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler);
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [showAddMenu]);

  // 提取自定义属性（排除内置字段）
  const customProps: Property[] = Object.entries(properties)
    .filter(([k]) => !BUILTIN_KEYS.includes(k))
    .map(([key, value]) => ({ key, value: String(value ?? '') }));

  const handleUpdate = useCallback(
    (key: string, value: string) => {
      const updated = { ...properties, [key]: value };
      onChange(updated);
    },
    [properties, onChange]
  );

  const handleRemove = useCallback(
    (key: string) => {
      const updated = { ...properties };
      delete updated[key];
      onChange(updated);
    },
    [properties, onChange]
  );

  const handleAdd = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      if (!VALID_KEY_RE.test(trimmed)) {
        setAddError(t('props.invalidKey'));
        return;
      }
      if (trimmed in properties || BUILTIN_KEYS.includes(trimmed)) {
        setAddError(t('props.keyExists'));
        return;
      }
      setAddError(null);
      onChange({ ...properties, [trimmed]: '' });
      setAddingKey('');
      setShowAddMenu(false);
    },
    [properties, onChange, t]
  );

  if (customProps.length === 0 && readOnly) return null;

  return (
    <div
      style={{
        fontSize: '13px',
        color: 'var(--c-texSec)',
        paddingBottom: '8px',
        marginBottom: '4px',
      }}
    >
      {/* 折叠标题（当父组件接管 trigger 时隐藏） */}
      {!hideTrigger && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nx-hoverable flex items-center gap-1 px-1 py-0.5 rounded"
          style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {t('props.title')}
          {customProps.length > 0 && (
            <span style={{ color: 'var(--c-texDis)', marginLeft: '4px' }}>{customProps.length}</span>
          )}
        </button>
      )}

      {!collapsed && (
        <div style={{ paddingLeft: '4px', paddingTop: '4px' }}>
          {/* 属性列表 */}
          {customProps.map((prop) => (
            <div
              key={prop.key}
              className="flex items-center gap-2 group"
              style={{ minHeight: '28px', paddingLeft: '4px' }}
            >
              <span
                style={{
                  width: '100px',
                  flexShrink: 0,
                  fontSize: '12px',
                  color: 'var(--c-texTer)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {prop.key}
              </span>
              {readOnly ? (
                <span style={{ fontSize: '13px', color: 'var(--c-texPri)' }}>{prop.value}</span>
              ) : (
                <>
                  <input
                    type="text"
                    value={prop.value}
                    onChange={(e) => handleUpdate(prop.key, e.target.value)}
                    placeholder={t('props.valuePlaceholder')}
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      color: 'var(--c-texPri)',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      minWidth: 0,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = 'var(--c-bacTer)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  />
                  <button
                    onClick={() => handleRemove(prop.key)}
                    className="opacity-0 group-hover:opacity-100 nx-hoverable rounded p-0.5"
                    style={{ color: 'var(--c-icoTer)', flexShrink: 0 }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 添加属性 */}
          {!readOnly && (
            <div style={{ position: 'relative', marginTop: '2px' }}>
              {!hideTrigger && (
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="nx-hoverable flex items-center gap-1 px-1 py-0.5 rounded"
                  style={{ fontSize: '12px', color: 'var(--c-texDis)' }}
                >
                  <Plus className="h-3 w-3" />
                  {t('props.addProperty')}
                </button>
              )}

              {showAddMenu && (
                <div
                  ref={addMenuRef}
                  className="nx-fadein-fast"
                  style={{
                    position: hideTrigger ? 'relative' : 'absolute',
                    top: hideTrigger ? undefined : '100%',
                    left: hideTrigger ? undefined : 0,
                    marginTop: hideTrigger ? '4px' : undefined,
                    zIndex: 100,
                    background: 'var(--c-bacPri)',
                    border: '1px solid var(--c-borPri)',
                    borderRadius: '6px',
                    boxShadow: 'var(--c-shaOutMd)',
                    padding: '4px',
                    minWidth: '220px',
                    maxWidth: '280px',
                  }}
                >
                  {/* 自定义输入 */}
                  <div style={{ padding: '4px' }}>
                    <input
                      autoFocus
                      type="text"
                      value={addingKey}
                      onChange={(e) => { setAddingKey(e.target.value); if (addError) setAddError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd(addingKey);
                        if (e.key === 'Escape') { setShowAddMenu(false); setAddError(null); }
                      }}
                      placeholder={t('props.keyPlaceholder')}
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        color: 'var(--c-texPri)',
                        background: 'var(--c-bacTer)',
                        border: addError ? '1px solid var(--nx-red)' : 'none',
                        outline: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                    />
                    {addError && (
                      <p style={{ fontSize: '11px', color: 'var(--nx-red)', marginTop: '4px', paddingLeft: '2px' }}>{addError}</p>
                    )}
                  </div>
                  {/* 建议属性 */}
                  <div style={{ borderTop: '1px solid var(--c-borSec)', marginTop: '4px', paddingTop: '4px' }}>
                    {SUGGESTED_KEYS.filter((s) => !(s.key in properties)).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handleAdd(s.key)}
                        className="nx-hoverable w-full text-left px-2 py-1 rounded"
                        style={{ fontSize: '13px', color: 'var(--c-texSec)', display: 'block' }}
                      >
                        {t(s.label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
