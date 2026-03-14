const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

export async function pingApi() {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API health failed (${res.status})`);
  }
  return res.json();
}

/* ── Auth ────────────────────────────────────────── */

interface AuthResponse {
  user: { id: string; email: string; name: string };
  tokens: { accessToken: string; refreshToken: string };
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Register failed (${res.status})`);
  }
  return res.json();
}

export async function login(email: string, password: string, rememberMe?: boolean): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Login failed (${res.status})`);
  }
  return res.json();
}

export class AuthError extends Error {}

export async function refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new AuthError('Session expired');
  }
  if (!res.ok) {
    throw new Error(`Refresh failed (${res.status})`);
  }
  return res.json();
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/* ── Workspaces ─────────────────────────────────── */

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export async function listWorkspaces(token: string): Promise<WorkspaceSummary[]> {
  const res = await fetch(`${API_BASE}/workspaces`, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`Failed to load workspaces (${res.status})`);
  }
  return res.json();
}

export async function createWorkspace(token: string, name: string, slug: string): Promise<WorkspaceSummary> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, slug })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Create workspace failed (${res.status})`);
  }
  return res.json();
}

export async function updateWorkspace(token: string, workspaceId: string, payload: {
  name?: string;
  slug?: string;
}): Promise<WorkspaceSummary> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Update workspace failed (${res.status})`);
  }
  return res.json();
}

export async function deleteWorkspace(token: string, workspaceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Delete workspace failed (${res.status})`);
  }
}

/* ── Onboarding ─────────────────────────────────── */

export interface OnboardingConfig {
  onboardingComplete: boolean;
  brand: { name: string; domain?: string | null; description?: string | null; category?: string | null } | null;
  topics: Array<{ id: string; name: string }>;
  competitors: Array<{ id: string; domain: string; name?: string | null }>;
  engines: string[];
}

export async function getOnboardingConfig(token: string, workspaceId: string): Promise<OnboardingConfig> {
  const res = await fetch(`${API_BASE}/onboarding/config?workspaceId=${workspaceId}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) {
    throw new Error(`Failed to load onboarding (${res.status})`);
  }
  return res.json();
}

export async function saveOnboardingConfig(token: string, payload: {
  workspaceId: string;
  brandName: string;
  brandDomain?: string;
  brandDescription?: string;
  category?: string;
  topics: string[];
  competitors: Array<{ domain: string; name?: string }>;
  engines: string[];
}): Promise<{ ok: boolean; onboardingComplete: boolean }> {
  const res = await fetch(`${API_BASE}/onboarding/config`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Onboarding failed (${res.status})`);
  }
  return res.json();
}

export async function autofillOnboarding(token: string, payload: {
  workspaceId: string;
  domain: string;
}): Promise<{
  brandName: string;
  brandDescription: string;
  category: string;
  topics: string[];
  competitors: Array<{ domain: string; name?: string }>;
}> {
  const res = await fetch(`${API_BASE}/onboarding/autofill`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Autofill failed (${res.status})`);
  }
  return res.json();
}

/* ── Module 3: Prompt Library & Queries ─────────── */

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  isSystem: boolean;
  workspaceId: string | null;
}

export interface AeoQuery {
  id: string;
  workspaceId: string;
  topicId: string | null;
  query: string;
  status: string;
  createdAt: string;
  topic: { id: string; topicName: string } | null;
}

export async function listPrompts(token: string, workspaceId: string): Promise<PromptTemplate[]> {
  const res = await fetch(`${API_BASE}/prompts?workspaceId=${workspaceId}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error(`Failed to load prompts (${res.status})`);
  return res.json();
}

export async function createPrompt(token: string, payload: {
  workspaceId: string;
  name: string;
  template: string;
  category?: string;
}): Promise<PromptTemplate> {
  const res = await fetch(`${API_BASE}/prompts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Create prompt failed (${res.status})`);
  }
  return res.json();
}

export async function deletePrompt(token: string, id: string, workspaceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prompts/${id}?workspaceId=${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error(`Delete prompt failed (${res.status})`);
}

export async function generatePrompts(token: string, workspaceId: string): Promise<PromptTemplate[]> {
  const res = await fetch(`${API_BASE}/prompts/generate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Generate prompts failed (${res.status})`);
  }
  return res.json();
}

