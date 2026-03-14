'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, BarChart2, Globe, MessageSquare, X, RefreshCw, Trash2, Info, CheckCircle, XCircle } from 'lucide-react';
import { Sidebar } from '../../../components/Sidebar';
import { useAuth } from '../../../lib/auth-context';
import {
  listIntegrations,
  getIntegration,
  startOAuth,
  connectWordPress,
  connectSlack,
  streamSync,
  disconnectIntegration,
  selectProperty,
  testWpConnection,
  syncWpPosts,
  IntegrationSummary,
  IntegrationDetail,
  IntegrationType,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

// ── Static metadata ───────────────────────────────────────────────

type AuthType = 'oauth' | 'form';
type IconColor = 'blue' | 'orange' | 'purple' | 'green';

interface IntegrationMeta {
  type: IntegrationType;
  name: string;
  authType: AuthType;
  Icon: React.ElementType;
  color: IconColor;
  description: string;
}

const INTEGRATIONS_META: IntegrationMeta[] = [
  {
    type: 'GOOGLE_SEARCH_CONSOLE',
    name: 'Google Search Console',
    authType: 'oauth',
    Icon: Search,
    color: 'blue',
    description: 'Import keyword impressions, clicks, and position data.',
  },
  {
    type: 'GOOGLE_ANALYTICS',
    name: 'Google Analytics',
    authType: 'oauth',
    Icon: BarChart2,
    color: 'orange',
    description: 'Connect GA4 for traffic and engagement metrics.',
  },
  {
    type: 'WORDPRESS',
    name: 'WordPress',
    authType: 'form',
    Icon: Globe,
    color: 'purple',
    description: 'Publish AI-generated content directly to your site.',
  },
  {
    type: 'SLACK',
    name: 'Slack',
    authType: 'form',
    Icon: MessageSquare,
    color: 'green',
    description: 'Receive alerts and reports in your Slack workspace.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function metaFor(type: IntegrationType): IntegrationMeta {
  return INTEGRATIONS_META.find((m) => m.type === type)!;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'CONNECTED'
      ? 'status-connected'
      : status === 'ERROR'
      ? 'status-error'
      : 'status-disconnected';
  return (
    <span className={`integration-status-badge ${cls}`}>
      {status === 'CONNECTED' ? (
        <CheckCircle size={11} />
      ) : status === 'ERROR' ? (
        <XCircle size={11} />
      ) : null}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Progress state ─────────────────────────────────────────────────

interface SyncStep {
  label: string;
  rows?: number;
  status: 'pending' | 'running' | 'done';
}

interface SyncProgressState {
  steps: SyncStep[];
}

const SYNC_STEP_LABELS: Record<number, string> = {
  0: 'Refreshing property list',
  1: 'Fetching query + page data',
  2: 'Fetching page-level data',
  3: 'Fetching query trend data',
  4: 'Fetching device breakdown',
  5: 'Fetching country breakdown',
  6: 'Saving to database',
};
const TOTAL_STEPS = Object.keys(SYNC_STEP_LABELS).length;

function initSteps(): SyncStep[] {
  return Object.values(SYNC_STEP_LABELS).map((label) => ({ label, status: 'pending' }));
}

function SyncSteps({ steps }: { steps: SyncStep[] }) {
  return (
    <div className="sync-progress">
      {steps.map((s, i) => (
        <div key={i} className={`sync-progress-step ${s.status}`}>
          <span className="sync-step-icon">
            {s.status === 'done' ? '✓' : s.status === 'running' ? (
              <RefreshCw size={11} className="spin" />
            ) : '·'}
          </span>
          <span>{s.label}</span>
          {s.status === 'done' && s.rows !== undefined && (
            <span className="sync-step-rows">{s.rows.toLocaleString()} rows</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { accessToken: token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;

  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgressState>>({});
  const [drawerItem, setDrawerItem] = useState<IntegrationDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectingProperty, setSelectingProperty] = useState<string | null>(null);
  const [connectModal, setConnectModal] = useState<'WORDPRESS' | 'SLACK' | null>(null);
  const [wpForm, setWpForm] = useState({ siteUrl: '', username: '', appPassword: '' });
  const [slackForm, setSlackForm] = useState({ webhookUrl: '' });
  const [formBusy, setFormBusy] = useState(false);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpSyncing, setWpSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadIntegrations = useCallback(async () => {
    if (!token || !workspaceId) return;
    try {
      const data = await listIntegrations(token, workspaceId);
      setIntegrations(data);
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to load integrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId, showToast]);

  // On mount: load integrations + check ?connected= query param
  useEffect(() => {
    loadIntegrations();
    const connected = searchParams.get('connected');
    const errParam = searchParams.get('error');
    if (connected) {
      const meta = INTEGRATIONS_META.find((m) => m.type === connected);
      showToast(`${meta?.name ?? connected} connected successfully!`);
      router.replace('/dashboard/integrations');
    }
    if (errParam) {
      showToast(`OAuth error: ${errParam}`, 'error');
      router.replace('/dashboard/integrations');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Open detail drawer ────────────────────────────────────────

  async function openDrawer(id: string) {
    if (!token || !workspaceId) return;
    setDrawerLoading(true);
    setDrawerItem(null);
    try {
      const detail = await getIntegration(token, id, workspaceId);
      setDrawerItem(detail);
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to load details', 'error');
    } finally {
      setDrawerLoading(false);
    }
  }

  // ── Select active property ─────────────────────────────────
  async function handleSelectProperty(integrationId: string, propertyId: string) {
    if (!token || !workspaceId) return;
    setSelectingProperty(propertyId);
    try {
      await selectProperty(token, integrationId, propertyId, workspaceId);
      await openDrawer(integrationId);
      showToast('Property selected — sync to import data');
    } catch (e: unknown) {
      showToast((e as Error).message || 'Property selection failed', 'error');
    } finally {
      setSelectingProperty(null);
    }
  }

  // ── Sync ──────────────────────────────────────────────

  async function handleSync(id: string) {
    if (!token || !workspaceId) return;
    setSyncing((prev) => new Set(prev).add(id));
    setSyncProgress((prev) => ({ ...prev, [id]: { steps: initSteps() } }));
    let syncResult: Record<string, unknown> | undefined;
    try {
      await streamSync(token, id, workspaceId, (eventName, data) => {
        if (eventName === 'step_start') {
          const idx = data.index as number;
          setSyncProgress((prev) => {
            const steps = [...(prev[id]?.steps ?? initSteps())];
            steps[idx] = { ...steps[idx], status: 'running' };
            return { ...prev, [id]: { steps } };
          });
        } else if (eventName === 'step_done') {
          const idx = data.index as number;
          const rows = data.rows as number | undefined;
          setSyncProgress((prev) => {
            const steps = [...(prev[id]?.steps ?? initSteps())];
            steps[idx] = { ...steps[idx], status: 'done', rows };
            return { ...prev, [id]: { steps } };
          });
        } else if (eventName === 'done') {
          syncResult = data;
        }
      });
      if (syncResult) {
        const r = syncResult as { queries_synced?: number; pages_synced?: number; query_dates_synced?: number };
        showToast(
          `Sync complete — ${(r.queries_synced ?? 0).toLocaleString()} queries, ` +
          `${(r.pages_synced ?? 0).toLocaleString()} pages, ` +
          `${(r.query_dates_synced ?? 0).toLocaleString()} trends`,
        );
      } else {
        showToast('Sync completed');
      }
      setSyncProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
      await loadIntegrations();
      if (drawerItem?.id === id) await openDrawer(id);
    } catch (e: unknown) {
      showToast((e as Error).message || 'Sync failed', 'error');
      setSyncProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } finally {
      setSyncing((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  // ── Disconnect ────────────────────────────────────────────────

  async function handleDisconnect(id: string, name: string) {
    if (!confirm(`Disconnect ${name}? This will remove stored credentials.`)) return;
    if (!token || !workspaceId) return;
    try {
      await disconnectIntegration(token, id, workspaceId);
      showToast(`${name} disconnected`);
      setDrawerItem(null);
      await loadIntegrations();
    } catch (e: unknown) {
      showToast((e as Error).message || 'Disconnect failed', 'error');
    }
  }

  // ── Connect OAuth ─────────────────────────────────────────────

  async function handleOAuthConnect(type: IntegrationType) {
    if (!token || !workspaceId) return;
    try {
      const { authUrl } = await startOAuth(token, workspaceId, type);
      window.location.href = authUrl;
    } catch (e: unknown) {
      showToast((e as Error).message || 'OAuth start failed', 'error');
    }
  }

  // ── Connect form (WordPress / Slack) ─────────────────────────

  async function handleFormConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !connectModal) return;
    setFormBusy(true);
    try {
      if (connectModal === 'WORDPRESS') {
        await connectWordPress(token, workspaceId, wpForm.siteUrl, wpForm.username, wpForm.appPassword);
        showToast('WordPress connected');
      } else {
        await connectSlack(token, workspaceId, slackForm.webhookUrl);
        showToast('Slack connected');
      }
      setConnectModal(null);
      setWpForm({ siteUrl: '', username: '', appPassword: '' });
      setSlackForm({ webhookUrl: '' });
      await loadIntegrations();
    } catch (e: unknown) {
      showToast((e as Error).message || 'Connection failed', 'error');
    } finally {
      setFormBusy(false);
    }
  }

  // ── WordPress helpers ─────────────────────────────────────────

  async function handleWpTest(id: string) {
    if (!token || !workspaceId) return;
    setWpTesting(true);
    try {
      const r = await testWpConnection(token, id, workspaceId);
      showToast(`Connection OK — logged in as "${r.user.name}"`);
    } catch (e: unknown) {
      showToast((e as Error).message || 'Connection test failed', 'error');
    } finally {
      setWpTesting(false);
    }
  }

  async function handleWpSync(id: string) {
    if (!token || !workspaceId) return;
    setWpSyncing(true);
    try {
      const r = await syncWpPosts(token, id, workspaceId);
      showToast(`Synced ${r.posts_synced} posts from WordPress`);
      await loadIntegrations();
      if (drawerItem?.id === id) await openDrawer(id);
    } catch (e: unknown) {
      showToast((e as Error).message || 'WP sync failed', 'error');
    } finally {
      setWpSyncing(false);
    }
  }

  // ── Connect button routing ─────────────────────────────────────

  function handleConnect(meta: IntegrationMeta) {
    if (meta.authType === 'oauth') {
      handleOAuthConnect(meta.type);
    } else {
      setConnectModal(meta.type as 'WORDPRESS' | 'SLACK');
    }
  }

  // ── Derived lists ──────────────────────────────────────────────

  const connected = integrations.filter((i) => i.status === 'CONNECTED' || i.status === 'ERROR');
  const available = INTEGRATIONS_META.filter(
    (m) => !integrations.find((i) => i.type === m.type && (i.status === 'CONNECTED' || i.status === 'ERROR')),
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-content">

          {/* Page header */}
          <div className="page-header">
            <div>
              <h1>Integrations</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Connect your data sources and publishing channels.
              </p>
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--muted)', marginTop: '2rem' }}>Loading integrations…</p>
          ) : (
            <>
              {/* Connected */}
              {connected.length > 0 && (
                <>
                  <p className="integration-section-title">Connected</p>
                  <div className="integrations-grid">
                    {connected.map((intg) => {
                      const meta = metaFor(intg.type);
                      const { Icon } = meta;
                      const isSyncing = intg.id ? syncing.has(intg.id) : false;
                      return (
                        <div key={intg.type} className="integration-card">
                          <div className="integration-card-header">
                            <div className={`integration-icon ${meta.color}`}>
                              <Icon size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="integration-card-name">{meta.name}</div>
                              {intg.accountEmail && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                  {intg.accountEmail}
                                </div>
                              )}
                            </div>
                            <StatusBadge status={intg.status} />
                          </div>
                          {intg.lastSyncAt && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                              Last synced: {new Date(intg.lastSyncAt).toLocaleDateString()}
                            </div>
                          )}
                          {syncProgress[intg.id!] && <SyncSteps steps={syncProgress[intg.id!].steps} />}
                          <div className="integration-card-actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              disabled={isSyncing || !intg.id}
                              onClick={() => intg.id && handleSync(intg.id)}
                            >
                              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                              {isSyncing ? 'Syncing…' : 'Sync'}
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => intg.id && openDrawer(intg.id)}
                              disabled={!intg.id}
                            >
                              <Info size={13} />
                              Details
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => intg.id && handleDisconnect(intg.id, meta.name)}
                              disabled={!intg.id}
                            >
                              <Trash2 size={13} />
                              Disconnect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Available */}
              {available.length > 0 && (
                <>
                  <p className="integration-section-title">Available</p>
                  <div className="integrations-grid">
                    {available.map((meta) => {
                      const { Icon } = meta;
                      return (
                        <div key={meta.type} className="integration-card">
                          <div className="integration-card-header">
                            <div className={`integration-icon ${meta.color}`}>
                              <Icon size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="integration-card-name">{meta.name}</div>
                            </div>
                            <StatusBadge status="DISCONNECTED" />
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                            {meta.description}
                          </p>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConnect(meta)}
                          >
                            Connect
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail drawer */}
      {(drawerItem || drawerLoading) && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerItem(null)} />
          <aside className="drawer">
            <div className="drawer-header">
              {drawerItem ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {(() => {
                      const meta = metaFor(drawerItem.type);
                      const { Icon } = meta;
                      return (
                        <>
                          <div className={`integration-icon ${meta.color}`} style={{ width: 32, height: 32 }}>
                            <Icon size={16} />
                          </div>
                          <span style={{ fontWeight: 700 }}>{meta.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <StatusBadge status={drawerItem.status} />
                </>
              ) : (
                <span style={{ color: 'var(--muted)' }}>Loading…</span>
              )}
              <button
                onClick={() => setDrawerItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {drawerLoading && (
              <div className="drawer-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                Loading details…
              </div>
            )}

            {drawerItem && !drawerLoading && (
              <>
                <div className="drawer-body">
                  {/* Account info */}
                  <div className="drawer-section">
                    <div className="drawer-section-label">Account</div>
                    <div className="drawer-row">
                      <span>Email</span>
                      <span style={{ color: 'var(--text-primary)' }}>{drawerItem.accountEmail ?? '—'}</span>
                    </div>
                    <div className="drawer-row">
                      <span>Last sync</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {drawerItem.lastSyncAt ? new Date(drawerItem.lastSyncAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    {drawerItem.tokenExpiry && (
                      <div className="drawer-row">
                        <span>Token expires</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {new Date(drawerItem.tokenExpiry).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* GSC Properties */}
                  {drawerItem.type === 'GOOGLE_SEARCH_CONSOLE' && (                    <div className="drawer-section">
                      <div className="drawer-section-label">Properties</div>
                      {drawerItem.properties.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.25rem 0' }}>
                          No properties found. Click Sync to refresh.
                        </p>
                      ) : (
                        drawerItem.properties.map((p) => {
                          const isBusy = selectingProperty === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() =>
                                !p.selected && !selectingProperty && drawerItem.id &&
                                handleSelectProperty(drawerItem.id, p.id)
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.5rem 0.25rem',
                                borderBottom: '1px solid var(--border)',
                                cursor: p.selected ? 'default' : 'pointer',
                                opacity: isBusy ? 0.5 : 1,
                                transition: 'background 0.15s',
                              }}
                            >
                              {/* Radio indicator */}
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  border: `2px solid ${p.selected ? '#6366f1' : 'var(--muted)'}`,
                                  background: p.selected ? '#6366f1' : 'transparent',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {p.selected && (
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: p.selected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.propertyName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.propertyUrl}
                                </div>
                              </div>
                              {p.selected && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366f1', flexShrink: 0 }}>
                                  Active
                                </span>
                              )}
                              {isBusy && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', flexShrink: 0 }}>
                                  Saving…
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                      {drawerItem.properties.some((p) => p.selected) ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                          Click Sync to import search query data from the active property.
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                          Select a property above, then sync to import its search data.
                        </p>
                      )}
                    </div>
                  )}

                  {/* WordPress section */}
                  {drawerItem.type === 'WORDPRESS' && (
                    <div className="drawer-section">
                      <div className="drawer-section-label">WordPress</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={wpTesting || !drawerItem.id}
                          onClick={() => drawerItem.id && handleWpTest(drawerItem.id)}
                        >
                          <RefreshCw size={12} className={wpTesting ? 'spin' : ''} />
                          {wpTesting ? 'Testing…' : 'Test Connection'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={wpSyncing || !drawerItem.id}
                          onClick={() => drawerItem.id && handleWpSync(drawerItem.id)}
                        >
                          <RefreshCw size={12} className={wpSyncing ? 'spin' : ''} />
                          {wpSyncing ? 'Syncing…' : 'Sync Posts'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => router.push('/dashboard/wordpress-posts')}
                        >
                          View Posts →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sync logs */}
                  {drawerItem.syncLogs.length > 0 && (
                    <div className="drawer-section">
                      <div className="drawer-section-label">Recent syncs</div>
                      {drawerItem.syncLogs.map((log) => (
                        <div key={log.id} className="drawer-row" style={{ flexDirection: 'column', gap: '0.1rem', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: log.status === 'success' ? '#15803d' : '#dc2626',
                              }}
                            >
                              {log.status}
                            </span>
                          </div>
                          {log.recordsSynced !== null && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {log.recordsSynced} records
                            </span>
                          )}
                          {log.error && (
                            <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{log.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="drawer-footer">
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={!drawerItem.id || syncing.has(drawerItem.id!)}
                    onClick={() => drawerItem.id && handleSync(drawerItem.id)}
                  >
                    <RefreshCw size={13} className={drawerItem.id && syncing.has(drawerItem.id) ? 'spin' : ''} />
                    Sync Now
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      drawerItem.id &&
                      handleDisconnect(drawerItem.id, metaFor(drawerItem.type).name)
                    }
                    disabled={!drawerItem.id}
                  >
                    <Trash2 size={13} />
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {/* Connect modal — WordPress */}
      {connectModal === 'WORDPRESS' && (
        <div className="connect-modal-overlay" onClick={() => setConnectModal(null)}>
          <div className="connect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="connect-modal-title">Connect WordPress</div>
            <form onSubmit={handleFormConnect} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Site URL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://yoursite.com"
                  required
                  value={wpForm.siteUrl}
                  onChange={(e) => setWpForm((f) => ({ ...f, siteUrl: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="WordPress username"
                  required
                  value={wpForm.username}
                  onChange={(e) => setWpForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Application Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  required
                  value={wpForm.appPassword}
                  onChange={(e) => setWpForm((f) => ({ ...f, appPassword: e.target.value }))}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Generate this in WP Admin → Users → Profile → Application Passwords.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setConnectModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formBusy}>
                  {formBusy ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect modal — Slack */}
      {connectModal === 'SLACK' && (
        <div className="connect-modal-overlay" onClick={() => setConnectModal(null)}>
          <div className="connect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="connect-modal-title">Connect Slack</div>
            <form onSubmit={handleFormConnect} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Incoming Webhook URL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  required
                  value={slackForm.webhookUrl}
                  onChange={(e) => setSlackForm({ webhookUrl: e.target.value })}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Create an Incoming Webhook in your Slack App settings.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setConnectModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formBusy}>
                  {formBusy ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
