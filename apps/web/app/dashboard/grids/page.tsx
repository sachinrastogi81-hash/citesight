'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Play,
  Loader2,
  X,
  ChevronDown,
  Zap,
  Type,
  Hash,
  Link2,
  Braces,
  GitBranch,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Sidebar } from '../../../components/Sidebar';
import { useAuth } from '../../../lib/auth-context';
import {
  listGrids,
  getGridDetail,
  createGrid,
  deleteGrid,
  addGridColumn,
  deleteGridColumn,
  addGridRow,
  deleteGridRow,
  updateGridCell,
  runGridWorkflowColumn,
  listWorkflows,
  type Grid,
  type GridDetail,
  type GridColumn,
  type GridCell,
  type GridColumnType,
  type Workflow,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

// ── Helpers ────────────────────────────────────────────────────────

const COLUMN_TYPE_META: Record<GridColumnType, { label: string; icon: React.ReactNode }> = {
  text:      { label: 'Text',      icon: <Type size={13} /> },
  number:    { label: 'Number',    icon: <Hash size={13} /> },
  url:       { label: 'URL',       icon: <Link2 size={13} /> },
  ai_prompt: { label: 'AI Prompt', icon: <Zap size={13} /> },
  workflow:  { label: 'Workflow',  icon: <GitBranch size={13} /> },
  json:      { label: 'JSON',      icon: <Braces size={13} /> },
};

function cellKey(rowId: string, columnId: string) { return `${rowId}:${columnId}`; }

function CellStatusBadge({ status }: { status: GridCell['status'] }) {
  if (status === 'running')   return <Loader2 size={12} className="spin" style={{ color: 'var(--primary)' }} />;
  if (status === 'completed') return <CheckCircle size={12} style={{ color: 'var(--success)' }} />;
  if (status === 'error')     return <AlertCircle size={12} style={{ color: 'var(--danger)' }} />;
  return null;
}

// ── Toast ──────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      background: type === 'success' ? 'var(--success)' : 'var(--danger)',
      color: '#fff', borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem',
      fontSize: '0.875rem', fontWeight: 500, boxShadow: 'var(--shadow-lg)', maxWidth: '360px',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
    </div>
  );
}

// ── New Grid Modal ─────────────────────────────────────────────────

function NewGridModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: Grid) => void }) {
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) ?? '' : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const g = await createGrid(accessToken!, workspaceId, { name: name.trim(), description: description.trim() || undefined });
      onCreated(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>New Grid</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.25rem' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Grid name *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SEO Optimization Grid" autoFocus />
          </div>
          <div>
            <label className="form-label">Description</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you analyzing?" />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Create Grid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Column Modal ───────────────────────────────────────────────

function AddColumnModal({
  gridId, workspaceId, workflows, onClose, onAdded,
}: {
  gridId: string; workspaceId: string; workflows: Workflow[];
  onClose: () => void; onAdded: (col: GridColumn) => void;
}) {
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<GridColumnType>('text');
  const [workflowId, setWorkflowId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (type === 'workflow' && !workflowId) { setError('Select a workflow'); return; }
    setSaving(true); setError('');
    try {
      const col = await addGridColumn(accessToken!, workspaceId, gridId, {
        columnName: name.trim(),
        columnType: type,
        workflowId: type === 'workflow' ? workflowId : undefined,
      });
      onAdded(col);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Add Column</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.25rem' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Column name *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SEO Score" autoFocus />
          </div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value as GridColumnType)}>
              {(Object.keys(COLUMN_TYPE_META) as GridColumnType[]).map((t) => (
                <option key={t} value={t}>{COLUMN_TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          {type === 'workflow' && (
            <div>
              <label className="form-label">Workflow *</label>
              <select className="form-input" value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}>
                <option value="">— select —</option>
                {workflows.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
              </select>
            </div>
          )}
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Adding…</> : 'Add Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Spreadsheet View ──────────────────────────────────────────────

interface CellMap { [key: string]: GridCell }

function buildCellMap(cells: GridCell[]): CellMap {
  const map: CellMap = {};
  for (const c of cells) map[cellKey(c.rowId, c.columnId)] = c;
  return map;
}

function SpreadsheetView({
  detail,
  workflows,
  workspaceId,
  onReload,
  onToast,
}: {
  detail: GridDetail;
  workflows: Workflow[];
  workspaceId: string;
  onReload: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const { accessToken } = useAuth();
  const { grid, columns, rows } = detail;
  const [cellMap, setCellMap] = useState<CellMap>(() => buildCellMap(detail.cells));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [runningCol, setRunningCol] = useState<string | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [deletingRow, setDeletingRow] = useState<string | null>(null);
  const [deletingCol, setDeletingCol] = useState<string | null>(null);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCellMap(buildCellMap(detail.cells)); }, [detail.cells]);
  useEffect(() => { if (editingKey && inputRef.current) inputRef.current.focus(); }, [editingKey]);

  function startEdit(rowId: string, columnId: string) {
    const key = cellKey(rowId, columnId);
    const existing = cellMap[key];
    setEditValue(existing?.value ?? '');
    setEditingKey(key);
  }

  async function commitEdit(rowId: string, columnId: string) {
    setEditingKey(null);
    try {
      const updated = await updateGridCell(accessToken!, workspaceId, rowId, columnId, editValue);
      setCellMap((prev) => ({ ...prev, [cellKey(rowId, columnId)]: updated }));
    } catch {
      onToast('Failed to save cell', 'error');
    }
  }

  async function handleAddRow() {
    try {
      await addGridRow(accessToken!, workspaceId, grid.id, {});
      onReload();
    } catch {
      onToast('Failed to add row', 'error');
    }
  }

  async function handleDeleteRow(rowId: string) {
    setDeletingRow(rowId);
    try {
      await deleteGridRow(accessToken!, workspaceId, rowId);
      onReload();
    } catch {
      onToast('Failed to delete row', 'error');
    } finally { setDeletingRow(null); }
  }

  async function handleDeleteColumn(columnId: string) {
    setDeletingCol(columnId);
    setColMenu(null);
    try {
      await deleteGridColumn(accessToken!, workspaceId, columnId);
      onReload();
    } catch {
      onToast('Failed to delete column', 'error');
    } finally { setDeletingCol(null); }
  }

  async function handleRunColumn(columnId: string) {
    setRunningCol(columnId);
    setCellMap((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const key = cellKey(row.id, columnId);
        next[key] = { ...(next[key] ?? { id: '', rowId: row.id, columnId, createdAt: '', updatedAt: '' }), status: 'running', value: null } as GridCell;
      }
      return next;
    });
    try {
      const results = await runGridWorkflowColumn(accessToken!, workspaceId, grid.id, columnId);
      onToast(`Ran ${results.length} rows`, 'success');
      onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Run failed', 'error');
    } finally { setRunningCol(null); }
  }

  const ROW_HEIGHT = 40;
  const COL_WIDTH = 200;
  const IDX_WIDTH = 48;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }} onClick={() => setShowAddCol(true)}>
          <Plus size={13} /> Add column
        </button>
        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }} onClick={handleAddRow}>
          <Plus size={13} /> Add row
        </button>
        {columns.some((c) => c.columnType === 'workflow') && (
          <button
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', marginLeft: 'auto' }}
            disabled={!!runningCol}
            onClick={() => {
              const wfCol = columns.find((c) => c.columnType === 'workflow');
              if (wfCol) handleRunColumn(wfCol.id);
            }}
          >
            {runningCol ? <><Loader2 size={13} className="spin" /> Running…</> : <><Play size={13} /> Run workflows</>}
          </button>
        )}
      </div>

      {/* Grid table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {columns.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: '0.75rem' }}>
            <LayoutGrid size={32} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>No columns yet — add one to get started</p>
            <button className="btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setShowAddCol(true)}>
              <Plus size={14} /> Add first column
            </button>
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--line)' }}>
                <th style={{ width: IDX_WIDTH, minWidth: IDX_WIDTH, padding: '0 0.5rem', height: ROW_HEIGHT, textAlign: 'center', fontSize: '0.7rem', color: 'var(--muted)', borderRight: '1px solid var(--line)', position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2 }}>
                  #
                </th>
                {columns.map((col) => (
                  <th key={col.id} style={{ width: COL_WIDTH, minWidth: COL_WIDTH, padding: '0 0.75rem', height: ROW_HEIGHT, textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', borderRight: '1px solid var(--line)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--primary)', display: 'flex' }}>{COLUMN_TYPE_META[col.columnType]?.icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.columnName}</span>
                      {col.columnType === 'workflow' && (
                        <button
                          onClick={() => handleRunColumn(col.id)}
                          disabled={runningCol === col.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--primary)', display: 'flex' }}
                          title="Run this workflow column"
                        >
                          {runningCol === col.id ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                        </button>
                      )}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setColMenu(colMenu === col.id ? null : col.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--muted)', display: 'flex' }}
                        >
                          <ChevronDown size={12} />
                        </button>
                        {colMenu === col.id && (
                          <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 100, minWidth: '120px' }}>
                            <button
                              onClick={() => handleDeleteColumn(col.id)}
                              disabled={deletingCol === col.id}
                              style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              {deletingCol === col.id ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />} Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
                <th style={{ padding: '0 0.5rem', height: ROW_HEIGHT }}>
                  <button onClick={() => setShowAddCol(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <Plus size={13} /> Column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                    No rows yet — click &ldquo;Add row&rdquo; to start filling data
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.025)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ width: IDX_WIDTH, padding: '0 0.5rem', height: ROW_HEIGHT, textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', borderRight: '1px solid var(--line)', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{rowIdx + 1}</span>
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={deletingRow === row.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--danger)', display: 'flex', opacity: 0.6 }}
                        >
                          {deletingRow === row.id ? <Loader2 size={11} className="spin" /> : <X size={11} />}
                        </button>
                      </div>
                    </td>
                    {columns.map((col) => {
                      const key = cellKey(row.id, col.id);
                      const cell = cellMap[key];
                      const isEditing = editingKey === key;
                      return (
                        <td
                          key={col.id}
                          style={{ width: COL_WIDTH, minWidth: COL_WIDTH, padding: 0, height: ROW_HEIGHT, borderRight: '1px solid var(--line)', position: 'relative' }}
                          onDoubleClick={() => { if (col.columnType !== 'workflow') startEdit(row.id, col.id); }}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(row.id, col.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(row.id, col.id);
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                              style={{ width: '100%', height: '100%', border: '2px solid var(--primary)', outline: 'none', padding: '0 0.75rem', fontSize: '0.85rem', background: 'var(--card)', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.75rem', height: '100%', fontSize: '0.85rem', overflow: 'hidden' }}>
                              <CellStatusBadge status={cell?.status ?? 'idle'} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: cell?.status === 'error' ? 'var(--danger)' : 'inherit' }}>
                                {cell?.value ?? ''}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddCol && (
        <AddColumnModal
          gridId={grid.id}
          workspaceId={workspaceId}
          workflows={workflows}
          onClose={() => setShowAddCol(false)}
          onAdded={() => { setShowAddCol(false); onReload(); }}
        />
      )}

      {colMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setColMenu(null)} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function GridsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [grids, setGrids] = useState<Grid[]>([]);
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GridDetail | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deletingGrid, setDeletingGrid] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) ?? '' : '';

  const loadGrids = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    try {
      const [gs, wfs] = await Promise.all([
        listGrids(accessToken, workspaceId),
        listWorkflows(accessToken, workspaceId),
      ]);
      setGrids(gs);
      setWorkflows(wfs);
      if (gs.length > 0 && !selectedGridId) setSelectedGridId(gs[0].id);
    } catch {
      setToast({ msg: 'Failed to load grids', type: 'error' });
    } finally { setLoading(false); }
  }, [accessToken, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async (gridId: string) => {
    if (!accessToken || !workspaceId) return;
    setLoadingDetail(true);
    try {
      const d = await getGridDetail(accessToken, workspaceId, gridId);
      setDetail(d);
    } catch {
      setToast({ msg: 'Failed to load grid data', type: 'error' });
    } finally { setLoadingDetail(false); }
  }, [accessToken, workspaceId]);

  useEffect(() => {
    if (!accessToken) { router.push('/login'); return; }
    loadGrids();
  }, [accessToken, router, loadGrids]);

  useEffect(() => {
    if (selectedGridId) loadDetail(selectedGridId);
    else setDetail(null);
  }, [selectedGridId, loadDetail]);

  async function handleDeleteGrid(g: Grid, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${g.name}"? All rows and data will be lost.`)) return;
    setDeletingGrid(g.id);
    try {
      await deleteGrid(accessToken!, workspaceId, g.id);
      const next = grids.filter((x) => x.id !== g.id);
      setGrids(next);
      if (selectedGridId === g.id) { setSelectedGridId(next[0]?.id ?? null); setDetail(null); }
      setToast({ msg: 'Grid deleted', type: 'success' });
    } catch {
      setToast({ msg: 'Delete failed', type: 'error' });
    } finally { setDeletingGrid(null); }
  }

  const selectedGrid = grids.find((g) => g.id === selectedGridId) ?? null;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Page header */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
                <LayoutGrid size={22} style={{ color: 'var(--primary)' }} /> Grids
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                Spreadsheet-style data tables with AI workflow columns.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowNewModal(true)}>
              <Plus size={15} /> New Grid
            </button>
          </div>

          {/* Body: sidebar + main */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Left sidebar: grid list */}
            <div style={{ width: '240px', flexShrink: 0, borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--muted)' }}><Loader2 size={20} className="spin" /></div>
              ) : grids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>No grids yet.</div>
              ) : (
                grids.map((g) => (
                  <div
                    key={g.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedGridId(g.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedGridId(g.id)}
                    style={{
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid',
                      borderColor: selectedGridId === g.id ? 'var(--primary)' : 'var(--line)',
                      background: selectedGridId === g.id ? 'rgba(99,102,241,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LayoutGrid size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{g.columns.length} col{g.columns.length !== 1 ? 's' : ''}</div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteGrid(g, e)}
                        className="btn-ghost"
                        style={{ padding: '0.15rem', color: 'var(--muted)', flexShrink: 0 }}
                        disabled={deletingGrid === g.id}
                      >
                        {deletingGrid === g.id ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right: spreadsheet */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {loadingDetail ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                  <Loader2 size={24} className="spin" />
                </div>
              ) : detail && selectedGrid ? (
                <>
                  {/* Grid title bar */}
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <LayoutGrid size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedGrid.name}</span>
                    {selectedGrid.description && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>— {selectedGrid.description}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {detail.rows.length} row{detail.rows.length !== 1 ? 's' : ''} · {detail.columns.length} col{detail.columns.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <SpreadsheetView
                    detail={detail}
                    workflows={workflows}
                    workspaceId={workspaceId}
                    onReload={() => loadDetail(selectedGridId!)}
                    onToast={(msg, type) => setToast({ msg, type })}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <LayoutGrid size={40} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
                    <p style={{ fontSize: '0.9rem' }}>Select a grid or create a new one</p>
                    <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowNewModal(true)}>
                      <Plus size={14} /> New Grid
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showNewModal && (
        <NewGridModal
          onClose={() => setShowNewModal(false)}
          onCreated={(g) => {
            setGrids((prev) => [...prev, g]);
            setSelectedGridId(g.id);
            setShowNewModal(false);
            setToast({ msg: `"${g.name}" created`, type: 'success' });
          }}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
