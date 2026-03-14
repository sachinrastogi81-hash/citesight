'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Play,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  FileText,
  Search,
  X,
  History,
} from 'lucide-react';
import { Sidebar } from '../../../components/Sidebar';
import { useAuth } from '../../../lib/auth-context';
import {
  listWorkflows,
  createWorkflow,
  deleteWorkflow,
  runWorkflow,
  listWorkflowRuns,
  type Workflow,
  type WorkflowRun,
  type WorkflowInputType,
  type StepType,
  type WorkflowStepConfig,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

// ── Helpers ────────────────────────────────────────────────────────────────────

function inputTypeLabel(t: WorkflowInputType): string {
  return { text: 'Free text', url: 'Page URL', topic: 'Topic', query: 'Search query' }[t] ?? t;
}

function inputTypePlaceholder(t: WorkflowInputType): string {
  return {
    text: 'Enter text input…',
    url: 'https://example.com/page',
    topic: 'e.g. resume builder tips',
    query: 'e.g. best resume builder',
  }[t] ?? 'Enter input…';
}

function statusIcon(status: WorkflowRun['status']) {
  if (status === 'COMPLETED') return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
  if (status === 'FAILED') return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
  if (status === 'RUNNING') return <Loader2 size={14} className="spin" />;
  return <Clock size={14} style={{ color: 'var(--muted)' }} />;
}

function stepTypeIcon(type: StepType) {
  if (type === 'AI') return <Zap size={13} />;
  if (type === 'FETCH') return <FileText size={13} />;
  if (type === 'TRANSFORM') return <GitBranch size={13} />;
  return <ChevronRight size={13} />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      background: type === 'success' ? 'var(--success)' : 'var(--danger)',
      color: '#fff', borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem',
      fontSize: '0.875rem', fontWeight: 500, boxShadow: 'var(--shadow-lg)', maxWidth: '360px',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── New Workflow Modal ─────────────────────────────────────────────────────────

const INPUT_TYPES: WorkflowInputType[] = ['text', 'url', 'topic', 'query'];
const STEP_TYPES: StepType[] = ['AI', 'FETCH', 'TRANSFORM'];

interface NewStepDraft {
  stepOrder: number;
  stepType: StepType;
  label: string;
  configJson: WorkflowStepConfig;
}

function NewWorkflowModal({ onClose, onCreated }: { onClose: () => void; onCreated: (wf: Workflow) => void }) {
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inputType, setInputType] = useState<WorkflowInputType>('text');
  const [steps, setSteps] = useState<NewStepDraft[]>([
    { stepOrder: 1, stepType: 'AI', label: 'AI step', configJson: { prompt: 'Analyze the following: {{input}}' } },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) ?? '' : '';

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { stepOrder: prev.length + 1, stepType: 'AI', label: 'New step', configJson: { prompt: '{{previous_output}}' } },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })),
    );
  }

  function updateStep(idx: number, patch: Partial<NewStepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (steps.length === 0) { setError('Add at least one step'); return; }
    setSaving(true);
    setError('');
    try {
      const wf = await createWorkflow(accessToken!, workspaceId, { name: name.trim(), description: description.trim() || undefined, inputType, steps });
      onCreated(wf);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>New Workflow</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.25rem' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Name */}
          <div>
            <label className="form-label">Workflow name *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My SEO Analyzer" />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow do?" />
          </div>

          {/* Input type */}
          <div>
            <label className="form-label">Input type</label>
            <select className="form-input" value={inputType} onChange={(e) => setInputType(e.target.value as WorkflowInputType)}>
              {INPUT_TYPES.map((t) => <option key={t} value={t}>{inputTypeLabel(t)}</option>)}
            </select>
          </div>

          {/* Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Steps</label>
              <button type="button" onClick={addStep} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                <Plus size={13} /> Add step
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', minWidth: '1rem' }}>{step.stepOrder}</span>
                    <input
                      className="form-input"
                      value={step.label}
                      onChange={(e) => updateStep(idx, { label: e.target.value })}
                      placeholder="Step label"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <select
                      className="form-input"
                      value={step.stepType}
                      onChange={(e) => updateStep(idx, { stepType: e.target.value as StepType, configJson: e.target.value === 'AI' ? { prompt: '{{previous_output}}' } : e.target.value === 'FETCH' ? { urlVariable: 'input' } : { operation: 'truncate', maxLength: 500 } })}
                      style={{ width: 'auto', marginBottom: 0 }}
                    >
                      {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button type="button" onClick={() => removeStep(idx)} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {step.stepType === 'AI' && (
                    <textarea
                      className="form-input"
                      value={step.configJson.prompt ?? ''}
                      onChange={(e) => updateStep(idx, { configJson: { ...step.configJson, prompt: e.target.value } })}
                      placeholder="Prompt template. Use {{input}} and {{previous_output}}"
                      rows={3}
                      style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  )}
                  {step.stepType === 'FETCH' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Fetches the URL from <code style={{ background: 'var(--surface)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{'{{input}}'}</code>
                    </div>
                  )}
                  {step.stepType === 'TRANSFORM' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className="form-input"
                        value={step.configJson.operation ?? 'truncate'}
                        onChange={(e) => updateStep(idx, { configJson: { ...step.configJson, operation: e.target.value } })}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <option value="truncate">Truncate</option>
                        <option value="uppercase">Uppercase</option>
                      </select>
                      {step.configJson.operation === 'truncate' && (
                        <input
                          type="number"
                          className="form-input"
                          value={step.configJson.maxLength ?? 500}
                          onChange={(e) => updateStep(idx, { configJson: { ...step.configJson, maxLength: Number(e.target.value) } })}
                          style={{ width: '90px', marginBottom: 0 }}
                          placeholder="Max chars"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Run Panel ──────────────────────────────────────────────────────────────────

function RunPanel({ workflow }: { workflow: Workflow }) {
  const { accessToken } = useAuth();
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'run' | 'history'>('run');
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) ?? '' : '';

  const loadHistory = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoadingHistory(true);
    try {
      const r = await listWorkflowRuns(accessToken, workspaceId, workflow.id);
      setRuns(r);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [accessToken, workspaceId, workflow.id]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  // Reset when workflow changes
  useEffect(() => {
    setInput('');
    setRun(null);
    setError('');
    setTab('run');
    setRuns([]);
  }, [workflow.id]);

  async function handleRun() {
    if (!input.trim()) { setError('Please enter an input value'); return; }
    setRunning(true);
    setError('');
    setRun(null);
    try {
      const result = await runWorkflow(accessToken!, workspaceId, workflow.id, input.trim());
      setRun(result);
      if (tab === 'history') loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
        {(['run', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--primary)' : 'var(--muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-1px',
              textTransform: 'capitalize',
            }}
          >
            {t === 'history' ? <><History size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />History</> : <><Play size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />Run</>}
          </button>
        ))}
      </div>

      {tab === 'run' && (
        <>
          <div>
            <label className="form-label">
              {inputTypeLabel(workflow.inputType)}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputTypePlaceholder(workflow.inputType)}
                style={{ flex: 1, marginBottom: 0 }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !running) handleRun(); }}
              />
              <button
                onClick={handleRun}
                disabled={running || !input.trim()}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {running ? <><Loader2 size={14} className="spin" /> Running…</> : <><Play size={14} /> Run</>}
              </button>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{error}</p>}
          </div>

          {running && (
            <div className="card" style={{ background: 'var(--surface-2)', textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={24} className="spin" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Running {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}…</p>
            </div>
          )}

          {run && !running && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusIcon(run.status)}
                <span style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{run.status.toLowerCase()}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>· {timeAgo(run.createdAt)}</span>
              </div>

              {/* Step outputs */}
              {run.outputData?.steps?.map((s) => (
                <div key={s.stepOrder} className="card" style={{ background: 'var(--surface-2)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>{s.stepOrder}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: '200px', overflowY: 'auto', color: 'var(--text)' }}>
                    {s.output}
                  </pre>
                </div>
              ))}

              {/* Error */}
              {run.outputData?.error && (
                <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'var(--danger)', padding: '1rem' }}>
                  <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: 0 }}>{run.outputData.error}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
              <Loader2 size={20} className="spin" />
            </div>
          ) : runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              No runs yet. Run the workflow to see history.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {runs.map((r) => (
                <div key={r.id} className="card" style={{ padding: '0.875rem', cursor: 'pointer', background: 'var(--surface-2)' }}
                  onClick={() => { setRun(r); setTab('run'); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {statusIcon(r.status)}
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{r.status.toLowerCase()}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.inputData?.input && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Input: {r.inputData.input}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) ?? '' : '';

  const loadWorkflows = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    try {
      const wfs = await listWorkflows(accessToken, workspaceId);
      setWorkflows(wfs);
      if (wfs.length > 0 && !selected) setSelected(wfs[0]);
    } catch {
      setToast({ msg: 'Failed to load workflows', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!accessToken) { router.push('/login'); return; }
    loadWorkflows();
  }, [accessToken, router, loadWorkflows]);

  async function handleDelete(wf: Workflow, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;
    setDeleting(wf.id);
    try {
      await deleteWorkflow(accessToken!, workspaceId, wf.id);
      const next = workflows.filter((w) => w.id !== wf.id);
      setWorkflows(next);
      if (selected?.id === wf.id) setSelected(next[0] ?? null);
      setToast({ msg: 'Workflow deleted', type: 'success' });
    } catch {
      setToast({ msg: 'Delete failed', type: 'error' });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Header */}
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitBranch size={22} style={{ color: 'var(--primary)' }} /> Workflows
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Build AI-powered automation pipelines. Run them manually or bulk-execute with Grids.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setShowNewModal(true)}>
                <Plus size={15} /> New Workflow
              </button>
            </div>
          </div>

          {/* Body: two-pane layout */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Left pane: workflow list */}
            <div style={{
              width: '280px',
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--muted)' }}>
                  <Loader2 size={20} className="spin" />
                </div>
              ) : workflows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                  No workflows yet.<br />Click "New Workflow" to create one.
                </div>
              ) : (
                workflows.map((wf) => (
                  <div
                    key={wf.id}
                    onClick={() => setSelected(wf)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(wf)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid',
                      borderColor: selected?.id === wf.id ? 'var(--primary)' : 'var(--line)',
                      background: selected?.id === wf.id ? 'rgba(99,102,241,0.06)' : 'var(--card)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <GitBranch size={15} style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wf.name}
                        </div>
                        {wf.description && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
                            {wf.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.7rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'var(--muted)', fontWeight: 500 }}>
                            {inputTypeLabel(wf.inputType as WorkflowInputType)}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(wf, e)}
                        className="btn-ghost"
                        style={{ padding: '0.2rem', color: 'var(--muted)', flexShrink: 0 }}
                        disabled={deleting === wf.id}
                      >
                        {deleting === wf.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right pane: detail + run */}
            {selected ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', gap: '1.5rem', minWidth: 0 }}>

                {/* Workflow detail */}
                <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{selected.name}</h2>
                    {selected.description && <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{selected.description}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 500 }}>
                        Input: {inputTypeLabel(selected.inputType as WorkflowInputType)}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--surface-2)', color: 'var(--muted)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                        {selected.steps.length} step{selected.steps.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Pipeline</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {selected.steps.map((step, idx) => (
                        <div key={step.id}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.625rem 0' }}>
                            <div style={{
                              width: '26px', height: '26px', borderRadius: '50%',
                              background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, fontSize: '0.75rem', fontWeight: 600,
                            }}>
                              {step.stepOrder}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 500 }}>
                                <span style={{ color: 'var(--primary)' }}>{stepTypeIcon(step.stepType as StepType)}</span>
                                {step.label}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                                {step.stepType === 'AI' ? 'AI analysis' : step.stepType === 'FETCH' ? 'Fetch URL content' : 'Transform text'}
                              </div>
                            </div>
                          </div>
                          {idx < selected.steps.length - 1 && (
                            <div style={{ paddingLeft: '12px', height: '16px', display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: '1px', height: '100%', background: 'var(--border)', marginLeft: '0' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Run panel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <RunPanel workflow={selected} />
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                <div style={{ textAlign: 'center' }}>
                  <GitBranch size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p style={{ fontSize: '0.9rem' }}>Select a workflow to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showNewModal && (
        <NewWorkflowModal
          onClose={() => setShowNewModal(false)}
          onCreated={(wf) => {
            setWorkflows((prev) => [...prev, wf]);
            setSelected(wf);
            setShowNewModal(false);
            setToast({ msg: `"${wf.name}" created`, type: 'success' });
          }}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

