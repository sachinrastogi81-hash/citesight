-- CreateEnum: grid cell status
CREATE TYPE "GridCellStatus" AS ENUM ('idle', 'running', 'completed', 'error');

-- CreateEnum: grid column type
CREATE TYPE "GridColumnType" AS ENUM ('text', 'number', 'url', 'ai_prompt', 'workflow', 'json');

-- Table: grids
CREATE TABLE "grids" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "workspace_id" TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT,
    "created_by"   TEXT,
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "grids_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grids_workspace_id_idx" ON "grids"("workspace_id");

-- Table: grid_columns
CREATE TABLE "grid_columns" (
    "id"          TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
    "grid_id"     TEXT              NOT NULL,
    "column_name" TEXT              NOT NULL,
    "column_type" "GridColumnType"  NOT NULL DEFAULT 'text',
    "workflow_id" TEXT,
    "position"    INTEGER           NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT "grid_columns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grid_columns_grid_id_idx" ON "grid_columns"("grid_id");

-- Table: grid_rows
CREATE TABLE "grid_rows" (
    "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "grid_id"    TEXT        NOT NULL,
    "row_index"  INTEGER     NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "grid_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grid_rows_grid_id_idx" ON "grid_rows"("grid_id");

-- Table: grid_cells
CREATE TABLE "grid_cells" (
    "id"         TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
    "row_id"     TEXT              NOT NULL,
    "column_id"  TEXT              NOT NULL,
    "value"      TEXT,
    "status"     "GridCellStatus"  NOT NULL DEFAULT 'idle',
    "created_at" TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT "grid_cells_pkey"        PRIMARY KEY ("id"),
    CONSTRAINT "grid_cells_row_col_unique" UNIQUE ("row_id", "column_id")
);

CREATE INDEX "grid_cells_row_id_idx"    ON "grid_cells"("row_id");
CREATE INDEX "grid_cells_column_id_idx" ON "grid_cells"("column_id");

-- Foreign keys
ALTER TABLE "grids"        ADD CONSTRAINT "grids_workspace_id_fkey"    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "grid_columns" ADD CONSTRAINT "grid_columns_grid_id_fkey"  FOREIGN KEY ("grid_id")      REFERENCES "grids"("id")      ON DELETE CASCADE;
ALTER TABLE "grid_rows"    ADD CONSTRAINT "grid_rows_grid_id_fkey"     FOREIGN KEY ("grid_id")      REFERENCES "grids"("id")      ON DELETE CASCADE;
ALTER TABLE "grid_cells"   ADD CONSTRAINT "grid_cells_row_id_fkey"     FOREIGN KEY ("row_id")       REFERENCES "grid_rows"("id")  ON DELETE CASCADE;
ALTER TABLE "grid_cells"   ADD CONSTRAINT "grid_cells_column_id_fkey"  FOREIGN KEY ("column_id")    REFERENCES "grid_columns"("id") ON DELETE CASCADE;
