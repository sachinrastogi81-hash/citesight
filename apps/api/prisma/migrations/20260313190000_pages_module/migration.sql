-- CreateEnum
CREATE TYPE "OpportunityScore" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "page_url" TEXT NOT NULL,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_impressions" INTEGER NOT NULL DEFAULT 0,
    "avg_ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opportunity_score" "OpportunityScore" NOT NULL DEFAULT 'low',
    "last_seen_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_workspace_id_page_url_key" ON "pages"("workspace_id", "page_url");

-- CreateIndex
CREATE INDEX "pages_workspace_id_idx" ON "pages"("workspace_id");

-- CreateIndex
CREATE INDEX "pages_workspace_id_opportunity_score_idx" ON "pages"("workspace_id", "opportunity_score");
