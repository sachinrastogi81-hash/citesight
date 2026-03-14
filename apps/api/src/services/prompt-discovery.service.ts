/**
 * Prompt Discovery Service
 *
 * 6-step pipeline (single LLM call per workspace):
 *   Step 1 — Generate 20 seed keywords for the category
 *   Step 2 — Simulate Google Autocomplete (10 queries per seed keyword)
 *   Step 3 — Simulate "People Also Ask" (5 questions per seed keyword)
 *   Step 4 — Convert autocomplete queries → AI prompts
 *   Step 5 — Deduplicate
 *   Step 6 — Group into 6–8 high-level topics
 *
 * All prompts are strictly brand-free:
 *   - LLM is instructed to exclude all brand/company/website names
 *   - Post-generation filter discards any prompt/topic containing a brand token
 *
 * Triggered fire-and-forget after POST /onboarding/config.
 * Also exposed via POST /research/discover for manual re-runs.
 *
 * Target output: 150+ unique prompts.
 */

import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResearchPromptType =
  | 'CATEGORY_RELATED'
  | 'COMPARISON'
  | 'HOW_TO'
  | 'PROBLEM_SOLVING'
  | 'INFORMATIONAL'
  | 'TRANSACTIONAL';

// Maps LLM-returned type strings → DB enum values
const TYPE_MAP: Record<string, ResearchPromptType> = {
  how_to: 'HOW_TO',
  comparison: 'COMPARISON',
  informational: 'INFORMATIONAL',
  discovery: 'CATEGORY_RELATED',
  problem_solving: 'PROBLEM_SOLVING',
  transactional: 'TRANSACTIONAL',
  // Also accept DB-native uppercase strings directly
  HOW_TO: 'HOW_TO',
  COMPARISON: 'COMPARISON',
  INFORMATIONAL: 'INFORMATIONAL',
  CATEGORY_RELATED: 'CATEGORY_RELATED',
  PROBLEM_SOLVING: 'PROBLEM_SOLVING',
  TRANSACTIONAL: 'TRANSACTIONAL',
};

// Pipeline output shape returned by the single LLM discovery call
interface PipelinePrompt {
  prompt: string;
  type: string;
}

interface PipelineTopic {
  topic: string;
  prompts: PipelinePrompt[];
}

