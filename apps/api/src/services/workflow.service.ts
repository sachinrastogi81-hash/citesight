import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

// ── Step type definitions ─────────────────────────────────────────

export type StepType = 'AI' | 'FETCH' | 'TRANSFORM';
export type InputType = 'text' | 'url' | 'topic' | 'query';

export interface StepConfig {
  prompt?: string;          // AI step: handlebars-style template
  urlVariable?: string;     // FETCH step: which context variable holds the URL
  operation?: string;       // TRANSFORM step: e.g. "truncate", "uppercase"
  maxLength?: number;       // TRANSFORM: truncate length
}

export interface WorkflowStepInput {
  stepOrder: number;
  stepType: StepType;
  label: string;
  configJson: StepConfig;
}

// ── Built-in workflow templates ───────────────────────────────────

const BUILTIN_TEMPLATES: Array<{
  name: string;
  description: string;
  inputType: InputType;
  steps: WorkflowStepInput[];
}> = [
  {
    name: 'Page SEO Analyzer',
    description: 'Fetches a page, analyzes its SEO gaps, and generates optimization recommendations.',
    inputType: 'url',
    steps: [
      {
        stepOrder: 1,
        stepType: 'FETCH',
        label: 'Fetch page content',
        configJson: { urlVariable: 'input' },
      },
      {
        stepOrder: 2,
        stepType: 'AI',
        label: 'Analyze SEO gaps',
        configJson: {
          prompt:
            'You are an SEO expert. Analyze the following page content for SEO issues, keyword gaps, and missing opportunities.\n\nPage URL: {{input}}\n\nPage content:\n{{previous_output}}\n\nProvide a structured analysis with:\n1. Title tag assessment\n2. Meta description assessment\n3. Keyword gaps (3-5 missing keywords)\n4. Content quality issues\n5. Structural issues (headings, internal links)\n\nBe concise and actionable.',
        },
      },
      {
        stepOrder: 3,
        stepType: 'AI',
        label: 'Generate optimization suggestions',
        configJson: {
          prompt:
            'Based on this SEO analysis:\n\n{{previous_output}}\n\nGenerate specific, actionable content optimization recommendations for the page. For each recommendation, provide:\n- What to change\n- Why it matters\n- Example of improved text\n\nFocus on the top 5 highest-impact improvements.',
        },
      },
    ],
  },
  {
    name: 'Content Generator',
    description: 'Takes a topic and generates a structured article draft with outline and content.',
    inputType: 'topic',
    steps: [
      {
        stepOrder: 1,
        stepType: 'AI',
        label: 'Research and outline',
        configJson: {
          prompt:
            'You are a content strategist. Create a detailed content outline for an article about: {{input}}\n\nProvide:\n1. Suggested title (3 options)\n2. Target audience\n3. Key angle / unique POV\n4. H2 sections (5-7 sections with brief description of each)\n5. Key points to cover\n6. Suggested word count',
        },
      },
      {
        stepOrder: 2,
        stepType: 'AI',
        label: 'Generate article draft',
        configJson: {
          prompt:
            'Using this content outline:\n\n{{previous_output}}\n\nWrite a complete article draft about: {{input}}\n\nRequirements:\n- Use the best title option from the outline\n- Write in a clear, professional tone\n- Include all the H2 sections from the outline\n- Each section should be 2-3 paragraphs\n- Include a strong introduction and conclusion\n- Optimize naturally for the main topic keyword',
        },
      },
    ],
  },
  {
    name: 'Prompt Analyzer',
    description: 'Analyzes a search query to detect intent, estimate difficulty, and generate content ideas.',
    inputType: 'query',
    steps: [
      {
        stepOrder: 1,
        stepType: 'AI',
        label: 'Detect intent and difficulty',
        configJson: {
          prompt:
            'Analyze this search query as an SEO expert: "{{input}}"\n\nProvide:\n1. Search intent (informational / navigational / commercial / transactional)\n2. Estimated keyword difficulty (1-10 with reasoning)\n3. Target audience description\n4. Content format recommendation (article, comparison, how-to, etc.)\n5. Related queries (5 variations)\n6. Key entities to mention',
        },
      },
      {
        stepOrder: 2,
        stepType: 'AI',
        label: 'Generate content ideas',
        configJson: {
          prompt:
            'Based on this query analysis:\n\n{{previous_output}}\n\nFor the query "{{input}}", generate:\n1. Five content ideas that could rank for this query (title + brief description each)\n2. The single best content angle to pursue (with reasoning)\n3. Key sections any winning article must cover\n4. Three long-tail variations worth targeting alongside the main query',
        },
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────

async function callOpenAI(prompt: string): Promise<string> {
  const useAzure = !config.OPENAI_API_KEY && !!config.AZURE_OPENAI_API_KEY;
  if (!config.OPENAI_API_KEY && !config.AZURE_OPENAI_API_KEY) {
    throw new Error('No OpenAI API key configured (OPENAI_API_KEY or AZURE_OPENAI_API_KEY)');
  }

  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  if (useAzure) {
    const endpoint = config.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
    const deployment = config.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4.1-mini';
    url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
    headers = { 'Content-Type': 'application/json', 'api-key': config.AZURE_OPENAI_API_KEY! };
    body = {
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant for a content and SEO intelligence platform.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.OPENAI_API_KEY!}` };
    body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant for a content and SEO intelligence platform.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

function interpolate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '');
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CiteSight/1.0 (content analysis bot)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return `[Could not fetch page: HTTP ${res.status}]`;
    const html = await res.text();
    // Strip HTML tags to get readable text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
    return text || '[Page content could not be extracted]';
  } catch {
    return '[Could not fetch page: network error]';
  }
}

// ── CRUD ──────────────────────────────────────────────────────────

export async function listWorkflows(workspaceId: string) {
  return prisma.workflowTemplate.findMany({
    where: { workspaceId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getWorkflow(id: string, workspaceId: string) {
  const wf = await prisma.workflowTemplate.findFirst({
    where: { id, workspaceId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });
  return wf;
}

export async function createWorkflow(
  workspaceId: string,
  data: {
    name: string;
    description?: string;
    inputType?: InputType;
    steps: WorkflowStepInput[];
  },
) {
  return prisma.workflowTemplate.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description ?? null,
      inputType: data.inputType ?? 'text',
      definition: {},
      steps: {
        create: data.steps.map((s) => ({
          stepOrder: s.stepOrder,
          stepType: s.stepType,
          label: s.label,
          configJson: s.configJson as object,
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
}

export async function deleteWorkflow(id: string, workspaceId: string) {
  const wf = await prisma.workflowTemplate.findFirst({ where: { id, workspaceId } });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });
  await prisma.workflowTemplate.delete({ where: { id } });
}

// ── Built-in template seeding ─────────────────────────────────────

export async function getOrSeedBuiltinWorkflows(workspaceId: string) {
  const count = await prisma.workflowTemplate.count({ where: { workspaceId } });
  if (count > 0) {
    return prisma.workflowTemplate.findMany({
      where: { workspaceId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Seed the 3 built-ins for this workspace
  await Promise.all(
    BUILTIN_TEMPLATES.map((tpl) =>
      prisma.workflowTemplate.create({
        data: {
          workspaceId,
          name: tpl.name,
          description: tpl.description,
          inputType: tpl.inputType,
          definition: {},
          steps: {
            create: tpl.steps.map((s) => ({
              stepOrder: s.stepOrder,
              stepType: s.stepType,
              label: s.label,
              configJson: s.configJson as object,
            })),
          },
        },
      }),
    ),
  );

  return prisma.workflowTemplate.findMany({
    where: { workspaceId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
}

// ── Execution engine ──────────────────────────────────────────────

export async function runWorkflow(
  workflowId: string,
  workspaceId: string,
  inputData: Record<string, string>,
) {
  const wf = await prisma.workflowTemplate.findFirst({
    where: { id: workflowId, workspaceId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });

  // Create run record
  const run = await prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowTemplateId: workflowId,
      status: 'RUNNING',
      inputData,
    },
  });

  try {
    const context: Record<string, string> = {
      input: inputData.input ?? '',
      ...inputData,
    };
    const stepOutputs: Array<{ stepOrder: number; label: string; output: string }> = [];

    for (const step of wf.steps) {
      const cfg = step.configJson as StepConfig;
      let output = '';

      if (step.stepType === 'FETCH') {
        const urlKey = cfg.urlVariable ?? 'input';
        const url = context[urlKey] ?? '';
        output = await fetchPageText(url);
      } else if (step.stepType === 'AI') {
        const prompt = interpolate(cfg.prompt ?? '{{input}}', {
          ...context,
          previous_output: context.previous_output ?? '',
        });
        output = await callOpenAI(prompt);
      } else if (step.stepType === 'TRANSFORM') {
        const src = context.previous_output ?? context.input ?? '';
        if (cfg.operation === 'truncate') {
          output = src.slice(0, cfg.maxLength ?? 500);
        } else if (cfg.operation === 'uppercase') {
          output = src.toUpperCase();
        } else {
          output = src;
        }
      }

      context.previous_output = output;
      stepOutputs.push({ stepOrder: step.stepOrder, label: step.label, output });
    }

    const outputData = {
      finalOutput: context.previous_output ?? '',
      steps: stepOutputs,
    };

    const updated = await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', outputData },
    });
    return updated;
  } catch (err) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        outputData: { error: err instanceof Error ? err.message : String(err) },
      },
    });
    throw err;
  }
}

// ── Run history ───────────────────────────────────────────────────

export async function listWorkflowRuns(workflowId: string, workspaceId: string) {
  // Verify the workflow belongs to this workspace
  const wf = await prisma.workflowTemplate.findFirst({ where: { id: workflowId, workspaceId } });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });

  return prisma.workflowRun.findMany({
    where: { workflowTemplateId: workflowId, workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
