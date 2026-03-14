-- CreateTable
CREATE TABLE "gsc_search_rows" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "query" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_search_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gsc_search_rows_integration_id_date_idx" ON "gsc_search_rows"("integration_id", "date");

-- CreateIndex
CREATE INDEX "gsc_search_rows_property_id_date_idx" ON "gsc_search_rows"("property_id", "date");

-- AddForeignKey
ALTER TABLE "gsc_search_rows" ADD CONSTRAINT "gsc_search_rows_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_search_rows" ADD CONSTRAINT "gsc_search_rows_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "integration_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