interface PipelineOutput {
  topics?: PipelineTopic[];
  seed_keywords?: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOPIC_COLORS = [
  '#6366f1', '#7c3aed', '#2563eb', '#16a34a',
  '#d97706', '#dc2626', '#0891b2', '#db2777',
];

// Heuristic MVP volumes (will be replaced by real APIs later)
const VOLUME_BY_TYPE: Record<ResearchPromptType, number> = {
  COMPARISON: 70,
  HOW_TO: 60,
  TRANSACTIONAL: 55,
  INFORMATIONAL: 50,
  PROBLEM_SOLVING: 45,
  CATEGORY_RELATED: 40,
};

// ── Azure/OpenAI Helper ───────────────────────────────────────────────────────

async function callLLM(messages: Array<{ role: string; content: string }>, maxTokens = 3000): Promise<string> {
  const useAzure = !config.OPENAI_API_KEY && !!config.AZURE_OPENAI_API_KEY;

  if (!config.OPENAI_API_KEY && !config.AZURE_OPENAI_API_KEY) {
    throw new Error('No OpenAI/Azure API key configured for prompt discovery');
  }

  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  if (useAzure) {
    const endpoint = config.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
    const deployment = config.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4.1-mini';
    url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
    headers = { 'Content-Type': 'application/json', 'api-key': config.AZURE_OPENAI_API_KEY! };
    body = { messages, max_tokens: maxTokens, temperature: 0.7 };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.OPENAI_API_KEY!}` };
    body = { model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature: 0.7 };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

function parseJson<T>(raw: string): T {
  const clean = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean) as T;
}

// ── Brand Blacklist Helpers ───────────────────────────────────────────────────

function buildBrandTokens(brands: string[]): string[] {
  const tokens = new Set<string>();
  for (const b of brands) {
    const lower = b.toLowerCase().trim();

    // Always include the full lowercased name/domain (min 4 chars)
    if (lower.length >= 4) tokens.add(lower);

    // TLD-stripped domain: only add when result is ≥ 7 chars so that short
    // generic words like "resume" (from "resume.com") don't over-filter.
    const stripped = lower.replace(/\.[a-z]{2,}$/, '');
    if (stripped !== lower && stripped.length >= 7) tokens.add(stripped);

    // camelCase-split variant: e.g. "ResumeGenius" → "resume genius"
    const split = b.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim();
    if (split !== lower && split.length >= 4) tokens.add(split);
  }
  return [...tokens];
}

function containsBrand(text: string, brandTokens: string[]): boolean {
  const lower = text.toLowerCase();
  return brandTokens.some((token) => {
    // Multi-word tokens (e.g. "resume genius"): exact phrase match
    if (token.includes(' ')) return lower.includes(token);
    // Single-word tokens: whole-word match to avoid false positives
    return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower);
  });
}

/**
 * Strips generic industry suffixes to produce a clean primary product descriptor.
 * "Resume Builder Software" → "Resume Builder"
 */
function deriveProduct(category: string): string {
  const clean = category
    .replace(/\b(software|platform|app|application|tool|tools|service|services|system|solution|solutions)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || category;
}

// ── 6-Step Discovery Pipeline (single LLM call) ───────────────────────────────

async function runDiscoveryPipeline(
  category: string,
  product: string,
  country: string,
  brandBlacklistStr: string,
): Promise<PipelineOutput> {
  const systemPrompt =
    'You are an AI search research engine that simulates how users search on Google and ask questions to AI assistants.\n' +
    'Return only valid JSON — no markdown, no explanation, no extra text.';

  const userPrompt = `You are an AI search research engine that simulates how users search on Google and ask questions to AI assistants.

Your task is to generate realistic user queries and questions related to a product category.
You must simulate three types of search data:
  1. Google Autocomplete style queries
  2. People Also Ask style questions
  3. Related search queries

INPUTS
Category: ${category}
Country: ${country}
Primary product: ${product}

IMPORTANT RULES
1. Do NOT include brand names.
2. Do NOT include company names.
3. Do NOT include specific websites.
4. Queries must reflect what real users search for.
5. Prompts should focus on problems, tasks, or goals.
6. Avoid marketing language.
7. Queries should be natural and conversational.
8. All output must be generic category-level questions.
9. Exclude these specific brands: ${brandBlacklistStr}

STEP 1 — Generate Seed Keywords
Generate 20 short seed keywords for the category.
Rules: 2–4 words each, represent common search phrases, no brand names.

STEP 2 — Simulate Google Autocomplete
For each seed keyword generate 10 realistic autocomplete search queries.

STEP 3 — Simulate "People Also Ask"
Generate 5 natural questions per seed keyword.
Start with: How do I / What is the best / Where can I / Why is / What should I

STEP 4 — Convert Queries Into AI Prompts
Convert all autocomplete queries and People Also Ask questions into natural language questions users ask AI assistants like ChatGPT.
Classify each prompt as one of: how_to | comparison | informational | discovery | problem_solving | transactional

STEP 5 — Deduplicate
Remove duplicate prompts.

STEP 6 — Topic Classification
Group all prompts into 6–8 high-level topics related to the category.
Topics must be generic category themes, not brand-specific.

OUTPUT REQUIREMENTS
- Generate at least 150 unique prompts total across all topics.
- Prompts must be generic and must not contain any brand names.
- Output ONLY the final structured JSON (STEP 6 result).

Return this exact JSON structure:
{
  "seed_keywords": ["...", "..."],
  "topics": [
    {
      "topic": "Topic Name",
      "prompts": [
        { "prompt": "How do I...", "type": "how_to" }
      ]
    }
  ]
}`;

  const raw = await callLLM(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    12000,
  );

  return parseJson<PipelineOutput>(raw);
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export interface DiscoveryResult {
  topicsCreated: number;
  promptsCreated: number;
  skipped: boolean;
}

export async function runPromptDiscovery(
  workspaceId: string,
  force = false,
): Promise<DiscoveryResult> {
  if (!force) {
    const existingCount = await prisma.researchPrompt.count({ where: { workspaceId } });
    if (existingCount > 0) {
      return { topicsCreated: 0, promptsCreated: 0, skipped: true };
    }
  } else {
    await prisma.researchPrompt.deleteMany({ where: { workspaceId, createdBy: 'system' } });
    await prisma.researchTopic.deleteMany({ where: { workspaceId } });
  }

  // Pull workspace context
  const [brand, competitors] = await Promise.all([
    prisma.brand.findUnique({ where: { workspaceId } }),
    prisma.competitor.findMany({ where: { workspaceId } }),
  ]);

  const category = brand?.category ?? brand?.name ?? '';
  if (!category) {
    return { topicsCreated: 0, promptsCreated: 0, skipped: true };
  }

  const product = deriveProduct(category);
  const country = 'United States'; // no country stored in schema yet

  // Build brand blacklist from workspace brand + competitor names/domains
  const rawBrands = [
    brand?.name,
    ...competitors.map((c) => c.brandName),
    ...competitors.map((c) => c.domain),
  ].filter((b): b is string => !!b);

  const brandTokens = buildBrandTokens(rawBrands);
  const brandBlacklistStr = [...new Set(rawBrands)].join(', ') || 'none';

  // Run the full 6-step discovery pipeline in a single LLM call
  let pipeline: PipelineOutput;
  try {
    pipeline = await runDiscoveryPipeline(category, product, country, brandBlacklistStr);
  } catch (err) {
    console.error('[prompt-discovery] pipeline LLM call failed:', err);
    return { topicsCreated: 0, promptsCreated: 0, skipped: false };
  }

  const pipelineTopics = pipeline.topics ?? [];
  if (pipelineTopics.length === 0) {
    console.warn('[prompt-discovery] pipeline returned no topics');
    return { topicsCreated: 0, promptsCreated: 0, skipped: false };
  }

  // Filter brand leaks from topic names, cap at 8 topics
  const cleanTopics = pipelineTopics
    .filter(
      (t) =>
        typeof t.topic === 'string' &&
        t.topic.trim().length > 2 &&
        !containsBrand(t.topic, brandTokens),
    )
    .slice(0, 8);

  const seenKeys = new Set<string>();
  let totalPromptsCreated = 0;

  for (let i = 0; i < cleanTopics.length; i++) {
    const pipeTopic = cleanTopics[i];
    const topicName = pipeTopic.topic.trim();

    const topicRow = await prisma.researchTopic.create({
      data: { workspaceId, name: topicName, color: TOPIC_COLORS[i % TOPIC_COLORS.length] },
    });

    // Filter + dedup prompts for this topic
    const rawPrompts = Array.isArray(pipeTopic.prompts) ? pipeTopic.prompts : [];
    const deduped: Array<{ promptText: string; promptType: ResearchPromptType }> = [];

    for (const p of rawPrompts) {
      if (typeof p.prompt !== 'string') continue;
      const text = p.prompt.trim();
      if (text.length < 8) continue;
      if (containsBrand(text, brandTokens)) {
        console.debug(`[prompt-discovery] filtered brand-leaked prompt: "${text}"`);
        continue;
      }
      const key = normalizePrompt(text);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push({ promptText: text, promptType: TYPE_MAP[String(p.type)] ?? 'INFORMATIONAL' });
    }

    if (deduped.length === 0) continue;

    await prisma.researchPrompt.createMany({
      data: deduped.map((p) => ({
        workspaceId,
        promptText: p.promptText,
        topicId: topicRow.id,
        promptType: p.promptType,
        region: country,
        createdBy: 'system',
      })),
    });

    const stored = await prisma.researchPrompt.findMany({
      where: { workspaceId, topicId: topicRow.id, createdBy: 'system' },
      select: { id: true, promptType: true },
    });

    if (stored.length > 0) {
      await prisma.researchPromptMetric.createMany({
        data: stored.map((p) => ({
          promptId: p.id,
          promptVolume: VOLUME_BY_TYPE[p.promptType as ResearchPromptType] ?? 40,
          mentionRate: 0,
          citationRate: 0,
          aiSampleSize: 20,
        })),
      });
    }

    totalPromptsCreated += stored.length;
  }

  console.info(
    `[prompt-discovery] workspaceId=${workspaceId} topics=${cleanTopics.length} prompts=${totalPromptsCreated} brandTokens=${brandTokens.length}`,
  );

  return {
    topicsCreated: cleanTopics.length,
    promptsCreated: totalPromptsCreated,
    skipped: false,
  };
}
