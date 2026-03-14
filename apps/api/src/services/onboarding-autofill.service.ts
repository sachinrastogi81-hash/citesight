import { config } from '../config.js';

type AutofillResult = {
  brandName: string;
  brandDescription: string;
  category: string;
  topics: string[];
  competitors: Array<{ domain: string; name?: string }>;
};

function sanitizeDomain(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch?.[1]) return codeFenceMatch[1].trim();

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return trimmed.slice(first, last + 1);

  throw new Error('No JSON object found in model response');
}

export async function autofillOnboardingFromDomain(input: { domain: string }): Promise<AutofillResult> {
  const domain = sanitizeDomain(input.domain);
  if (!domain) {
    throw new Error('Domain is required');
  }

  if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_API_KEY || !config.AZURE_OPENAI_DEPLOYMENT) {
    const err = new Error('AI autofill is not configured on the server');
    (err as Error & { status: number }).status = 503;
    throw err;
  }

  const endpoint = `${config.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${config.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview`;

  const prompt = [
    'You are helping pre-fill onboarding data for a B2B SaaS intelligence platform.',
    `Company domain: ${domain}`,
    'Return ONLY strict JSON with this shape:',
    '{',
    '  "brandName": string,',
    '  "brandDescription": string,',
    '  "category": string,',
    '  "topics": string[],',
    '  "competitors": [{"domain": string, "name": string}]',
    '}',
    'Rules:',
    '- topics: 5 to 8 concise topics',
    '- competitors: 3 to 6 likely competitor domains',
    '- no markdown, no explanations, JSON only'
  ].join('\n');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.AZURE_OPENAI_API_KEY
    },
    body: JSON.stringify({
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: 'system', content: 'You output valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const err = new Error(`AI autofill request failed (${res.status})`);
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  const payload = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    const err = new Error('AI autofill returned an empty response');
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  const parsed = JSON.parse(extractJson(raw)) as Partial<AutofillResult>;
  const cleaned: AutofillResult = {
    brandName: String(parsed.brandName || '').trim(),
    brandDescription: String(parsed.brandDescription || '').trim(),
    category: String(parsed.category || '').trim(),
    topics: (parsed.topics || [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 8),
    competitors: (parsed.competitors || [])
      .map((c) => ({
        domain: sanitizeDomain(String(c.domain || '')),
        name: c.name ? String(c.name).trim() : undefined
      }))
      .filter((c) => c.domain)
      .slice(0, 6)
  };

  if (!cleaned.brandName || !cleaned.brandDescription || !cleaned.category || cleaned.topics.length === 0) {
    const err = new Error('AI autofill returned incomplete data');
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  return cleaned;
}
