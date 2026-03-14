-- CreateEnum
CREATE TYPE "ResearchPromptType" AS ENUM ('CATEGORY_RELATED', 'COMPARISON', 'HOW_TO', 'PROBLEM_SOLVING', 'INFORMATIONAL', 'TRANSACTIONAL');

-- CreateTable
CREATE TABLE "research_topics" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_prompts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "topic_id" TEXT,
    "prompt_type" "ResearchPromptType" NOT NULL DEFAULT 'INFORMATIONAL',
    "region" TEXT NOT NULL DEFAULT 'Global',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_prompt_tags" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "research_prompt_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_prompt_metrics" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt_volume" INTEGER NOT NULL DEFAULT 0,
    "mention_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "citation_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_sample_size" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_prompt_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_topics_workspace_id_idx" ON "research_topics"("workspace_id");

-- CreateIndex
CREATE INDEX "research_prompts_workspace_id_idx" ON "research_prompts"("workspace_id");

-- CreateIndex
CREATE INDEX "research_prompt_tags_prompt_id_idx" ON "research_prompt_tags"("prompt_id");

-- CreateIndex
CREATE INDEX "research_prompt_metrics_prompt_id_idx" ON "research_prompt_metrics"("prompt_id");

-- AddForeignKey
ALTER TABLE "research_prompts" ADD CONSTRAINT "research_prompts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "research_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_prompt_tags" ADD CONSTRAINT "research_prompt_tags_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "research_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_prompt_metrics" ADD CONSTRAINT "research_prompt_metrics_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "research_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
