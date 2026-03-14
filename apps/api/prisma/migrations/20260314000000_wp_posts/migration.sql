-- CreateTable
CREATE TABLE "wp_posts" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "wp_post_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "modified_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wp_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wp_posts_integration_id_wp_post_id_key" ON "wp_posts"("integration_id", "wp_post_id");

-- CreateIndex
CREATE INDEX "wp_posts_workspace_id_idx" ON "wp_posts"("workspace_id");

-- AddForeignKey
ALTER TABLE "wp_posts" ADD CONSTRAINT "wp_posts_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
