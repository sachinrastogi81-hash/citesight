-- Extend workflow_templates with description and input_type
ALTER TABLE "workflow_templates" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "workflow_templates" ADD COLUMN IF NOT EXISTS "input_type" TEXT NOT NULL DEFAULT 'text';

-- Extend workflow_runs with input/output data
ALTER TABLE "workflow_runs" ADD COLUMN IF NOT EXISTS "input_data" JSONB;
ALTER TABLE "workflow_runs" ADD COLUMN IF NOT EXISTS "output_data" JSONB;

-- Create workflow_steps table
CREATE TABLE IF NOT EXISTS "workflow_steps" (
    "id"                    TEXT        NOT NULL,
    "workflow_template_id"  TEXT        NOT NULL,
    "step_order"            INTEGER     NOT NULL,
    "step_type"             TEXT        NOT NULL,
    "label"                 TEXT        NOT NULL DEFAULT '',
    "config_json"           JSONB       NOT NULL DEFAULT '{}',
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "workflow_steps_workflow_template_id_idx"
    ON "workflow_steps"("workflow_template_id");

ALTER TABLE "workflow_steps"
    ADD CONSTRAINT "workflow_steps_workflow_template_id_fkey"
    FOREIGN KEY ("workflow_template_id")
    REFERENCES "workflow_templates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
