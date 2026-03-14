-- CreateTable: brand_profile
CREATE TABLE "brand_profile" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_profile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_profile_workspace_id_key" ON "brand_profile"("workspace_id");

-- CreateTable: brand_voice
CREATE TABLE "brand_voice" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "tone" TEXT,
    "writing_style" TEXT,
    "reading_level" TEXT,
    "preferred_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoid_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_voice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_voice_workspace_id_key" ON "brand_voice"("workspace_id");

-- CreateTable: brand_products
CREATE TABLE "brand_products" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "product_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "brand_products_workspace_id_idx" ON "brand_products"("workspace_id");

-- CreateTable: brand_audience
CREATE TABLE "brand_audience" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "primary_audience" TEXT,
    "secondary_audience" TEXT,
    "geography" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_audience_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_audience_workspace_id_key" ON "brand_audience"("workspace_id");

-- CreateTable: brand_competitors
CREATE TABLE "brand_competitors" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "competitor_name" TEXT NOT NULL,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_competitors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "brand_competitors_workspace_id_idx" ON "brand_competitors"("workspace_id");

-- AddForeignKeys
ALTER TABLE "brand_profile" ADD CONSTRAINT "brand_profile_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_voice" ADD CONSTRAINT "brand_voice_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_products" ADD CONSTRAINT "brand_products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_audience" ADD CONSTRAINT "brand_audience_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_competitors" ADD CONSTRAINT "brand_competitors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
