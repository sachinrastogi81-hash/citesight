-- Add lazy-metrics fields to research_prompts
ALTER TABLE "research_prompts" ADD COLUMN "metrics_computed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "research_prompts" ADD COLUMN "metrics_computed_at" TIMESTAMP(3);
