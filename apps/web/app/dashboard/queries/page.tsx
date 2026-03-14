'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Trash2,
  Play,
  X,
  Bot,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  getOnboardingConfig,
  listWorkspaces,
  listPrompts,
  createPrompt,
  deletePrompt,
  runPromptTemplate,
  generatePrompts,
  type WorkspaceSummary,
  type PromptTemplate,
  type TemplateRunResult,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

const ENGINES = ['CHATGPT', 'PERPLEXITY', 'GEMINI', 'GOOGLE_AIO'] as const;
const ENGINE_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
  GOOGLE_AIO: 'Google AIO',
};
const CATEGORIES = ['comparison', 'informational', 'tutorial', 'reputation', 'authority', 'custom'];



function TemplateText({ template }: { template: string }) {
  const parts = template.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\{([^}]+)\}$/);
        if (!match) return <span key={i}>{part}</span>;
        const key = match[1].toLowerCase();
        const cls = ['topic', 'brand', 'competitor', 'year'].includes(key) ? key : 'custom';
        return <span key={i} className={`template-var ${cls}`}>{part}</span>;
      })}
    </>
  );
}

function buildPreview(
  template: string,
  topicName?: string,
  brandName?: string,
  competitorDomain?: string,
  customVars?: Record<string, string>,
) {
  let text = template
    .replace(/\{year\}/g, String(new Date().getFullYear()))
    .replace(/\{topic\}/g, topicName ?? '{topic}')
    .replace(/\{brand\}/g, brandName ?? '{brand}')
    .replace(/\{competitor\}/g, competitorDomain ?? '{competitor}');
  if (customVars) {
    for (const [k, v] of Object.entries(customVars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v || `{${k}}`);
    }
  }
  return text;
}

function detectVars(template: string): string[] {
  const matches = [...template.matchAll(/\{([^}]+)\}/g)].map((m) => m[1].toLowerCase());
  return [...new Set(matches)];
}

