import { config } from '../config.js';

export type AiEngine = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'GOOGLE_AIO';

export interface AiProviderResponse {
  engine: AiEngine;
  responseText: string;
  citations: string[];
  latencyMs: number;
}

export interface AiProvider {
  engine: AiEngine;
  query(prompt: string): Promise<AiProviderResponse>;
}

function extractUrls(text: string): string[] {
  const urlRe = /https?:\/\/[^\s)<>",]+/g;
  const matches = text.match(urlRe) || [];
  return [...new Set(matches)];
}

class ChatGptProvider implements AiProvider {
  engine: AiEngine = 'CHATGPT';

  async query(prompt: string): Promise<AiProviderResponse> {
    const useAzure = !config.OPENAI_API_KEY && config.AZURE_OPENAI_API_KEY;
    if (!config.OPENAI_API_KEY && !config.AZURE_OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY or AZURE_OPENAI_API_KEY is not configured');
    }
    const start = Date.now();

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
          { role: 'system', content: 'You are a helpful search engine assistant. Always cite your sources with URLs when possible.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      };
    } else {
      fetchUrl = 'https://api.openai.com/v1/chat/completions';
      fetchHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.OPENAI_API_KEY!}` };
      body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful search engine assistant. Always cite your sources with URLs when possible.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      };
    }

    const res = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const text = data.choices[0]?.message?.content ?? '';
    return { engine: this.engine, responseText: text, citations: extractUrls(text), latencyMs: Date.now() - start };
  }
}

class PerplexityProvider implements AiProvider {
  engine: AiEngine = 'PERPLEXITY';

  async query(prompt: string): Promise<AiProviderResponse> {
    if (!config.PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY is not configured');
    const start = Date.now();
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Be precise and concise. Always include source URLs.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Perplexity API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      citations?: string[];
    };
    const text = data.choices[0]?.message?.content ?? '';
    const citations = data.citations ?? extractUrls(text);
    return { engine: this.engine, responseText: text, citations, latencyMs: Date.now() - start };
  }
}

class GeminiProvider implements AiProvider {
  engine: AiEngine = 'GEMINI';

  async query(prompt: string): Promise<AiProviderResponse> {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const text = data.candidates[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return { engine: this.engine, responseText: text, citations: extractUrls(text), latencyMs: Date.now() - start };
  }
}

class GoogleAioProvider implements AiProvider {
  engine: AiEngine = 'GOOGLE_AIO';

  // Uses the Gemini API with grounding via Google Search to approximate AI Overviews
  async query(prompt: string): Promise<AiProviderResponse> {
    if (!config.GOOGLE_AIO_API_KEY) throw new Error('GOOGLE_AIO_API_KEY is not configured');
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GOOGLE_AIO_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Google AIO API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        groundingMetadata?: { webSearchQueries?: string[]; groundingChunks?: Array<{ web?: { uri: string } }> };
      }>;
    };
    const text = data.candidates[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    const groundingCitations = (data.candidates[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => Boolean(u));
    const citations = groundingCitations.length > 0 ? groundingCitations : extractUrls(text);
    return { engine: this.engine, responseText: text, citations, latencyMs: Date.now() - start };
  }
}

const providers: Record<AiEngine, AiProvider> = {
  CHATGPT: new ChatGptProvider(),
  PERPLEXITY: new PerplexityProvider(),
  GEMINI: new GeminiProvider(),
  GOOGLE_AIO: new GoogleAioProvider(),
};

export function getProvider(engine: AiEngine): AiProvider {
  return providers[engine];
}
