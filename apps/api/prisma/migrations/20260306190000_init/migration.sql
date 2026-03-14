-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AiEngine" AS ENUM ('CHATGPT', 'PERPLEXITY', 'GEMINI', 'GOOGLE_AIO');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_memberships" (
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("user_id","workspace_id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_preview" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "last_used" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "brand_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "topic_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine_configs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "engine" "AiEngine" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engine_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_queries" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeo_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_runs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "engine" "AiEngine" NOT NULL,
    "response_text" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "cron_expr" TEXT NOT NULL DEFAULT '0 6 * * *',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_responses" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query_run_id" TEXT NOT NULL,
    "engine" "AiEngine" NOT NULL,
    "response_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_entries" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query_run_id" TEXT NOT NULL,
    "cited_url" TEXT NOT NULL,
    "cited_domain" TEXT NOT NULL,
    "cited_brand" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visibility_scores" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "share_of_voice" DOUBLE PRECISION NOT NULL,
    "citation_rate" DOUBLE PRECISION NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visibility_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "gap_type" TEXT NOT NULL,
    "priority_score" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_content" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "workflow_template_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_memberships_workspace_id_idx" ON "workspace_memberships"("workspace_id");

-- CreateIndex
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_workspace_id_key" ON "brands"("workspace_id");

-- CreateIndex
CREATE INDEX "competitors_workspace_id_idx" ON "competitors"("workspace_id");

-- CreateIndex
CREATE INDEX "topics_workspace_id_idx" ON "topics"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "engine_configs_workspace_id_engine_key" ON "engine_configs"("workspace_id", "engine");

-- CreateIndex
CREATE INDEX "prompt_templates_workspace_id_idx" ON "prompt_templates"("workspace_id");

-- CreateIndex
CREATE INDEX "aeo_queries_workspace_id_idx" ON "aeo_queries"("workspace_id");

-- CreateIndex
CREATE INDEX "query_runs_workspace_id_created_at_idx" ON "query_runs"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "query_schedules_workspace_id_key" ON "query_schedules"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_responses_workspace_id_idx" ON "ai_responses"("workspace_id");

-- CreateIndex
CREATE INDEX "citation_entries_workspace_id_created_at_idx" ON "citation_entries"("workspace_id", "created_at");
CREATE INDEX "citation_entries_query_run_id_cited_url_idx" ON "citation_entries"("query_run_id", "cited_url");

-- CreateIndex
CREATE INDEX "visibility_scores_workspace_id_created_at_idx" ON "visibility_scores"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "opportunities_workspace_id_created_at_idx" ON "opportunities"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "generated_content_workspace_id_idx" ON "generated_content"("workspace_id");

-- CreateIndex
CREATE INDEX "workflow_templates_workspace_id_idx" ON "workflow_templates"("workspace_id");

-- CreateIndex
CREATE INDEX "workflow_runs_workspace_id_created_at_idx" ON "workflow_runs"("workspace_id", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_queries" ADD CONSTRAINT "aeo_queries_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_runs" ADD CONSTRAINT "query_runs_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "aeo_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
