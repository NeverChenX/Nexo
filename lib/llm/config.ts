import fs from 'fs/promises';
import path from 'path';

/**
 * LLM 配置（火山方舟 / OpenAI 兼容的 chat/completions）
 *
 * 读取优先级：
 *   1. 环境变量（ARK_*）
 *   2. wiki-data/_config/llm.json
 *   3. 代码内默认值
 */

export const LLM_CONFIG_PATH = path.join(process.cwd(), 'wiki-data', '_config', 'llm.json');

export type ThinkingMode = 'disabled' | 'enabled' | 'auto' | '';

export interface LlmConfig {
  provider: 'volcano';
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  /** 火山 seed-1-6+ 系列的"深度思考"开关：disabled=直答（快、便宜），enabled=思考，auto=自动 */
  thinking: ThinkingMode;
}

const DEFAULT_CONFIG: LlmConfig = {
  provider: 'volcano',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: '',
  model: 'doubao-seed-1-6-flash-250828',
  temperature: 0.7,
  maxTokens: 4096,
  timeoutMs: 60_000,
  thinking: 'disabled',
};

interface StoredConfig extends Partial<LlmConfig> {}

async function readStoredConfig(): Promise<StoredConfig> {
  try {
    const raw = await fs.readFile(LLM_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as StoredConfig;
  } catch {
    // 文件不存在或损坏 → 忽略
  }
  return {};
}

/**
 * 获取当前生效的 LLM 配置（已合并 env + 文件 + 默认值）。
 * 服务端使用；包含明文 apiKey。
 */
export async function getLlmConfig(): Promise<LlmConfig> {
  const stored = await readStoredConfig();
  const envKey = process.env.ARK_API_KEY?.trim();
  const envBase = process.env.ARK_BASE_URL?.trim();
  const envModel = process.env.ARK_MODEL?.trim();

  const merged: LlmConfig = {
    provider: 'volcano',
    baseUrl: envBase || stored.baseUrl || DEFAULT_CONFIG.baseUrl,
    apiKey: envKey || stored.apiKey || DEFAULT_CONFIG.apiKey,
    model: envModel || stored.model || DEFAULT_CONFIG.model,
    temperature:
      typeof stored.temperature === 'number' ? stored.temperature : DEFAULT_CONFIG.temperature,
    maxTokens: typeof stored.maxTokens === 'number' ? stored.maxTokens : DEFAULT_CONFIG.maxTokens,
    timeoutMs: typeof stored.timeoutMs === 'number' ? stored.timeoutMs : DEFAULT_CONFIG.timeoutMs,
    thinking:
      stored.thinking === 'disabled' ||
      stored.thinking === 'enabled' ||
      stored.thinking === 'auto' ||
      stored.thinking === ''
        ? stored.thinking
        : DEFAULT_CONFIG.thinking,
  };
  return merged;
}

/**
 * 返回给前端的配置。
 *
 * C2 hardening: previously echoed the full apiKey in plaintext, so any
 * caller that could reach `GET /api/settings/llm` (and middleware didn't
 * gate API routes — see C1/C3) could exfiltrate the ARK_API_KEY. Now we
 * never send the secret over the wire; only a masked tail (last 4 chars)
 * is returned so the UI can show "key set, ends in ...abcd".
 */
export interface LlmConfigPublic extends Omit<LlmConfig, 'apiKey'> {
  /** 明文从不返回。空字符串占位以兼容旧 UI（避免 undefined 渲染异常）。 */
  apiKey: '';
  /** 形如 "sk-***abcd" 的脱敏尾段；未配置时为空 */
  apiKeyMasked: string;
  apiKeySource: 'env' | 'file' | 'none';
  apiKeyConfigured: boolean;
}

function maskApiKey(raw: string): string {
  if (!raw) return '';
  if (raw.length <= 4) return '***';
  return `***${raw.slice(-4)}`;
}

export async function getLlmConfigPublic(): Promise<LlmConfigPublic> {
  const cfg = await getLlmConfig();
  const envKey = process.env.ARK_API_KEY?.trim();
  const source: 'env' | 'file' | 'none' = envKey ? 'env' : cfg.apiKey ? 'file' : 'none';
  // Strip apiKey from spread; UI must only ever see the mask.
  const { apiKey: _apiKey, ...rest } = cfg;
  return {
    ...rest,
    apiKey: '',
    apiKeyMasked: maskApiKey(cfg.apiKey),
    apiKeySource: source,
    apiKeyConfigured: Boolean(cfg.apiKey),
  };
}

/**
 * 更新存储的配置（仅写入 wiki-data/_config/llm.json，不影响 env）。
 * - apiKey 传空字符串 → 保留原值；传 null → 清空。
 */
export async function updateLlmConfig(
  patch: Partial<LlmConfig> & { apiKey?: string | null }
): Promise<void> {
  const stored = await readStoredConfig();
  const next: StoredConfig = { ...stored };

  if (typeof patch.baseUrl === 'string') next.baseUrl = patch.baseUrl.trim();
  if (typeof patch.model === 'string') next.model = patch.model.trim();
  if (typeof patch.temperature === 'number' && Number.isFinite(patch.temperature)) {
    next.temperature = Math.max(0, Math.min(2, patch.temperature));
  }
  if (typeof patch.maxTokens === 'number' && Number.isFinite(patch.maxTokens)) {
    next.maxTokens = Math.max(64, Math.min(65535, Math.round(patch.maxTokens)));
  }
  if (typeof patch.timeoutMs === 'number' && Number.isFinite(patch.timeoutMs)) {
    next.timeoutMs = Math.max(1000, Math.min(600_000, Math.round(patch.timeoutMs)));
  }
  if (
    patch.thinking === 'disabled' ||
    patch.thinking === 'enabled' ||
    patch.thinking === 'auto' ||
    patch.thinking === ''
  ) {
    next.thinking = patch.thinking;
  }
  if (patch.apiKey === null) {
    delete next.apiKey;
  } else if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
    next.apiKey = patch.apiKey.trim();
  }

  await fs.mkdir(path.dirname(LLM_CONFIG_PATH), { recursive: true });
  await fs.writeFile(LLM_CONFIG_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  try {
    await fs.chmod(LLM_CONFIG_PATH, 0o600);
  } catch {
    // 非类 Unix 或无权限时忽略
  }
}