export async function listQueries(token: string, workspaceId: string): Promise<AeoQuery[]> {
  const res = await fetch(`${API_BASE}/queries?workspaceId=${workspaceId}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error(`Failed to load queries (${res.status})`);
  return res.json();
}

export async function generateQueries(token: string, payload: {
  workspaceId: string;
  topicIds: string[];
  templateIds?: string[];
}): Promise<AeoQuery[]> {
  const res = await fetch(`${API_BASE}/queries/generate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Generate queries failed (${res.status})`);
  }
  return res.json();
}

export async function deleteQuery(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/queries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error(`Delete query failed (${res.status})`);
}

export interface TemplateRunResult {
  queryText: string;
  queryId: string;
  results: Array<{
    runId: string;
    engine: string;
    responseText: string;
    citations: string[];
    latencyMs: number;
  }>;
}

export async function runPromptTemplate(
  token: string,
  templateId: string,
  payload: {
    workspaceId: string;
    topicId?: string;
    variables?: Record<string, string>;
    engines: string[];
  }
): Promise<TemplateRunResult> {
  const res = await fetch(`${API_BASE}/prompts/${templateId}/run`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Run failed (${res.status})`);
  }
  return res.json();
}

// ── Prompt Research Module ─────────────────────────────────────────────────

export type ResearchPromptType =
  | 'CATEGORY_RELATED'
  | 'COMPARISON'
  | 'HOW_TO'
  | 'PROBLEM_SOLVING'
  | 'INFORMATIONAL'
  | 'TRANSACTIONAL';

export interface ResearchTopic {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { prompts: number };
}

export interface ResearchPrompt {
  id: string;
  workspaceId: string;
  promptText: string;
  topicId: string | null;
  topic: { id: string; name: string; color: string } | null;
  promptType: ResearchPromptType;
  region: string;
  createdAt: string;
  tags: string[];
  promptVolume: number;
  mentionRate: number;
  citationRate: number;
  metricsComputed: boolean;
  metricsComputedAt: string | null;
}

export interface ResearchPromptsPage {
  data: ResearchPrompt[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ResearchPromptMetrics {
  promptId: string;
  promptVolume: number;
  mentionRate: number;
  citationRate: number;
  aiSampleSize: number;
}

export async function listResearchPrompts(
  token: string,
  params: {
    workspaceId: string;
    search?: string;
    topicId?: string;
    promptType?: ResearchPromptType;
    region?: string;
    page?: number;
    limit?: number;
  }
): Promise<ResearchPromptsPage> {
  const qs = new URLSearchParams({ workspaceId: params.workspaceId });
  if (params.search) qs.set('search', params.search);
  if (params.topicId) qs.set('topicId', params.topicId);
  if (params.promptType) qs.set('promptType', params.promptType);
  if (params.region) qs.set('region', params.region);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/research/prompts?${qs}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load research prompts (${res.status})`);
  return res.json();
}

export async function createResearchPrompt(
  token: string,
  payload: {
    workspaceId: string;
    promptText: string;
    topicId?: string;
    promptType: ResearchPromptType;
    region?: string;
    tags?: string[];
  }
): Promise<ResearchPrompt> {
  const res = await fetch(`${API_BASE}/research/prompts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Create prompt failed (${res.status})`);
  }
  return res.json();
}

export async function updateResearchPrompt(
  token: string,
  id: string,
  payload: {
    workspaceId: string;
    promptText?: string;
    topicId?: string | null;
    promptType?: ResearchPromptType;
    region?: string;
    tags?: string[];
  }
): Promise<ResearchPrompt> {
  const res = await fetch(`${API_BASE}/research/prompts/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Update prompt failed (${res.status})`);
  }
  return res.json();
}

export async function deleteResearchPrompt(
  token: string,
  id: string,
  workspaceId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/research/prompts/${id}?workspaceId=${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Delete prompt failed (${res.status})`);
}

export async function getResearchPromptMetrics(
  token: string,
  promptId: string
): Promise<ResearchPromptMetrics> {
  const res = await fetch(`${API_BASE}/research/prompts/${promptId}/metrics`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load metrics (${res.status})`);
  return res.json();
}

export async function listResearchTopics(
  token: string,
  workspaceId: string
): Promise<ResearchTopic[]> {
  const res = await fetch(`${API_BASE}/research/topics?workspaceId=${workspaceId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load topics (${res.status})`);
  return res.json();
}

export async function createResearchTopic(
  token: string,
  payload: { workspaceId: string; name: string; color?: string }
): Promise<ResearchTopic> {
  const res = await fetch(`${API_BASE}/research/topics`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Create topic failed (${res.status})`);
  }
  return res.json();
}

export async function updateResearchTopic(
  token: string,
  id: string,
  payload: { workspaceId: string; name?: string; color?: string }
): Promise<ResearchTopic> {
  const res = await fetch(`${API_BASE}/research/topics/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Update topic failed (${res.status})`);
  }
  return res.json();
}

