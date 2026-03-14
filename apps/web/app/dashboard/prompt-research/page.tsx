'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  Check,
  Trash2,
  Pencil,
  Search,
  Filter,
  X,
  BookOpen,
  Tag,
  Globe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bot,
  Loader2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  listWorkspaces,
  listResearchPrompts,
  createResearchPrompt,
  updateResearchPrompt,
  deleteResearchPrompt,
  runResearchPrompt,
  listResearchTopics,
  createResearchTopic,
  deleteResearchTopic,
  type WorkspaceSummary,
  type ResearchPrompt,
  type ResearchTopic,
  type ResearchPromptType,
  type ResearchPromptRunResult,
  discoverPrompts,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

const PROMPT_TYPES: { value: ResearchPromptType; label: string }[] = [
  { value: 'CATEGORY_RELATED', label: 'Category Related' },
  { value: 'COMPARISON', label: 'Comparison' },
  { value: 'HOW_TO', label: 'How-To' },
  { value: 'PROBLEM_SOLVING', label: 'Problem Solving' },
  { value: 'INFORMATIONAL', label: 'Informational' },
  { value: 'TRANSACTIONAL', label: 'Transactional' },
];

const REGIONS = ['Global', 'United States', 'United Kingdom', 'India', 'Canada', 'Australia', 'Germany'];

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const TOPIC_COLORS = ['#6366f1', '#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

const ENGINE_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
  GOOGLE_AIO: 'Google AI Overviews',
};

const ENGINE_COLORS: Record<string, string> = {
  CHATGPT: '#10a37f',
  PERPLEXITY: '#1fb8cd',
  GEMINI: '#4285f4',
  GOOGLE_AIO: '#ea4335',
};



