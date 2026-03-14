'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Globe, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  listIntegrations,
  listWpPosts,
  syncWpPosts,
  type IntegrationSummary,
  type ListWpPostsResult,
  type WpPostRow,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';
const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = {
  publish: 'Published',
  draft: 'Draft',
  pending: 'Pending',
  private: 'Private',
  trash: 'Trash',
};

const STATUS_CLASS: Record<string, string> = {
  publish: 'wp-status-published',
  draft: 'wp-status-draft',
  pending: 'wp-status-pending',
  private: 'wp-status-private',
  trash: 'wp-status-trash',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`wp-status-badge ${STATUS_CLASS[status] ?? 'wp-status-draft'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function WpPostsPage() {
  const { accessToken: token, loading } = useAuth();
  const router = useRouter();
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;

  const [wpIntegration, setWpIntegration] = useState<IntegrationSummary | null | undefined>(undefined);
  const [result, setResult] = useState<ListWpPostsResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Find the WP integration
  useEffect(() => {
    if (!token || !workspaceId) return;
    listIntegrations(token, workspaceId)
      .then((integrations) => {
        const wp = integrations.find(
          (i) => i.type === 'WORDPRESS' && (i.status === 'CONNECTED' || i.status === 'ERROR'),
        ) ?? null;
        setWpIntegration(wp);
      })
      .catch(() => setWpIntegration(null));
  }, [token, workspaceId]);

  const load = useCallback(async () => {
    if (!token || !workspaceId || !wpIntegration?.id) return;
    setFetching(true);
    setError('');
    try {
      setResult(
        await listWpPosts(token, wpIntegration.id, workspaceId, {
          status: filterStatus || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load posts');
    } finally {
      setFetching(false);
    }
  }, [token, workspaceId, wpIntegration, filterStatus, page]);

  useEffect(() => {
    if (loading) return;
    if (!token) { router.replace('/login'); return; }
    if (!workspaceId) { router.replace('/onboarding'); return; }
  }, [loading, token, workspaceId, router]);

  useEffect(() => {
    if (wpIntegration !== undefined) void load();
  }, [wpIntegration, load]);

  async function handleSync() {
    if (!token || !workspaceId || !wpIntegration?.id) return;
    setSyncing(true);
    try {
      const r = await syncWpPosts(token, wpIntegration.id, workspaceId);
      showToast(`Synced ${r.posts_synced} posts from WordPress`);
      setPage(1);
      await load();
    } catch (e: unknown) {
      showToast((e as Error).message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const posts = result?.posts ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Not connected state ──────────────────────────────────────────
  if (wpIntegration === null) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="page-header">
              <h1>WordPress Posts</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)' }}>
              <Globe size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p style={{ marginBottom: '1rem' }}>No WordPress site connected.</p>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard/integrations')}>
                Connect WordPress
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-content">

          {/* Header */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1>WordPress Posts</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Posts synced from your connected WordPress site.
              </p>
            </div>
            <button
              className="btn btn-sm btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={handleSync}
              disabled={syncing || !wpIntegration?.id}
            >
              <RefreshCw size={13} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Posts'}
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 'auto', fontSize: '0.85rem' }}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              <option value="publish">Published</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="private">Private</option>
            </select>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Title
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Slug
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Published
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Modified
                  </th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {fetching && posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      <RefreshCw size={20} className="spin" style={{ marginBottom: '0.5rem' }} />
                      <div>Loading posts…</div>
                    </td>
                  </tr>
                ) : wpIntegration === undefined ? null : posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      No posts found. Click "Sync Posts" to import from WordPress.
                    </td>
                  </tr>
                ) : (
                  posts.map((post: WpPostRow) => (
                    <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', maxWidth: '340px' }}>
                        <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>{post.title}</span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--muted)', maxWidth: '200px' }}>
                        <span style={{ wordBreak: 'break-all' }}>/{post.slug}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem' }}>
                        <StatusBadge status={post.status} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {post.modifiedAt ? new Date(post.modifiedAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--muted)', display: 'inline-flex' }}
                          title="Open post"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              <span>{total.toLocaleString()} posts total</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span style={{ padding: '0.3rem 0.5rem', lineHeight: 1.8 }}>{page} / {totalPages}</span>
                <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