export async function deleteResearchTopic(
  token: string,
  id: string,
  workspaceId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/research/topics/${id}?workspaceId=${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Delete topic failed (${res.status})`);
}

export interface ResearchPromptRunEngineResult {
  engine: string;
  responseText: string;
  citations: string[];
  mentions: Array<{ context: string }>;
  latencyMs: number;
}

export interface ResearchPromptRunResult {
  promptId: string;
  promptText: string;
  brandName: string;
  results: ResearchPromptRunEngineResult[];
}

export async function runResearchPrompt(
  token: string,
  promptId: string,
  workspaceId: string,
): Promise<ResearchPromptRunResult> {
  const res = await fetch(`${API_BASE}/research/prompts/${promptId}/run`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Run failed (${res.status})`);
  }
  return res.json();
}

export interface DiscoveryResult {
  topicsCreated: number;
  promptsCreated: number;
  skipped: boolean;
}

export async function discoverPrompts(
  token: string,
  workspaceId: string,
  force = false,
): Promise<DiscoveryResult> {
  const res = await fetch(`${API_BASE}/research/discover`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId, force }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Discovery failed (${res.status})`);
  }
  return res.json();
}

/* ── Integrations ────────────────────────────────────── */

export type IntegrationType =
  | 'GOOGLE_SEARCH_CONSOLE'
  | 'GOOGLE_ANALYTICS'
  | 'WORDPRESS'
  | 'SLACK';

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface IntegrationSummary {
  id: string | null;
  type: IntegrationType;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  accountEmail: string | null;
}

export interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  recordsSynced: number | null;
  error: string | null;
  createdAt: string;
}

export interface IntegrationProperty {
  id: string;
  propertyName: string;
  propertyUrl: string;
  selected: boolean;
}

export interface IntegrationDetail extends IntegrationSummary {
  tokenExpiry: string | null;
  properties: IntegrationProperty[];
  syncLogs: SyncLog[];
}

export async function listIntegrations(
  token: string,
  workspaceId: string,
): Promise<IntegrationSummary[]> {
  const res = await fetch(`${API_BASE}/integrations?workspaceId=${workspaceId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load integrations (${res.status})`);
  return res.json();
}

export async function getIntegration(
  token: string,
  id: string,
  workspaceId: string,
): Promise<IntegrationDetail> {
  const res = await fetch(`${API_BASE}/integrations/${id}?workspaceId=${workspaceId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to load integration (${res.status})`);
  return res.json();
}

export async function startOAuth(
  token: string,
  workspaceId: string,
  type: IntegrationType,
): Promise<{ authUrl: string }> {
  const res = await fetch(`${API_BASE}/integrations/oauth/start`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId, type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `OAuth start failed (${res.status})`);
  }
  return res.json();
}

export async function connectWordPress(
  token: string,
  workspaceId: string,
  siteUrl: string,
  username: string,
  appPassword: string,
): Promise<IntegrationSummary> {
  const res = await fetch(`${API_BASE}/integrations/connect/wordpress`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId, siteUrl, username, appPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `WordPress connect failed (${res.status})`);
  }
  return res.json();
}

export async function connectSlack(
  token: string,
  workspaceId: string,
  webhookUrl: string,
): Promise<IntegrationSummary> {
  const res = await fetch(`${API_BASE}/integrations/connect/slack`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceId, webhookUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Slack connect failed (${res.status})`);
  }
  return res.json();
}