export default function QueriesPage() {
  const { user, loading, logout, accessToken } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [topics, setTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [competitors, setCompetitors] = useState<Array<{ id: string; domain: string; name?: string | null }>>([]);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [runTopicId, setRunTopicId] = useState('');
  const [runCompetitor, setRunCompetitor] = useState('');
  const [runCustomVars, setRunCustomVars] = useState<Record<string, string>>({});
  const [runEngines, setRunEngines] = useState<string[]>(['CHATGPT']);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<TemplateRunResult | null>(null);
  const [runError, setRunError] = useState('');

  const [addingPrompt, setAddingPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !accessToken) { router.replace('/login'); return; }
    const wsId = localStorage.getItem(WORKSPACE_KEY);
    if (!wsId) { router.replace('/onboarding'); return; }
    Promise.all([
      getOnboardingConfig(accessToken, wsId),
      listWorkspaces(accessToken),
    ]).then(([config, wsList]) => {
      if (!config.onboardingComplete) { router.replace('/onboarding'); return; }
      setWorkspaceId(wsId);
      setWorkspaces(wsList);
      setActiveWorkspace(wsList.find((w) => w.id === wsId) ?? wsList[0] ?? null);
      setTopics(config.topics);
      setCompetitors(config.competitors);
      setBrandName(config.brand?.name ?? null);
      if (config.topics.length > 0) setRunTopicId(config.topics[0].id);
    }).finally(() => setChecking(false));
  }, [accessToken, loading, router, user]);

  useEffect(() => {
    if (!workspaceId || !accessToken) return;
    setDataLoading(true);
    listPrompts(accessToken, workspaceId)
      .then(async (results) => {
        if (results.length === 0) {
          // No prompts yet — auto-generate on first load
          setGenerating(true);
          try {
            const generated = await generatePrompts(accessToken, workspaceId);
            setPrompts(generated);
          } catch (err) {
            setPageError(err instanceof Error ? err.message : 'Failed to generate templates');
          } finally {
            setGenerating(false);
          }
        } else {
          setPrompts(results);
        }
      })
      .catch((err) => setPageError(err instanceof Error ? err.message : 'Failed to load templates'))
      .finally(() => setDataLoading(false));
  }, [workspaceId, accessToken]);

  useEffect(() => {
    setRunResult(null);
    setRunError('');
    if (!selectedId) return;
    const tpl = prompts.find((p) => p.id === selectedId);
    if (!tpl) return;
    const vars = detectVars(tpl.template);
    const customs: Record<string, string> = {};
    for (const v of vars) {
      if (!['topic', 'brand', 'competitor', 'year'].includes(v)) customs[v] = '';
    }
    setRunCustomVars(customs);
    if (tpl.template.includes('{competitor}') && competitors.length > 0) {
      setRunCompetitor(competitors[0].domain);
    }
  }, [selectedId, prompts, competitors]);

  const selectedTemplate = prompts.find((p) => p.id === selectedId) ?? null;
  const templateVars = useMemo(
    () => (selectedTemplate ? detectVars(selectedTemplate.template) : []),
    [selectedTemplate],
  );

  const previewQuery = useMemo(() => {
    if (!selectedTemplate) return '';
    const topic = topics.find((t) => t.id === runTopicId)?.name;
    return buildPreview(
      selectedTemplate.template, topic, brandName ?? undefined,
      runCompetitor || undefined, runCustomVars,
    );
  }, [selectedTemplate, runTopicId, brandName, runCompetitor, runCustomVars, topics]);

  const filteredPrompts = useMemo(
    () => prompts.filter((p) => {
      const matchSearch = !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || p.template.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    }),
    [prompts, search, catFilter],
  );

  function toggleEngine(engine: string) {
    setRunEngines((prev) =>
      prev.includes(engine)
        ? prev.length > 1 ? prev.filter((e) => e !== engine) : prev
        : [...prev, engine],
    );
  }

  async function handleRun() {
    if (!workspaceId || !accessToken || !selectedId) return;
    setRunning(true);
    setRunError('');
    setRunResult(null);
    try {
      const variables: Record<string, string> = { ...runCustomVars };
      if (runCompetitor) variables.competitor = runCompetitor;
      const result = await runPromptTemplate(accessToken, selectedId, {
        workspaceId,
        topicId: runTopicId || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        engines: runEngines,
      });
      setRunResult(result);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleAddPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !accessToken) return;
    setAddBusy(true);
    try {
      const p = await createPrompt(accessToken, {
        workspaceId, name: newName, template: newTemplate, category: newCategory,
      });
      setPrompts((prev) => [p, ...prev]);
      setNewName(''); setNewTemplate(''); setNewCategory('custom');
      setAddingPrompt(false);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setAddBusy(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    if (!accessToken || !workspaceId) return;
    try {
      await deletePrompt(accessToken, id, workspaceId);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function switchWorkspace(ws: WorkspaceSummary) {
    localStorage.setItem(WORKSPACE_KEY, ws.id);
    setActiveWorkspace(ws);
    setWsDropdownOpen(false);
    router.refresh();
  }

  function goNewWorkspace() {
    setWsDropdownOpen(false);
    localStorage.removeItem(WORKSPACE_KEY);
    router.push('/onboarding?new=1');
  }

  if (loading || checking || !user) return null;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-content queries-page">
          <div className="page-header">
            <h1>Prompt Library</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Run templates against your topics and AI engines &mdash; each run is tracked as a citation query
            </p>
          </div>

          {pageError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
              borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {pageError}
              <button onClick={() => setPageError('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className="queries-toolbar">
            <div className="queries-toolbar-left">
              <input className="queries-search" placeholder="Search templates&hellip;"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="cat-pills">
                <button className={`cat-pill${!catFilter ? ' active' : ''}`} onClick={() => setCatFilter('')}>All</button>
                {CATEGORIES.map((c) => (
                  <button key={c} className={`cat-pill${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => setAddingPrompt((v) => !v)}>
              <Plus size={15} />New template
            </button>
            <button
              className="btn-outline"
              disabled={generating || !workspaceId}
              onClick={async () => {
                if (!workspaceId || !accessToken) return;
                setGenerating(true);
                setPageError('');
                try {
                  setPrompts(await generatePrompts(accessToken, workspaceId));
                } catch (err) {
                  setPageError(err instanceof Error ? err.message : 'Generation failed');
                } finally {
                  setGenerating(false);
                }
              }}
            >
              <Sparkles size={14} />{generating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>

          {addingPrompt && (
            <form className="add-prompt-form" onSubmit={handleAddPrompt}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>New prompt template</div>
              <div className="add-prompt-row">
                <div style={{ flex: 1 }}>
                  <div className="run-field-label">Name</div>
                  <input required placeholder="e.g. Best Platforms" value={newName}
                    onChange={(e) => setNewName(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="run-field-label">Category</div>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%' }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="run-field-label">
                  Template &mdash; use{' '}
                  <span className="template-var topic">&#123;topic&#125;</span>{' '}
                  <span className="template-var brand">&#123;brand&#125;</span>{' '}
                  <span className="template-var competitor">&#123;competitor&#125;</span>{' '}
                  <span className="template-var year">&#123;year&#125;</span>
                </div>
                <input required placeholder="e.g. best {topic} tools in {year}" value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button type="submit" className="btn-primary" disabled={addBusy}>
                  {addBusy ? 'Saving\u2026' : 'Save template'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setAddingPrompt(false)}>Cancel</button>
              </div>
            </form>
          )}

          {dataLoading || generating ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', padding: '2rem 0' }}>
              {generating ? 'Generating AI prompts for your workspace…' : 'Loading templates…'}
            </div>
          ) : (
            <div className="prompts-layout">
              <div className="prompts-sidebar">
                {filteredPrompts.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No templates found. Use &ldquo;Generate with AI&rdquo; to create prompts.</div>
                ) : filteredPrompts.map((p) => (
                  <div key={p.id}
                    className={`template-list-item${selectedId === p.id ? ' active' : ''}`}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}>
                    <div className="template-card-header">
                      <span className="template-name">{p.name}</span>
                      {p.isSystem
                        ? <span className="prompt-system-badge">system</span>
                        : (
                          <button title="Delete"
                            onClick={(e) => { e.stopPropagation(); handleDeletePrompt(p.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}>
                            <Trash2 size={13} />
                          </button>
                        )
                      }
                    </div>
                    <div className="template-text"><TemplateText template={p.template} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span className={`cat-badge ${p.category}`}>{p.category}</span>
                      <button className={`btn-run${selectedId === p.id ? ' selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(selectedId === p.id ? null : p.id); }}>
                        <Play size={11} />{selectedId === p.id ? 'Close' : 'Run'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate ? (
                <div className="run-panel">
                  <div className="run-panel-header">
                    <h3>
                      <Bot size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6, color: 'var(--primary)' }} />
                      {selectedTemplate.name}
                    </h3>
                    <button onClick={() => setSelectedId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {templateVars.includes('topic') && (
                      <div>
                        <div className="run-field-label">
                          Topic <span className="template-var topic" style={{ marginLeft: 4 }}>&#123;topic&#125;</span>
                        </div>
                        {topics.length === 0
                          ? <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No topics configured.</p>
                          : (
                            <select className="run-select" value={runTopicId} onChange={(e) => setRunTopicId(e.target.value)}>
                              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )
                        }
                      </div>
                    )}
                    {templateVars.includes('competitor') && (
                      <div>
                        <div className="run-field-label">
                          Competitor <span className="template-var competitor" style={{ marginLeft: 4 }}>&#123;competitor&#125;</span>
                        </div>
                        {competitors.length > 0
                          ? (
                            <select className="run-select" value={runCompetitor} onChange={(e) => setRunCompetitor(e.target.value)}>
                              {competitors.map((c) => <option key={c.id} value={c.domain}>{c.name ?? c.domain}</option>)}
                            </select>
                          )
                          : (
                            <input className="run-select" placeholder="competitor domain"
                              value={runCompetitor} onChange={(e) => setRunCompetitor(e.target.value)} />
                          )
                        }
                      </div>
                    )}
                    {Object.keys(runCustomVars).map((varName) => (
                      <div key={varName}>
                        <div className="run-field-label">
                          <span className="template-var custom">&#123;{varName}&#125;</span>
                        </div>
                        <input className="run-select" placeholder={`Enter ${varName}`}
                          value={runCustomVars[varName]}
                          onChange={(e) => setRunCustomVars((prev) => ({ ...prev, [varName]: e.target.value }))} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="run-field-label">Query preview</div>
                    <div className="run-preview">&ldquo;{previewQuery}&rdquo;</div>
                  </div>

                  <div>
                    <div className="run-field-label">AI Engines</div>
                    <div className="engine-grid">
                      {ENGINES.map((engine) => (
                        <button key={engine}
                          className={`engine-toggle${runEngines.includes(engine) ? ' active' : ''}`}
                          onClick={() => toggleEngine(engine)}>
                          <Bot size={13} />{ENGINE_LABELS[engine]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="btn-primary" disabled={running || runEngines.length === 0}
                    onClick={handleRun} style={{ alignSelf: 'flex-start' }}>
                    {running
                      ? <><Zap size={14} />Running&hellip;</>
                      : <><Play size={14} />Run on {runEngines.length} engine{runEngines.length !== 1 ? 's' : ''}</>
                    }
                  </button>

                  {runError && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                      borderRadius: 'var(--radius)', padding: '0.65rem 0.85rem', fontSize: '0.82rem',
                    }}>
                      {runError}
                    </div>
                  )}

                  {runResult && (
                    <div className="run-results">
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Results for &ldquo;{runResult.queryText}&rdquo;
                      </div>
                      {runResult.results.map((r) => (
                        <div key={r.runId} className="result-engine-block">
                          <div className="result-engine-header">
                            <Bot size={15} style={{ color: 'var(--primary)' }} />
                            {ENGINE_LABELS[r.engine] ?? r.engine}
                            <span className="result-latency"><Zap size={10} /> {r.latencyMs}ms</span>
                          </div>
                          <div className="result-response">{r.responseText}</div>
                          {r.citations.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.35rem' }}>
                                Citations
                              </div>
                              <div className="citation-list">
                                {r.citations.map((url, i) => {
                                  let host = url;
                                  try { host = new URL(url).hostname; } catch { /* keep original */ }
                                  return <span key={i} className="citation-pill">{host}</span>;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="run-panel run-panel-empty">
                  <Play size={36} style={{ color: 'var(--primary)', opacity: 0.35 }} />
                  <p style={{ fontWeight: 600, marginTop: '0.75rem', color: 'var(--text)' }}>Select a template to run it</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Pick any template from the list, configure variables and engines, then run against live AI
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
