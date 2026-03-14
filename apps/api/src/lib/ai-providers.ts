import { config } from '../config.js';

export type AiEngine = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'GOOGLE_AIO';

// ── Options passed to any LLM call ────────────────────────────────

export interface LLMOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// ── Standardized response returned by runLLM() ────────────────────

export interface LLMResponse {
  text: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  citations: string[];
  latencyMs: number;
  engine: AiEngine;
}

// ── Legacy interface (backward compatible — existing callers unchanged) ──

export interface AiProviderResponse {
  engine: AiEngine;
  responseText: string;
  citations: string[];
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
}

export interface AiProvider {
  engine: AiEngine;
  query(prompt: string, opts?: LLMOptions): Promise<AiProviderResponse>;
}

// ── Per-million-token cost rates [inputUsd, outputUsd] ────────────

const COST_PER_M: Record<AiEngine, [number, number]> = {
  CHATGPT:    [0.15,  0.60],  // GPT-4o-mini / Azure GPT-4.1-mini
  PERPLEXITY: [1.00,  1.00],  // sonar
  GEMINI:     [0.075, 0.30],  // gemini-2.0-flash
  GOOGLE_AIO: [0.075, 0.30],  // gemini-2.0-flash + search grounding
};

// $35 / 1000 grounding requests billed by Google for search-grounded calls
const GROUNDING_COST_PER_REQUEST = 0.035;

function computeCost(engine: AiEngine, tokensIn: number, tokensOut: number): number {
  const [inRate, outRate] = COST_PER_M[engine];
  const tokenCost = (tokensIn * inRate + tokensOut * outRate) / 1_000_000;
  return engine === 'GOOGLE_AIO' ? tokenCost + GROUNDING_COST_PER_REQUEST : tokenCost;
}

function extractUrls(text: string): string[] {
  const urlRe = /https?:\/\/[^\s)<>",]+/g;
  const matches = text.match(urlRe) || [];
  return [...new Set(matches)];
}

// ── Provider implementations ──────────────────────────────────────

class ChatGptProvider implements AiProvider {
  engine: AiEngine = 'CHATGPT';

  async query(prompt: string, opts: LLMOptions = {}): Promise<AiProviderResponse> {
    const useAzure = !config.OPENAI_API_KEY && config.AZURE_OPENAI_API_KEY;
    if (!config.OPENAI_API_KEY && !config.AZURE_OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY or AZURE_OPENAI_API_KEY is not configured');
    }
    const start = Date.now();
    const systemContent = opts.systemPrompt ?? 'You are a helpful search engine assistant. Always cite your sources with URLs when possible.';

    let fetchUrl: string;
    let fetchHeaders: Record<string, string>;
    let body: Record<string, unknown>;

    if (useAzure) {
      const endpoint = config.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
      const deployment = config.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4.1-mini';
      fetchUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
      fetchHeaders = { 'Content-Type': 'application/json', 'api-key': config.AZURE_OPENAI_API_KEY! };
      body = {
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      };
    } else {
      fetchUrl = 'https://api.openai.com/v1/chat/completions';
      fetchHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.OPENAI_API_KEY!}` };
      body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      };
    }

    const res = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const text = data.choices[0]?.message?.content ?? '';
    return {
      engine: this.engine,
      responseText: text,
      citations: extractUrls(text),
      latencyMs: Date.now() - start,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
    };
  }
}

class PerplexityProvider implements AiProvider {
  engine: AiEngine = 'PERPLEXITY';

  async query(prompt: string, opts: LLMOptions = {}): Promise<AiProviderResponse> {
    if (!config.PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY is not configured');
    const start = Date.now();
    const systemContent = opts.systemPrompt ?? 'Be precise and concise. Always include source URLs.';
    const body: Record<string, unknown> = {
      model: 'sonar',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    };
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.PERPLEXITY_API_KEY}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Perplexity API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      citations?: string[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const text = data.choices[0]?.message?.content ?? '';
    const citations = data.citations ?? extractUrls(text);
    return {
      engine: this.engine,
      responseText: text,
      citations,
      latencyMs: Date.now() - start,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
    };
  }
}

class GeminiProvider implements AiProvider {
  engine: AiEngine = 'GEMINI';

  async query(prompt: string, opts: LLMOptions = {}): Promise<AiProviderResponse> {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    const start = Date.now();
    const contents: unknown[] = [];
    if (opts.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: opts.systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1024,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const text = data.candidates[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return {
      engine: this.engine,
      responseText: text,
      citations: extractUrls(text),
      latencyMs: Date.now() - start,
      tokensInput: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOutput: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

class GoogleAioProvider implements AiProvider {
  engine: AiEngine = 'GOOGLE_AIO';

  // Uses Gemini with Google Search grounding to approximate AI Overviews
  async query(prompt: string, opts: LLMOptions = {}): Promise<AiProviderResponse> {
    if (!config.GOOGLE_AIO_API_KEY) throw new Error('GOOGLE_AIO_API_KEY is not configured');
    const start = Date.now();
    const contents: unknown[] = [];
    if (opts.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: opts.systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GOOGLE_AIO_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1024,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        },
      }),
    });
    if (!res.ok) throw new Error(`Google AIO API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        groundingMetadata?: { groundingChunks?: Array<{ web?: { uri: string } }> };
      }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const text = data.candidates[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    const groundingCitations = (data.candidates[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => Boolean(u));
    const citations = groundingCitations.length > 0 ? groundingCitations : extractUrls(text);
    return {
      engine: this.engine,
      responseText: text,
      citations,
      latencyMs: Date.now() - start,
      tokensInput: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOutput: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

// ── Provider registry ─────────────────────────────────────────────

const providers: Record<AiEngine, AiProvider> = {
  CHATGPT: new ChatGptProvider(),
  PERPLEXITY: new PerplexityProvider(),
  GEMINI: new GeminiProvider(),
  GOOGLE_AIO: new GoogleAioProvider(),
};

/** Returns the raw provider instance. Existing callers continue to work unchanged. */
export function getProvider(engine: AiEngine): AiProvider {
  return providers[engine];
}

// ── Unified entry point ───────────────────────────────────────────

/**
 * Single entry point for all LLM calls.
 * Handles provider dispatch, token tracking and cost calculation.
 *
 * @example
 * const result = await runLLM({
 *   engine: 'CHATGPT',
 *   prompt: 'Summarize SEO best practices',
 *   systemPrompt: 'You are an SEO expert.',
 *   temperature: 0.7,
 *   maxTokens: 512,
 * });
 * // result.text, result.tokensInput, result.tokensOutput, result.costUsd, result.citations
 */
export async function runLLM(params: {
  engine: AiEngine;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const { engine, prompt, systemPrompt, temperature, maxTokens } = params;
  const raw = await getProvider(engine).query(prompt, { systemPrompt, temperature, maxTokens });
  return {
    text: raw.responseText,
    tokensInput: raw.tokensInput,
    tokensOutput: raw.tokensOutput,
    costUsd: computeCost(engine, raw.tokensInput, raw.tokensOutput),
    citations: raw.citations,
    latencyMs: raw.latencyMs,
    engine,
  };
}
