'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  listPages,
  type ListPagesParams,
  type ListPagesResult,
  type OpportunityScore,
  type PageRow,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

type SortField = 'clicks' | 'impressions' | 'position';

const SCORE_LABELS: Record<OpportunityScore, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SCORE_CLASS: Record<OpportunityScore, string> = {
  high: 'score-high',
  medium: 'score-medium',
  low: 'score-low',
};

function OpportunityBadge({ score }: { score: OpportunityScore }) {
  return (
    <span className={`opportunity-badge ${SCORE_CLASS[score]}`}>
      {SCORE_LABELS[score]}
    </span>
  );
}

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: 'asc' | 'desc' }) {
  if (sortBy !== field) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
  return sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
}

export default function PagesPage() {
  const { accessToken: token, loading } = useAuth();
  const router = useRouter();
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;

  const [result, setResult] = useState<ListPagesResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const [sortBy, setSortBy] = useState<SortField>('impressions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterScore, setFilterScore] = useState<OpportunityScore | ''>('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    if (!token || !workspaceId) return;
    setFetching(true);
    setError('');
    try {
      const params: ListPagesParams = {
        workspaceId,
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
        ...(filterScore ? { opportunityScore: filterScore } : {}),
      };
      setResult(await listPages(token, params));
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load pages');
    } finally {
      setFetching(false);
    }
  }, [token, workspaceId, sortBy, sortDir, filterScore, page]);

  useEffect(() => {
    if (loading) return;
    if (!token) { router.replace('/login'); return; }
    if (!workspaceId) { router.replace('/onboarding'); return; }
    void load();
  }, [loading, token, workspaceId, load, router]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'position' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  const pages = result?.pages ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1>Pages</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Search performance for all indexed pages in the last 28 days.
              </p>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginLeft: 'auto' }}
              onClick={() => { setPage(1); void load(); }}
              disabled={fetching}
            >
              <RefreshCw size={13} className={fetching ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 'auto', fontSize: '0.85rem' }}
              value={filterScore}
              onChange={(e) => { setFilterScore(e.target.value as OpportunityScore | ''); setPage(1); }}
            >
              <option value="">All opportunities</option>
              <option value="high">High opportunity</option>
              <option value="medium">Medium opportunity</option>
              <option value="low">Low opportunity</option>
            </select>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          {/* Table */}
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Page URL
                  </th>
                  <th
                    style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                    onClick={() => handleSort('clicks')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Clicks <SortIcon field="clicks" sortBy={sortBy} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                    onClick={() => handleSort('impressions')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Impressions <SortIcon field="impressions" sortBy={sortBy} sortDir={sortDir} />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    CTR
                  </th>
                  <th
                    style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                    onClick={() => handleSort('position')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Avg. Position <SortIcon field="position" sortBy={sortBy} sortDir={sortDir} />
                    </span>
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Opportunity
                  </th>
                </tr>
              </thead>
              <tbody>
                {fetching && pages.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      <RefreshCw size={20} className="spin" style={{ marginBottom: '0.5rem' }} />
                      <div>Loading pages…</div>
                    </td>
                  </tr>
                ) : pages.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      No pages found. Run a GSC sync in Integrations to populate this table.
                    </td>
                  </tr>
                ) : (
                  pages.map((row: PageRow) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', maxWidth: '400px' }}>
                        <a
                          href={row.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-all' }}
                        >
                          {row.pageUrl}
                          <ExternalLink size={11} style={{ flexShrink: 0 }} />
                        </a>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                        {row.totalClicks.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                        {row.totalImpressions.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                        {(row.avgCtr * 100).toFixed(1)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                        {row.avgPosition.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem' }}>
                        <OpportunityBadge score={row.opportunityScore} />
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
              <span>{total.toLocaleString()} pages total</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span style={{ padding: '0.3rem 0.5rem', lineHeight: 1.8 }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

