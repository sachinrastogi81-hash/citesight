-- Drop old single-dimension table
DROP TABLE IF EXISTS "gsc_search_rows";

-- CreateTable gsc_queries (query + page aggregated)
CREATE TABLE "gsc_queries" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable gsc_pages (page-level aggregated)
CREATE TABLE "gsc_pages" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable gsc_query_dates (query trend over time)
CREATE TABLE "gsc_query_dates" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_query_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable gsc_query_devices (device breakdown)
CREATE TABLE "gsc_query_devices" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_query_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable gsc_query_countries (country breakdown)
CREATE TABLE "gsc_query_countries" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_query_countries_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "gsc_queries_integration_id_query_page_key" ON "gsc_queries"("integration_id", "query", "page");
CREATE UNIQUE INDEX "gsc_pages_integration_id_page_key" ON "gsc_pages"("integration_id", "page");
CREATE UNIQUE INDEX "gsc_query_dates_integration_id_query_date_key" ON "gsc_query_dates"("integration_id", "query", "date");
CREATE UNIQUE INDEX "gsc_query_devices_integration_id_query_device_key" ON "gsc_query_devices"("integration_id", "query", "device");
CREATE UNIQUE INDEX "gsc_query_countries_integration_id_query_country_key" ON "gsc_query_countries"("integration_id", "query", "country");

-- Regular indexes
CREATE INDEX "gsc_queries_workspace_id_idx" ON "gsc_queries"("workspace_id");
CREATE INDEX "gsc_pages_workspace_id_idx" ON "gsc_pages"("workspace_id");
CREATE INDEX "gsc_query_dates_workspace_id_idx" ON "gsc_query_dates"("workspace_id");
CREATE INDEX "gsc_query_dates_integration_id_date_idx" ON "gsc_query_dates"("integration_id", "date");
CREATE INDEX "gsc_query_devices_workspace_id_idx" ON "gsc_query_devices"("workspace_id");
CREATE INDEX "gsc_query_countries_workspace_id_idx" ON "gsc_query_countries"("workspace_id");

-- Foreign keys (all cascade on delete)
ALTER TABLE "gsc_queries" ADD CONSTRAINT "gsc_queries_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_pages" ADD CONSTRAINT "gsc_pages_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_query_dates" ADD CONSTRAINT "gsc_query_dates_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_query_devices" ADD CONSTRAINT "gsc_query_devices_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_query_countries" ADD CONSTRAINT "gsc_query_countries_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