function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function TypeBadge({ type }: { type: ResearchPromptType }) {
  const colors: Record<ResearchPromptType, { bg: string; color: string }> = {
    CATEGORY_RELATED: { bg: '#ede9fe', color: '#6d28d9' },
    COMPARISON: { bg: '#dbeafe', color: '#1d4ed8' },
    HOW_TO: { bg: '#dcfce7', color: '#15803d' },
    PROBLEM_SOLVING: { bg: '#fef3c7', color: '#b45309' },
    INFORMATIONAL: { bg: '#f0f9ff', color: '#0369a1' },
    TRANSACTIONAL: { bg: '#fce7f3', color: '#9d174d' },
  };
  const c = colors[type] ?? { bg: '#f3f4f6', color: '#374151' };
  const label = PROMPT_TYPES.find((p) => p.value === type)?.label ?? type;
  return (
    <span style={{
      background: c.bg, color: c.color,
      borderRadius: 99, padding: '2px 8px', fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function highlightMention(context: string, brand: string) {
  const re = new RegExp(`(${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = context.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} style={{ background: '#fde68a', color: '#92400e', borderRadius: 2, padding: '0 2px', fontWeight: 700 }}>
            {part}
          </mark>
        ) : part,
      )}
    </>
  );
}

export default function PromptResearchPage() {
  const { user, loading, logout, accessToken } = useAuth();
  const router = useRouter();

  // ── Workspace ──
  const [checking, setChecking] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  // ── Data ──
  const [prompts, setPrompts] = useState<ResearchPrompt[]>([]);
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  // ── Filters ──
  const [activeTab, setActiveTab] = useState<'prompts' | 'topics'>('prompts');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterTopicId, setFilterTopicId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [page, setPage] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // ── Selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Add/Edit Prompt Modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchPrompt | null>(null);
  const [formText, setFormText] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formType, setFormType] = useState<ResearchPromptType>('INFORMATIONAL');
  const [formRegion, setFormRegion] = useState('Global');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Topic Management ──
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState(TOPIC_COLORS[0]);
  const [topicBusy, setTopicBusy] = useState(false);
  const [topicError, setTopicError] = useState('');

  // ── Discovery ──
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // ── Prompt Detail Drawer ──
  const [drawerPrompt, setDrawerPrompt] = useState<ResearchPrompt | null>(null);
  const [drawerTab, setDrawerTab] = useState<'response' | 'mentions' | 'citations'>('response');
  const [drawerRunning, setDrawerRunning] = useState(false);
  const [drawerResult, setDrawerResult] = useState<ResearchPromptRunResult | null>(null);
  const [drawerError, setDrawerError] = useState('');

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Auth check + workspaces ──
  useEffect(() => {
    if (loading) return;
    if (!user || !accessToken) { router.replace('/login'); return; }
    listWorkspaces(accessToken).then((wsList) => {
      setWorkspaces(wsList);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;
      const wsId = (stored && wsList.find((w) => w.id === stored)) ? stored : wsList[0]?.id ?? null;
      setWorkspaceId(wsId);
      setActiveWorkspace(wsList.find((w) => w.id === wsId) ?? wsList[0] ?? null);
    }).finally(() => setChecking(false));
  }, [accessToken, loading, router, user]);

  // ── Search debounce ──
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch data ──
  const fetchPrompts = useCallback(() => {
    if (!workspaceId || !accessToken) return;
    setDataLoading(true);
    setPageError('');
    listResearchPrompts(accessToken, {
      workspaceId,
      search: debouncedSearch || undefined,
      topicId: filterTopicId || undefined,
      promptType: filterType as ResearchPromptType || undefined,
      region: filterRegion || undefined,
      page,
      limit: 25,
    }).then((result) => {
      setPrompts(result.data);
      setTotal(result.total);
      setPages(result.pages);
    }).catch((err) => setPageError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setDataLoading(false));
  }, [workspaceId, accessToken, debouncedSearch, filterTopicId, filterType, filterRegion, page]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const fetchTopics = useCallback(() => {
    if (!workspaceId || !accessToken) return;
    listResearchTopics(accessToken, workspaceId).then(setTopics).catch(() => {});
  }, [workspaceId, accessToken]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // ── Open modal ──
  function openAdd() {
    setEditing(null);
    setFormText(''); setFormTopic(''); setFormTags('');
    setFormType('INFORMATIONAL'); setFormRegion('Global');
    setFormError(''); setModalOpen(true);
  }

  function openEdit(p: ResearchPrompt) {
    setEditing(p);
    setFormText(p.promptText);
    setFormTopic(p.topicId ?? '');
    setFormTags(p.tags.join(', '));
    setFormType(p.promptType);
    setFormRegion(p.region);
    setFormError(''); setModalOpen(true);
  }

  async function handleSavePrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !accessToken) return;
    setFormBusy(true); setFormError('');
    const tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      if (editing) {
        const updated = await updateResearchPrompt(accessToken, editing.id, {
          workspaceId, promptText: formText, topicId: formTopic || null,
          promptType: formType, region: formRegion, tags,
        });
        setPrompts((prev) => prev.map((p) => p.id === updated.id ? { ...updated, tags: updated.tags as unknown as string[] } : p));
      } else {
        await createResearchPrompt(accessToken, {
          workspaceId, promptText: formText, topicId: formTopic || undefined,
          promptType: formType, region: formRegion, tags,
        });
        fetchPrompts();
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!workspaceId || !accessToken) return;
    if (!confirm('Delete this prompt?')) return;
    await deleteResearchPrompt(accessToken, id, workspaceId).catch(() => {});
    fetchPrompts();
  }

  async function handleBulkDelete() {
    if (!workspaceId || !accessToken || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} prompts?`)) return;
    await Promise.all([...selected].map((id) => deleteResearchPrompt(accessToken, id, workspaceId).catch(() => {})));
    setSelected(new Set());
    fetchPrompts();
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !accessToken || !newTopicName.trim()) return;
    setTopicBusy(true); setTopicError('');
    try {
      await createResearchTopic(accessToken, { workspaceId, name: newTopicName.trim(), color: newTopicColor });
      setNewTopicName(''); fetchTopics();
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : 'Failed');
    } finally { setTopicBusy(false); }
  }

  async function handleDeleteTopic(id: string) {
    if (!workspaceId || !accessToken) return;
    if (!confirm('Delete this topic? Prompts will be unlinked.')) return;
    await deleteResearchTopic(accessToken, id, workspaceId).catch(() => {});
    fetchTopics(); fetchPrompts();
  }

  function openDrawer(p: ResearchPrompt) {
    setDrawerPrompt(p);
    setDrawerTab('response');
    setDrawerResult(null);
    setDrawerError('');
    if (!accessToken || !workspaceId) return;
    setDrawerRunning(true);
    runResearchPrompt(accessToken, p.id, workspaceId)
      .then((result) => {
        setDrawerResult(result);
        // Refresh list so mention/citation rates show the newly computed values
        if (!p.metricsComputed) fetchPrompts();
      })
      .catch((err) => setDrawerError(err instanceof Error ? err.message : 'Failed to run'))
      .finally(() => setDrawerRunning(false));
  }

  async function handleDiscover(force = false) {
    if (!workspaceId || !accessToken) return;
    setDiscoveryLoading(true);
    setPageError('');
    try {
      const result = await discoverPrompts(accessToken, workspaceId, force);
      if (result.promptsCreated > 0 || !result.skipped) {
        fetchPrompts();
        fetchTopics();
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscoveryLoading(false);
    }
  }

  // Auto-trigger discovery when page loads with no prompts
  useEffect(() => {
    if (!dataLoading && prompts.length === 0 && workspaceId && accessToken && !discoveryLoading) {
      handleDiscover(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, prompts.length, workspaceId]);

  const allSelected = prompts.length > 0 && selected.size === prompts.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(prompts.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const activeFiltersCount = [filterTopicId, filterType, filterRegion].filter(Boolean).length;

  if (checking || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.25rem' }}>Prompt Research</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Discover and track AI search prompts users ask across ChatGPT, Gemini and Perplexity.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-outline" onClick={() => handleDiscover(true)} disabled={discoveryLoading}
              title="Re-run AI discovery to generate topic clusters and research prompts for your workspace">
              {discoveryLoading
                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <Zap size={15} />}
              {discoveryLoading ? 'Discovering…' : 'Discover Prompts'}
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={15} />Add Prompt
            </button>
          </div>
        </div>

        {pageError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '0.65rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {pageError}
          </div>
        )}

        {/* Top Filter Bar */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* Date range */}
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{ width: 'auto', fontSize: '0.83rem', padding: '0.45rem 0.75rem' }}>
            {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          {/* Region */}
          <select value={filterRegion} onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
            style={{ width: 'auto', fontSize: '0.83rem', padding: '0.45rem 0.75rem' }}>
            <option value="">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Filter button */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button className={activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}
              style={{ fontSize: '0.83rem', padding: '0.45rem 0.75rem' }}
              onClick={() => setShowFilterPanel((v) => !v)}>
              <Filter size={14} />
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </button>
            {showFilterPanel && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 40,
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)', padding: '1rem', width: 260,
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Filters</div>
                <label>Topic</label>
                <select value={filterTopicId} onChange={(e) => { setFilterTopicId(e.target.value); setPage(1); }}
                  style={{ marginBottom: '0.75rem' }}>
                  <option value="">All topics</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <label>Prompt Type</label>
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  style={{ marginBottom: '0.75rem' }}>
                  <option value="">All types</option>
                  {PROMPT_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
                <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                  onClick={() => { setFilterTopicId(''); setFilterType(''); setFilterRegion(''); setPage(1); setShowFilterPanel(false); }}>
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {selected.size > 0 && (
            <button className="btn-outline" style={{ fontSize: '0.83rem', padding: '0.45rem 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={handleBulkDelete}>
              <Trash2 size={14} />Delete {selected.size} selected
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--line)', marginBottom: '1rem' }}>
          {(['prompts', 'topics'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '0.6rem 1.1rem', fontWeight: 600,
                fontSize: '0.9rem', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2, color: activeTab === tab ? 'var(--primary)' : 'var(--muted)',
                textTransform: 'capitalize',
              }}>
              {tab === 'prompts' ? `Prompts${total > 0 ? ` (${total})` : ''}` : 'Topics'}
            </button>
          ))}
        </div>

        {/* ── PROMPTS TAB ── */}
        {activeTab === 'prompts' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: 400 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input placeholder="Search prompts…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', paddingRight: search ? '2.25rem' : undefined }} />
              {search && (
                <button onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {dataLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</div>
              ) : prompts.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No prompts yet</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Discover AI search prompts for your category, or add one manually.</p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-outline" onClick={() => handleDiscover(false)} disabled={discoveryLoading}>
                      {discoveryLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                      {discoveryLoading ? 'Discovering…' : 'Discover Prompts'}
                    </button>
                    <button className="btn-primary" onClick={openAdd}><Plus size={14} />Add Prompt</button>
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ width: 40, padding: '0.75rem 0.5rem 0.75rem 1rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 15, height: 15 }} />
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Prompt</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Topic</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Tags</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Volume</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Mention Rate</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Citation Rate</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prompts.map((p, i) => (
                        <tr key={p.id}
                          onClick={() => openDrawer(p)}
                          style={{ borderBottom: i < prompts.length - 1 ? '1px solid var(--line)' : 'none', background: selected.has(p.id) ? 'var(--primary-light)' : 'transparent', cursor: 'pointer' }}>
                          <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ padding: '0.75rem 1rem', maxWidth: 320 }}>
                            <span style={{ fontWeight: 500, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {p.promptText}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Globe size={10} />{p.region}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            {p.topic ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.topic.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem' }}>{p.topic.name}</span>
                              </span>
                            ) : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 140 }}>
                              {p.tags.length > 0
                                ? p.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} style={{ background: '#f3f4f6', color: 'var(--text-secondary)', borderRadius: 99, padding: '1px 7px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <Tag size={9} />{tag}
                                  </span>
                                ))
                                : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>
                              }
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            <TypeBadge type={p.promptType} />
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {p.promptVolume}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            {p.metricsComputed ? (
                              <span style={{ fontWeight: 600, color: p.mentionRate > 0.1 ? 'var(--success)' : 'var(--muted)' }}>
                                {pct(p.mentionRate)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }} title="Open prompt to compute">—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            {p.metricsComputed ? (
                              <span style={{ fontWeight: 600, color: p.citationRate > 0.05 ? 'var(--primary)' : 'var(--muted)' }}>
                                {pct(p.citationRate)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }} title="Open prompt to compute">—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}
                            onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button className="btn-ghost" style={{ padding: '0.3rem' }} title="Edit" onClick={() => openEdit(p)}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--danger)' }} title="Delete" onClick={() => handleDelete(p.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span>Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-outline" style={{ padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}
                    disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={14} />Prev
                  </button>
                  <button className="btn-outline" style={{ padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}
                    disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                    Next<ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TOPICS TAB ── */}
        {activeTab === 'topics' && (
          <div style={{ maxWidth: 640 }}>
            {/* Add topic form */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Add Topic</div>
              <form onSubmit={handleAddTopic} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label>Topic Name</label>
                  <input required placeholder="e.g. Resume Building Tools" value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)} />
                </div>
                <div>
                  <label>Color</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    {TOPIC_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setNewTopicColor(c)}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newTopicColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={topicBusy} style={{ alignSelf: 'flex-end', marginBottom: 1 }}>
                  <Plus size={14} />{topicBusy ? 'Adding…' : 'Add Topic'}
                </button>
              </form>
              {topicError && <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{topicError}</div>}
            </div>

            {/* Topics list */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {topics.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                  No topics yet. Add your first topic above.
                </div>
              ) : (
                topics.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1.1rem', borderBottom: i < topics.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</span>
                      <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{(t._count?.prompts ?? 0)} prompt{(t._count?.prompts ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <button className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--danger)' }} onClick={() => handleDeleteTopic(t.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Add / Edit Prompt Modal ── */}
      {modalOpen && (        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{
            background: 'var(--card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
            width: '100%', maxWidth: 520, padding: '1.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>{editing ? 'Edit Prompt' : 'Add Prompt'}</h2>
              <button className="btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePrompt} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label>Prompt *</label>
                <textarea required rows={3} placeholder="e.g. What is the best resume builder?" value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label>Topic</label>
                <select value={formTopic} onChange={(e) => setFormTopic(e.target.value)}>
                  <option value="">No topic</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Prompt Type *</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as ResearchPromptType)}>
                    {PROMPT_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Region</label>
                  <select value={formRegion} onChange={(e) => setFormRegion(e.target.value)}>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>Tags (comma-separated)</label>
                <input placeholder="e.g. resume, job search" value={formTags} onChange={(e) => setFormTags(e.target.value)} />
              </div>

              {formError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '0.55rem 0.75rem', fontSize: '0.82rem' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formBusy}>
                  {formBusy ? 'Saving…' : editing ? 'Save Changes' : 'Add Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Prompt Detail Drawer ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: drawerPrompt ? 'auto' : 'none' }}>
        {drawerPrompt && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}
            onClick={() => setDrawerPrompt(null)} />
        )}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw',
          background: 'var(--card)', borderLeft: '1px solid var(--line)',
          boxShadow: '-4px 0 40px rgba(0,0,0,0.15)',
          transform: drawerPrompt ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {drawerPrompt && (
            <>
              {/* Drawer header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                    <TypeBadge type={drawerPrompt.promptType} />
                    {drawerPrompt.topic && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: drawerPrompt.topic.color, flexShrink: 0 }} />
                        {drawerPrompt.topic.name}
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <Globe size={11} />{drawerPrompt.region}
                    </span>
                  </div>
                  <button className="btn-ghost" style={{ padding: '0.3rem', flexShrink: 0 }}
                    onClick={() => setDrawerPrompt(null)}>
                    <X size={17} />
                  </button>
                </div>
                <p style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.5, color: 'var(--text)', margin: 0 }}>
                  {drawerPrompt.promptText}
                </p>
              </div>

              {/* Drawer tabs */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--line)', flexShrink: 0 }}>
                {(['response', 'mentions', 'citations'] as const).map((tab) => {
                  const labels: Record<string, string> = { response: 'AI Response', mentions: 'Mentions', citations: 'Citations' };
                  return (
                    <button key={tab} onClick={() => setDrawerTab(tab)}
                      style={{
                        background: 'none', border: 'none', padding: '0.6rem 1.1rem',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                        borderBottom: drawerTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                        marginBottom: -2, color: drawerTab === tab ? 'var(--primary)' : 'var(--muted)',
                      }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Drawer body */}
              <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
                {drawerRunning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', minHeight: 220, color: 'var(--muted)' }}>
                    <Loader2 size={28} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Running prompt across AI engines…</span>
                  </div>
                ) : drawerError ? (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                    {drawerError}
                  </div>
                ) : drawerResult ? (
                  <>
                    {/* AI Response */}
                    {drawerTab === 'response' && (
                      drawerResult.results.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem', fontSize: '0.875rem' }}>
                          No AI engines available. Configure API keys to see live responses.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {drawerResult.results.map((r) => (
                            <div key={r.engine} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Bot size={14} style={{ color: ENGINE_COLORS[r.engine] ?? 'var(--primary)' }} />
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: ENGINE_COLORS[r.engine] ?? 'var(--text)' }}>
                                    {ENGINE_LABELS[r.engine] ?? r.engine}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>
                                  {r.latencyMs}ms
                                </span>
                              </div>
                              <p style={{ fontSize: '0.87rem', lineHeight: 1.75, color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {r.responseText}
                              </p>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Mentions */}
                    {drawerTab === 'mentions' && (() => {
                      if (!drawerResult.brandName) {
                        return (
                          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem', fontSize: '0.875rem' }}>
                            No brand configured. Set up your brand in workspace settings to track mentions.
                          </div>
                        );
                      }
                      const allMentions = drawerResult.results.flatMap((r) =>
                        r.mentions.map((m) => ({ context: m.context, engine: r.engine }))
                      );
                      return allMentions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '0.4rem' }}>Not mentioned</span>
                          <span style={{ color: 'var(--muted)' }}>&ldquo;{drawerResult.brandName}&rdquo; was not found in any AI response.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.25rem' }}>
                            <strong>{allMentions.length}</strong> mention{allMentions.length !== 1 ? 's' : ''} of &ldquo;{drawerResult.brandName}&rdquo;
                          </p>
                          {allMentions.map((m, i) => (
                            <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.4rem', color: ENGINE_COLORS[m.engine] ?? 'var(--primary)' }}>
                                {ENGINE_LABELS[m.engine] ?? m.engine}
                              </div>
                              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text)', margin: 0 }}>
                                &hellip;{highlightMention(m.context, drawerResult.brandName)}&hellip;
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Citations */}
                    {drawerTab === 'citations' && (() => {
                      const all = drawerResult.results.flatMap((r) =>
                        r.citations.map((url) => ({ url, engine: r.engine }))
                      );
                      const uniq = [...new Map(all.map((c) => [c.url, c])).values()];
                      return uniq.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem', fontSize: '0.875rem' }}>
                          No citation sources were found in the AI responses.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.25rem' }}>
                            <strong>{uniq.length}</strong> source{uniq.length !== 1 ? 's' : ''} cited
                          </p>
                          {uniq.map((c, i) => (
                            <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '0.65rem 0.85rem', textDecoration: 'none', color: 'var(--text)', fontSize: '0.83rem' }}>
                              <ExternalLink size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.url}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0, background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>
                                {ENGINE_LABELS[c.engine] ?? c.engine}
                              </span>
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
