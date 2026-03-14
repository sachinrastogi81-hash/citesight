import { prisma } from '../lib/prisma.js';
import { runWorkflow } from './workflow.service.js';

// ── List / CRUD ───────────────────────────────────────────────────

export async function listGrids(workspaceId: string) {
  return prisma.grid.findMany({
    where: { workspaceId },
    include: { columns: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getGrid(id: string, workspaceId: string) {
  const grid = await prisma.grid.findFirst({
    where: { id, workspaceId },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  if (!grid) throw Object.assign(new Error('Grid not found'), { status: 404 });

  const rows = await prisma.gridRow.findMany({
    where: { gridId: id },
    orderBy: { rowIndex: 'asc' },
  });

  const cells = rows.length
    ? await prisma.gridCell.findMany({
        where: { rowId: { in: rows.map((r) => r.id) } },
      })
    : [];

  return { grid, columns: grid.columns, rows, cells };
}

export async function createGrid(
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string },
) {
  return prisma.grid.create({
    data: { workspaceId, name: data.name, description: data.description, createdBy: userId },
    include: { columns: true },
  });
}

export async function updateGrid(
  id: string,
  workspaceId: string,
  data: { name?: string; description?: string },
) {
  const grid = await prisma.grid.findFirst({ where: { id, workspaceId } });
  if (!grid) throw Object.assign(new Error('Grid not found'), { status: 404 });
  return prisma.grid.update({ where: { id }, data });
}

export async function deleteGrid(id: string, workspaceId: string) {
  const grid = await prisma.grid.findFirst({ where: { id, workspaceId } });
  if (!grid) throw Object.assign(new Error('Grid not found'), { status: 404 });
  await prisma.grid.delete({ where: { id } });
}

// ── Columns ───────────────────────────────────────────────────────

export async function addColumn(
  gridId: string,
  workspaceId: string,
  data: { columnName: string; columnType?: string; workflowId?: string },
) {
  await assertGridOwner(gridId, workspaceId);
  const maxPos = await prisma.gridColumn.aggregate({ where: { gridId }, _max: { position: true } });
  const position = (maxPos._max.position ?? -1) + 1;
  return prisma.gridColumn.create({
    data: {
      gridId,
      columnName: data.columnName,
      columnType: (data.columnType as any) ?? 'text',
      workflowId: data.workflowId,
      position,
    },
  });
}

export async function updateColumn(
  columnId: string,
  workspaceId: string,
  data: { columnName?: string; columnType?: string; workflowId?: string | null; position?: number },
) {
  const col = await prisma.gridColumn.findFirst({
    where: { id: columnId },
    include: { grid: { select: { workspaceId: true } } },
  });
  if (!col || col.grid.workspaceId !== workspaceId)
    throw Object.assign(new Error('Column not found'), { status: 404 });
  return prisma.gridColumn.update({ where: { id: columnId }, data: data as any });
}

export async function deleteColumn(columnId: string, workspaceId: string) {
  const col = await prisma.gridColumn.findFirst({
    where: { id: columnId },
    include: { grid: { select: { workspaceId: true } } },
  });
  if (!col || col.grid.workspaceId !== workspaceId)
    throw Object.assign(new Error('Column not found'), { status: 404 });
  await prisma.gridColumn.delete({ where: { id: col.id } });
}

// ── Rows ──────────────────────────────────────────────────────────

export async function addRow(
  gridId: string,
  workspaceId: string,
  values: Record<string, string>,
) {
  await assertGridOwner(gridId, workspaceId);

  const maxIdx = await prisma.gridRow.aggregate({ where: { gridId }, _max: { rowIndex: true } });
  const rowIndex = (maxIdx._max.rowIndex ?? -1) + 1;

  const columns = await prisma.gridColumn.findMany({ where: { gridId } });

  const row = await prisma.gridRow.create({ data: { gridId, rowIndex } });

  // Upsert cells for provided values (matched by column name)
  const cells = await Promise.all(
    Object.entries(values).map(async ([colName, value]) => {
      const col = columns.find((c) => c.columnName.toLowerCase() === colName.toLowerCase());
      if (!col) return null;
      return prisma.gridCell.create({ data: { rowId: row.id, columnId: col.id, value, status: 'idle' } });
    }),
  );

  return { row, cells: cells.filter(Boolean) };
}

export async function deleteRow(rowId: string, workspaceId: string) {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: { grid: { select: { workspaceId: true } } },
  });
  if (!row || row.grid.workspaceId !== workspaceId)
    throw Object.assign(new Error('Row not found'), { status: 404 });
  await prisma.gridRow.delete({ where: { id: rowId } });
}

// ── Cells ─────────────────────────────────────────────────────────

export async function updateCell(cellId: string, workspaceId: string, value: string) {
  const cell = await prisma.gridCell.findFirst({
    where: { id: cellId },
    include: { row: { include: { grid: { select: { workspaceId: true } } } } },
  });
  if (!cell || cell.row.grid.workspaceId !== workspaceId)
    throw Object.assign(new Error('Cell not found'), { status: 404 });
  return prisma.gridCell.update({ where: { id: cellId }, data: { value, status: 'idle' } });
}

export async function upsertCell(
  rowId: string,
  columnId: string,
  workspaceId: string,
  value: string,
) {
  // verify ownership
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: { grid: { select: { workspaceId: true } } },
  });
  if (!row || row.grid.workspaceId !== workspaceId)
    throw Object.assign(new Error('Row not found'), { status: 404 });

  return prisma.gridCell.upsert({
    where: { rowId_columnId: { rowId, columnId } },
    update: { value, status: 'idle' },
    create: { rowId, columnId, value, status: 'idle' },
  });
}

// ── Workflow column execution ─────────────────────────────────────

export async function runWorkflowColumn(
  gridId: string,
  workspaceId: string,
  columnId: string,
  rowIds?: string[], // if omitted, run all rows
) {
  await assertGridOwner(gridId, workspaceId);

  const column = await prisma.gridColumn.findFirst({ where: { id: columnId, gridId } });
  if (!column) throw Object.assign(new Error('Column not found'), { status: 404 });
  if (column.columnType !== 'workflow' || !column.workflowId)
    throw Object.assign(new Error('Column does not have a workflow attached'), { status: 400 });

  // Find the input column (first non-workflow column to left)
  const inputColumn = await prisma.gridColumn.findFirst({
    where: { gridId, position: { lt: column.position }, columnType: { not: 'workflow' } },
    orderBy: { position: 'desc' },
  });

  const rows = await prisma.gridRow.findMany({
    where: { gridId, ...(rowIds ? { id: { in: rowIds } } : {}) },
    orderBy: { rowIndex: 'asc' },
  });

  const results: Array<{ rowId: string; cellId: string; status: string }> = [];

  for (const row of rows) {
    // Get input value
    let inputValue = '';
    if (inputColumn) {
      const inputCell = await prisma.gridCell.findUnique({
        where: { rowId_columnId: { rowId: row.id, columnId: inputColumn.id } },
      });
      inputValue = inputCell?.value ?? '';
    }

    if (!inputValue) continue;

    // Mark cell running
    const cell = await prisma.gridCell.upsert({
      where: { rowId_columnId: { rowId: row.id, columnId } },
      update: { status: 'running', value: null },
      create: { rowId: row.id, columnId, status: 'running' },
    });

    try {
      const run = await runWorkflow(column.workflowId!, workspaceId, { input: inputValue });
      const output = (run.outputData as any)?.finalOutput ?? (run.outputData as any)?.steps?.[0]?.output ?? '';
      await prisma.gridCell.update({
        where: { id: cell.id },
        data: { value: output, status: 'completed' },
      });
      results.push({ rowId: row.id, cellId: cell.id, status: 'completed' });
    } catch {
      await prisma.gridCell.update({
        where: { id: cell.id },
        data: { status: 'error', value: 'Workflow failed' },
      });
      results.push({ rowId: row.id, cellId: cell.id, status: 'error' });
    }
  }

  return results;
}

// ── Helper ────────────────────────────────────────────────────────

async function assertGridOwner(gridId: string, workspaceId: string) {
  const grid = await prisma.grid.findFirst({ where: { id: gridId, workspaceId } });
  if (!grid) throw Object.assign(new Error('Grid not found'), { status: 404 });
  return grid;
}
