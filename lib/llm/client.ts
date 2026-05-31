import { getLlmConfig, type LlmConfig, type ThinkingMode } from './config';

/**
 * 统一 LLM 调用入口。
 * 当前实现：火山方舟 OpenAI 兼容 /chat/completions。
 *
 * 所有应用内 AI 功能（写作、问答、解释、分类）都应走此函数。
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  prompt?: string;
  messages?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** 覆盖配置中的 thinking；传 '' 表示不发送此字段 */
  thinking?: ThinkingMode;
  /** 仅用于测试连通性时临时覆盖配置 */
  override?: Partial<LlmConfig>;
}

interface ChatResult {
  text: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  raw: unknown;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('LLM 尚未配置：请在设置 → AI 模型 中填入 API Key');
    this.name = 'LlmNotConfiguredError';
  }
}

function buildMessages(opts: ChatOptions): ChatMessage[] {
  if (opts.messages && opts.messages.length > 0) return opts.messages;
  if (opts.prompt) return [{ role: 'user', content: opts.prompt }];
  throw new Error('chat() 调用缺少 prompt 或 messages');
}

/**
 * 发送一次 chat 请求并返回文本。
 * 失败时抛 Error，由上层路由转成 502/500。
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const cfg = { ...(await getLlmConfig()), ...(opts.override ?? {}) };
  if (!cfg.apiKey) throw new LlmNotConfiguredError();

  const endpoint = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const messages = buildMessages(opts);

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? cfg.temperature,
    max_completion_tokens: opts.maxTokens ?? cfg.maxTokens,
  };
  const thinking = opts.thinking ?? cfg.thinking;
  if (thinking === 'disabled' || thinking === 'enabled' || thinking === 'auto') {
    body.thinking = { type: thinking };
  }

  const timeoutMs = opts.timeoutMs ?? cfg.timeoutMs;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 500);
    } catch {
      // ignore
    }
    throw new Error(`LLM HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: ChatResult['usage'];
  };
  const text = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('LLM 返回为空');
  return { text, usage: json.usage, raw: json };
}