export type SyncEventName = 'step_start' | 'step_done' | 'done' | 'error';
export type SyncEventData = Record<string, unknown>;

/**
 * Streams sync progress via SSE (fetch + ReadableStream).
 * onEvent is called for each parsed SSE event.
 * Resolves when the stream closes; rejects on an 'error' event.
 */
export function streamSync(
  token: string,
  id: string,
  workspaceId: string,
  onEvent: (eventName: SyncEventName, data: SyncEventData) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(`${API_BASE}/integrations/${id}/sync?workspaceId=${workspaceId}`, {
      method: 'POST',
      headers: authHeaders(token),
    })
      .then((res) => {
        if (!res.ok || !res.body) {
          reject(new Error(`Sync failed (${res.status})`));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName: SyncEventName = 'done';
        let dataLine = '';

        const processLine = (line: string) => {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim() as SyncEventName;
          } else if (line.startsWith('data: ')) {
            dataLine = line.slice(6).trim();
          } else if (line === '') {
            if (dataLine) {
              try {
                const parsed = JSON.parse(dataLine) as SyncEventData;
                onEvent(eventName, parsed);
                if (eventName === 'error') {
                  reject(new Error((parsed.message as string) || 'Sync error'));
                }
              } catch { /* ignore parse errors */ }
            }
            eventName = 'done';
            dataLine = '';
          }
        };

        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) { resolve(); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            lines.forEach(processLine);
            return pump();
          });

        pump().catch(reject);
      })
      .catch(reject);
  });
}

