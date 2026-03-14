export type AiEngine = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'GOOGLE_AIO';

export type JobStatus = 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED' | 'DEAD_LETTER';

export type RetryPolicy = {
  maxAttempts: number;
  backoffMs: number;
};

export type DeploymentEnv = 'development' | 'staging' | 'production';

export type OrgRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type CitationEntry = {
  runId: string;
  engine: AiEngine;
  citedUrl: string;
  citedDomain: string;
  citedBrand: string | null;
  confidence: number;
};

export type VisibilityMetric = {
  workspaceId: string;
  score: number;
  shareOfVoice: number;
  citationRate: number;
  periodStart: string;
  periodEnd: string;
};

export type Opportunity = {
  queryId: string;
  competitor: string;
  gapType: 'COMPETITOR_ONLY_CITED';
  priorityScore: number;
  recommendation: string;
};

export type WorkflowStepType = 'AI_CALL' | 'LOOKUP' | 'CONDITION' | 'GENERATE' | 'REVIEW' | 'PUBLISH';

export type PromptTemplate = {
  id: string;
  workspaceId: string | null;
  name: string;
  template: string;
  category: string;
  isSystem: boolean;
};

export type OnboardingConfig = {
  onboardingComplete: boolean;
  brand: { name: string; description: string | null; category: string | null } | null;
  topics: Array<{ id: string; name: string }>;
  competitors: Array<{ id: string; domain: string; name: string | null }>;
  engines: AiEngine[];
};

export type QuerySchedule = {
  id: string;
  workspaceId: string;
  cronExpr: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

export type TrackingRunResult = {
  run: { id: string; queryId: string; engine: AiEngine; responseText: string; status: JobStatus };
  citations: CitationEntry[];
};
