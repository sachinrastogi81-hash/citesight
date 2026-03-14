'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSearch,
  TrendingUp,
  Target,
  MessageSquareQuote,
  CheckCircle2,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { Sidebar } from '../../components/Sidebar';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  getOnboardingConfig,
  listWorkspaces,
  listResearchPrompts,
  listResearchTopics,
  type WorkspaceSummary,
  type ResearchPrompt,
  type ResearchTopic,
} from '../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';



const quickActions = [
  { title: 'Analyze Content', desc: 'Run AEO analysis on your pages', icon: FileSearch, variant: 'purple', cta: 'New Analysis' },
  { title: 'Target Questions', desc: 'Find questions to optimize for', icon: Target, variant: 'blue', cta: 'Discover' },
  { title: 'Track Citations', desc: 'Monitor AI engine mentions', icon: MessageSquareQuote, variant: 'indigo', cta: 'View Report' },
];

const TYPE_LABEL: Record<string, string> = {
  HOW_TO: 'How To',
  COMPARISON: 'Comparison',
  INFORMATIONAL: 'Informational',
  CATEGORY_RELATED: 'Category',
  PROBLEM_SOLVING: 'Problem Solving',
  TRANSACTIONAL: 'Transactional',
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const { user, loading, logout, accessToken } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  // Real data
  const [totalPrompts, setTotalPrompts] = useState<number | null>(null);
  const [computedPrompts, setComputedPrompts] = useState<ResearchPrompt[]>([]);
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !accessToken) {
      router.replace('/login');
      return;
    }
    const workspaceId = localStorage.getItem(WORKSPACE_KEY);
    if (!workspaceId) {
      router.replace('/onboarding');
      return;
    }

    Promise.all([
      getOnboardingConfig(accessToken, workspaceId),
      listWorkspaces(accessToken),
    ]).then(([config, wsList]) => {
      if (!config.onboardingComplete) {
        router.replace('/onboarding');
        return;
      }
      setWorkspaces(wsList);
      const active = wsList.find((w) => w.id === workspaceId) ?? wsList[0] ?? null;
      setActiveWorkspace(active);

      // Load real dashboard data
      setDataLoading(true);
      Promise.all([
        listResearchPrompts(accessToken, { workspaceId, limit: 200 }),
        listResearchTopics(accessToken, workspaceId),
      ]).then(([promptsPage, topicList]) => {
        setTotalPrompts(promptsPage.total);
        const computed = promptsPage.data
          .filter((p) => p.metricsComputed && p.metricsComputedAt)
          .sort((a, b) => new Date(b.metricsComputedAt!).getTime() - new Date(a.metricsComputedAt!).getTime());
        setComputedPrompts(computed);
        setTopics(topicList);
      }).catch(() => {}).finally(() => setDataLoading(false));
    }).finally(() => setChecking(false));
  }, [accessToken, loading, router, user]);

  if (loading || checking || !user) return null;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* Main content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="page-header">
            <h1>Welcome back, {user.name}!</h1>
            <p>
              {activeWorkspace
                ? <>Viewing <strong>{activeWorkspace.name}</strong> &mdash; AEO performance overview.</>
                : "Here's your AEO performance overview."}
            </p>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <p>Research Prompts</p>
                <div className="stat-value">{totalPrompts === null ? '—' : totalPrompts}</div>
                <div className="stat-change" style={{ color: 'var(--muted)' }}>
                  <BookOpen size={13} />
                  {topics.length} topic{topics.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="stat-icon purple"><Target /></div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Computed Prompts</p>
                <div className="stat-value">{computedPrompts.length}</div>
                <div className="stat-change" style={{ color: 'var(--muted)' }}>
                  <CheckCircle2 size={13} />
                  {totalPrompts ? `of ${totalPrompts} total` : 'no data'}
                </div>
              </div>
              <div className="stat-icon green"><CheckCircle2 /></div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Avg Mention Rate</p>
                <div className="stat-value">
                  {computedPrompts.length === 0 ? '—' : pct(computedPrompts.reduce((s, p) => s + p.mentionRate, 0) / computedPrompts.length)}
                </div>
                <div className="stat-change" style={{ color: 'var(--muted)' }}>
                  <MessageSquareQuote size={13} />
                  brand mentioned by AI
                </div>
              </div>
              <div className="stat-icon blue"><MessageSquareQuote /></div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Avg Citation Rate</p>
                <div className="stat-value">
                  {computedPrompts.length === 0 ? '—' : pct(computedPrompts.reduce((s, p) => s + p.citationRate, 0) / computedPrompts.length)}
                </div>
                <div className="stat-change" style={{ color: 'var(--muted)' }}>
                  <TrendingUp size={13} />
                  domain cited by AI
                </div>
              </div>
              <div className="stat-icon indigo"><TrendingUp /></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-title">Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {quickActions.map((action) => (
              <div key={action.title} className="card" style={{ cursor: 'pointer' }}>
                <div className={`stat-icon ${action.variant}`} style={{ marginBottom: '1rem' }}>
                  <action.icon />
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{action.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>{action.desc}</p>
                <button className="btn-outline" style={{ width: '100%' }}>
                  <ArrowUpRight size={15} />
                  {action.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Recently computed prompts */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem' }}>Recently Computed Prompts</h2>
                <Link href="/dashboard/prompt-research" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', border: '1px solid var(--line)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', textDecoration: 'none' }}>View all</Link>
              </div>
              {dataLoading ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>
              ) : computedPrompts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>No prompts computed yet.</p>
                  <Link href="/dashboard/prompt-research" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Open Prompt Research →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {computedPrompts.slice(0, 5).map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.promptText}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 4, background: p.topic?.color ? p.topic.color + '22' : 'var(--bg-alt)', color: p.topic?.color ?? 'var(--muted)' }}>
                            {p.topic?.name ?? TYPE_LABEL[p.promptType] ?? p.promptType}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{timeAgo(p.metricsComputedAt!)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                        <div style={{ fontSize: '0.78rem', color: p.mentionRate > 0.1 ? 'var(--success)' : 'var(--muted)' }}>
                          <span style={{ fontWeight: 600 }}>{pct(p.mentionRate)}</span> mention
                        </div>
                        <div style={{ fontSize: '0.78rem', color: p.citationRate > 0.05 ? 'var(--primary)' : 'var(--muted)' }}>
                          <span style={{ fontWeight: 600 }}>{pct(p.citationRate)}</span> citation
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Topics breakdown */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem' }}>Topics Breakdown</h2>
                <BookOpen size={18} style={{ color: 'var(--muted)' }} />
              </div>
              {dataLoading ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>
              ) : topics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>No topics yet.</p>
                  <Link href="/dashboard/prompt-research" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Discover Prompts →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {topics.slice(0, 7).map((topic) => {
                    const topicPrompts = computedPrompts.filter((p) => p.topicId === topic.id);
                    const totalInTopic = (totalPrompts !== null && topics.length > 0)
                      ? computedPrompts.filter((p) => p.topicId === topic.id).length
                      : 0;
                    const avgMention = topicPrompts.length > 0
                      ? topicPrompts.reduce((s, p) => s + p.mentionRate, 0) / topicPrompts.length
                      : null;
                    return (
                      <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: topic.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.name}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          {avgMention !== null && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: avgMention > 0.1 ? 'var(--success)' : 'var(--muted)' }}>{pct(avgMention)}</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', minWidth: 60, textAlign: 'right' }}>{totalInTopic} computed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