export async function selectProperty(
  token: string,
  integrationId: string,
  propertyId: string,
  workspaceId: string,
): Promise<{ id: string; selected: boolean }> {
  const res = await fetch(
    `${API_BASE}/integrations/${integrationId}/properties/${propertyId}/select?workspaceId=${workspaceId}`,
    { method: 'PATCH', headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(`Property selection failed (${res.status})`);
  return res.json();
}

export async function disconnectIntegration(
  token: string,
  id: string,
  workspaceId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/integrations/${id}?workspaceId=${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Disconnect failed (${res.status})`);
}

/* ── Pages ──────────────────────────────────────────────────────── */

export type OpportunityScore = 'high' | 'medium' | 'low';

export interface PageRow {
  id: string;
  pageUrl: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  opportunityScore: OpportunityScore;
  lastSeenDate: string | null;
}

export interface ListPagesResult {
  pages: PageRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListPagesParams {
  workspaceId: string;
  sortBy?: 'clicks' | 'impressions' | 'position';
  sortDir?: 'asc' | 'desc';
  opportunityScore?: OpportunityScore;
  minImpressions?: number;
  maxImpressions?: number;
  page?: number;
  pageSize?: number;
}

export async function listPages(
  token: string,
  params: ListPagesParams,
): Promise<ListPagesResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const res = await fetch(`${API_BASE}/pages?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Failed to load pages (${res.status})`);
  }
  return res.json();
}

// ── WordPress ──────────────────────────────────────────────────────────────────

export interface WpPostRow {
  id: string;
  integrationId: string;
  workspaceId: string;
  wpPostId: number;
  title: string;
  slug: string;
  url: string;
  status: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  syncedAt: string;
}

export interface ListWpPostsResult {
  posts: WpPostRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function testWpConnection(
  token: string,
  integrationId: string,
  workspaceId: string,
): Promise<{ success: boolean; user: { id: number; name: string; slug: string } }> {
  const res = await fetch(
    `${API_BASE}/wp/${integrationId}/test?workspaceId=${workspaceId}`,
    { method: 'POST', headers: authHeaders(token) },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Test failed (${res.status})`);
  }
  return res.json();
}

export async function syncWpPosts(
  token: string,
  integrationId: string,
  workspaceId: string,
): Promise<{ posts_synced: number }> {
  const res = await fetch(
    `${API_BASE}/wp/${integrationId}/sync?workspaceId=${workspaceId}`,
    { method: 'POST', headers: authHeaders(token) },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Sync failed (${res.status})`);
  }
  return res.json();
}

export async function listWpPosts(
  token: string,
  integrationId: string,
  workspaceId: string,
  opts?: { status?: string; page?: number; pageSize?: number },
): Promise<ListWpPostsResult> {
  const qs = new URLSearchParams({ workspaceId });
  if (opts?.status) qs.set('status', opts.status);
  if (opts?.page) qs.set('page', String(opts.page));
  if (opts?.pageSize) qs.set('pageSize', String(opts.pageSize));
  const res = await fetch(`${API_BASE}/wp/${integrationId}/posts?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Failed to load WP posts (${res.status})`);
  }
  return res.json();
}

export async function publishWpPost(
  token: string,
  integrationId: string,
  workspaceId: string,
  data: { title: string; content: string; status?: 'publish' | 'draft'; slug?: string },
): Promise<{ wpPostId: number; title: string; url: string; status: string }> {
  const res = await fetch(`${API_BASE}/wp/${integrationId}/posts?workspaceId=${workspaceId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Publish failed (${res.status})`);
  }
  return res.json();
}

export async function updateWpPost(
  token: string,
  integrationId: string,
  workspaceId: string,
  wpPostId: number,
  data: { title?: string; content?: string; status?: 'publish' | 'draft' },
): Promise<{ wpPostId: number; title: string; url: string; status: string }> {
  const res = await fetch(
    `${API_BASE}/wp/${integrationId}/posts/${wpPostId}?workspaceId=${workspaceId}`,
    { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data) },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Update failed (${res.status})`);
  }
  return res.json();
}

// ── Brand Kit ──────────────────────────────────────────────────────────────────

export interface BrandProfile {
  id: string;
  workspaceId: string;
  brandName: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandVoice {
  id: string;
  workspaceId: string;
  tone: string | null;
  writingStyle: string | null;
  readingLevel: string | null;
  preferredPhrases: string[];
  avoidPhrases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandProduct {
  id: string;
  workspaceId: string;
  productName: string;
  description: string | null;
  productUrl: string | null;
  createdAt: string;
}

export interface BrandAudience {
  id: string;
  workspaceId: string;
  primaryAudience: string | null;
  secondaryAudience: string | null;
  geography: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandCompetitorEntry {
  id: string;
  workspaceId: string;
  competitorName: string;
  website: string | null;
  createdAt: string;
}

export interface BrandContext {
  brand_name: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  tone: string | null;
  writing_style: string | null;
  reading_level: string | null;
  preferred_phrases: string[];
  avoid_phrases: string[];
  products: { id: string; product_name: string; description: string | null; url: string | null }[];
  audience: { primary: string | null; secondary: string | null; geography: string | null };
  competitors: { id: string; name: string; website: string | null }[];
}

function brandUrl(path: string, workspaceId: string) {
  return `${API_BASE}/brand${path}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export async function getBrandProfile(token: string, workspaceId: string): Promise<BrandProfile | null> {
  const res = await fetch(brandUrl('/profile', workspaceId), { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load brand profile (${res.status})`);
  return res.json();
}

export async function saveBrandProfile(
  token: string,
  workspaceId: string,
  data: { brandName: string; website?: string; industry?: string; description?: string },
): Promise<BrandProfile> {
  const res = await fetch(brandUrl('/profile', workspaceId), {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Save failed (${res.status})`);
  }
  return res.json();
}

export async function getBrandVoice(token: string, workspaceId: string): Promise<BrandVoice | null> {
  const res = await fetch(brandUrl('/voice', workspaceId), { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load brand voice (${res.status})`);
  return res.json();
}

export async function saveBrandVoice(
  token: string,
  workspaceId: string,
  data: { tone?: string; writingStyle?: string; readingLevel?: string; preferredPhrases?: string[]; avoidPhrases?: string[] },
): Promise<BrandVoice> {
  const res = await fetch(brandUrl('/voice', workspaceId), {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Save failed (${res.status})`);
  }
  return res.json();
}

export async function listBrandProducts(token: string, workspaceId: string): Promise<BrandProduct[]> {
  const res = await fetch(brandUrl('/products', workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  return res.json();
}

export async function createBrandProduct(
  token: string,
  workspaceId: string,
  data: { productName: string; description?: string; productUrl?: string },
): Promise<BrandProduct> {
  const res = await fetch(brandUrl('/products', workspaceId), {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Create failed (${res.status})`);
  }
  return res.json();
}

export async function deleteBrandProduct(token: string, workspaceId: string, id: string): Promise<void> {
  const res = await fetch(brandUrl(`/products/${id}`, workspaceId), {
    method: 'DELETE', headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function getBrandAudience(token: string, workspaceId: string): Promise<BrandAudience | null> {
  const res = await fetch(brandUrl('/audience', workspaceId), { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load audience (${res.status})`);
  return res.json();
}

export async function saveBrandAudience(
  token: string,
  workspaceId: string,
  data: { primaryAudience?: string; secondaryAudience?: string; geography?: string },
): Promise<BrandAudience> {
  const res = await fetch(brandUrl('/audience', workspaceId), {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Save failed (${res.status})`);
  }
  return res.json();
}

export async function listBrandCompetitors(token: string, workspaceId: string): Promise<BrandCompetitorEntry[]> {
  const res = await fetch(brandUrl('/competitors', workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load competitors (${res.status})`);
  return res.json();
}

export async function createBrandCompetitor(
  token: string,
  workspaceId: string,
  data: { competitorName: string; website?: string },
): Promise<BrandCompetitorEntry> {
  const res = await fetch(brandUrl('/competitors', workspaceId), {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Create failed (${res.status})`);
  }
  return res.json();
}

export async function deleteBrandCompetitor(token: string, workspaceId: string, id: string): Promise<void> {
  const res = await fetch(brandUrl(`/competitors/${id}`, workspaceId), {
    method: 'DELETE', headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function getBrandContext(token: string, workspaceId: string): Promise<BrandContext> {
  const res = await fetch(brandUrl('/context', workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load brand context (${res.status})`);
  return res.json();
}

/* ── Workflows ───────────────────────────────────────────────────── */

export type StepType = 'AI' | 'FETCH' | 'TRANSFORM';
export type WorkflowInputType = 'text' | 'url' | 'topic' | 'query';

export interface WorkflowStepConfig {
  prompt?: string;
  urlVariable?: string;
  operation?: string;
  maxLength?: number;
}

export interface WorkflowStep {
  id: string;
  workflowTemplateId: string;
  stepOrder: number;
  stepType: StepType;
  label: string;
  configJson: WorkflowStepConfig;
  createdAt: string;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  inputType: WorkflowInputType;
  createdAt: string;
  steps: WorkflowStep[];
}

export interface WorkflowRunStepOutput {
  stepOrder: number;
  label: string;
  output: string;
}

export interface WorkflowRunOutput {
  finalOutput: string;
  steps: WorkflowRunStepOutput[];
  error?: string;
}

export interface WorkflowRun {
  id: string;
  workspaceId: string;
  workflowTemplateId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  inputData: Record<string, string> | null;
  outputData: WorkflowRunOutput | null;
  createdAt: string;
}

function workflowUrl(path: string, workspaceId: string): string {
  return `${API_BASE}/workflows${path}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export async function listWorkflows(token: string, workspaceId: string): Promise<Workflow[]> {
  const res = await fetch(workflowUrl('', workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load workflows (${res.status})`);
  return res.json();
}

export async function getWorkflow(token: string, workspaceId: string, id: string): Promise<Workflow> {
  const res = await fetch(workflowUrl(`/${id}`, workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load workflow (${res.status})`);
  return res.json();
}

export async function createWorkflow(
  token: string,
  workspaceId: string,
  data: {
    name: string;
    description?: string;
    inputType: WorkflowInputType;
    steps: Array<{ stepOrder: number; stepType: StepType; label: string; configJson: WorkflowStepConfig }>;
  },
): Promise<Workflow> {
  const res = await fetch(workflowUrl('', workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Create failed (${res.status})`);
  }
  return res.json();
}

export async function deleteWorkflow(token: string, workspaceId: string, id: string): Promise<void> {
  const res = await fetch(workflowUrl(`/${id}`, workspaceId), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function runWorkflow(
  token: string,
  workspaceId: string,
  workflowId: string,
  input: string,
): Promise<WorkflowRun> {
  const res = await fetch(workflowUrl(`/${workflowId}/run`, workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Run failed (${res.status})`);
  }
  return res.json();
}

export async function listWorkflowRuns(
  token: string,
  workspaceId: string,
  workflowId: string,
): Promise<WorkflowRun[]> {
  const res = await fetch(workflowUrl(`/${workflowId}/runs`, workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load runs (${res.status})`);
  return res.json();
}

/* ── Grids ───────────────────────────────────────────────────────── */

export type GridColumnType = 'text' | 'number' | 'url' | 'ai_prompt' | 'workflow' | 'json';
export type GridCellStatus = 'idle' | 'running' | 'completed' | 'error';

export interface GridColumn {
  id: string;
  gridId: string;
  columnName: string;
  columnType: GridColumnType;
  workflowId: string | null;
  position: number;
  createdAt: string;
}

export interface GridRow {
  id: string;
  gridId: string;
  rowIndex: number;
  createdAt: string;
}

export interface GridCell {
  id: string;
  rowId: string;
  columnId: string;
  value: string | null;
  status: GridCellStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Grid {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  columns: GridColumn[];
}

export interface GridDetail {
  grid: Grid;
  columns: GridColumn[];
  rows: GridRow[];
  cells: GridCell[];
}

function gridUrl(path: string, workspaceId: string): string {
  return `${API_BASE}/grids${path}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export async function listGrids(token: string, workspaceId: string): Promise<Grid[]> {
  const res = await fetch(gridUrl('', workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load grids (${res.status})`);
  return res.json();
}

export async function getGridDetail(token: string, workspaceId: string, gridId: string): Promise<GridDetail> {
  const res = await fetch(gridUrl(`/${gridId}`, workspaceId), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load grid (${res.status})`);
  return res.json();
}

export async function createGrid(
  token: string,
  workspaceId: string,
  data: { name: string; description?: string },
): Promise<Grid> {
  const res = await fetch(gridUrl('', workspaceId), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Create failed (${res.status})`);
  }
  return res.json();
}

export async function deleteGrid(token: string, workspaceId: string, gridId: string): Promise<void> {
  const res = await fetch(gridUrl(`/${gridId}`, workspaceId), { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export async function addGridColumn(
  token: string,
  workspaceId: string,
  gridId: string,
  data: { columnName: string; columnType?: GridColumnType; workflowId?: string },
): Promise<GridColumn> {
  const res = await fetch(gridUrl(`/${gridId}/columns`, workspaceId), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Add column failed (${res.status})`);
  }
  return res.json();
}

export async function deleteGridColumn(token: string, workspaceId: string, columnId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/grids/columns/${columnId}?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Delete column failed (${res.status})`);
}

export async function addGridRow(
  token: string,
  workspaceId: string,
  gridId: string,
  values: Record<string, string>,
): Promise<{ row: GridRow; cells: GridCell[] }> {
  const res = await fetch(gridUrl(`/${gridId}/rows`, workspaceId), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Add row failed (${res.status})`);
  }
  return res.json();
}

export async function deleteGridRow(token: string, workspaceId: string, rowId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/grids/rows/${rowId}?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Delete row failed (${res.status})`);
}

export async function updateGridCell(
  token: string,
  workspaceId: string,
  rowId: string,
  columnId: string,
  value: string,
): Promise<GridCell> {
  const res = await fetch(`${API_BASE}/grids/rows/${rowId}/cells/${columnId}?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Update cell failed (${res.status})`);
  }
  return res.json();
}

export async function runGridWorkflowColumn(
  token: string,
  workspaceId: string,
  gridId: string,
  columnId: string,
  rowIds?: string[],
): Promise<Array<{ rowId: string; cellId: string; status: string }>> {
  const res = await fetch(gridUrl(`/${gridId}/run`, workspaceId), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId, rowIds }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message || `Run failed (${res.status})`);
  }
  return res.json();
}


