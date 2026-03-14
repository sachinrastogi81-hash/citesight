'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { Sidebar } from '../../../components/Sidebar';
import {
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  type WorkspaceSummary,
} from '../../../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';



function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SettingsPage() {
  const { user, loading, logout, accessToken } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  // ── Rename form ──
  const [renameName, setRenameName] = useState('');
  const [renameSlug, setRenameSlug] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameSuccess, setRenameSuccess] = useState(false);

  // ── Delete confirmation ──
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !accessToken) { router.replace('/login'); return; }
    listWorkspaces(accessToken).then((wsList) => {
      setWorkspaces(wsList);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_KEY) : null;
      const wsId = (stored && wsList.find((w) => w.id === stored)) ? stored : wsList[0]?.id ?? null;
      setWorkspaceId(wsId);
      const active = wsList.find((w) => w.id === wsId) ?? wsList[0] ?? null;
      setActiveWorkspace(active);
      if (active) { setRenameName(active.name); setRenameSlug(active.slug); }
    }).finally(() => setChecking(false));
  }, [accessToken, loading, router, user]);

  function switchWorkspace(ws: WorkspaceSummary) {
    setWorkspaceId(ws.id);
    setActiveWorkspace(ws);
    localStorage.setItem(WORKSPACE_KEY, ws.id);
    setWsDropdownOpen(false);
    setRenameName(ws.name);
    setRenameSlug(ws.slug);
    setRenameError('');
    setRenameSuccess(false);
    setDeleteConfirm('');
    setDeleteError('');
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !accessToken) return;
    if (!renameName.trim()) { setRenameError('Name is required.'); return; }
    const slug = renameSlug.trim() || slugify(renameName);
    if (!/^[a-z0-9-]+$/.test(slug)) { setRenameError('Slug may only contain lowercase letters, numbers and hyphens.'); return; }
    setRenameBusy(true);
    setRenameError('');
    setRenameSuccess(false);
    try {
      const updated = await updateWorkspace(accessToken, workspaceId, { name: renameName.trim(), slug });
      setWorkspaces((prev) => prev.map((w) => w.id === workspaceId ? { ...w, ...updated } : w));
      setActiveWorkspace((prev) => prev ? { ...prev, ...updated } : prev);
      setRenameSlug(slug);
      setRenameSuccess(true);
      setTimeout(() => setRenameSuccess(false), 3000);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleDelete() {
    if (!workspaceId || !accessToken || !activeWorkspace) return;
    if (deleteConfirm !== activeWorkspace.name) {
      setDeleteError(`Type the workspace name "${activeWorkspace.name}" exactly to confirm.`);
      return;
    }
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteWorkspace(accessToken, workspaceId);
      // Switch to another workspace or go to onboarding
      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      if (remaining.length > 0) {
        const next = remaining[0];
        localStorage.setItem(WORKSPACE_KEY, next.id);
        setWorkspaces(remaining);
        switchWorkspace(next);
      } else {
        localStorage.removeItem(WORKSPACE_KEY);
        router.replace('/onboarding?new=1');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setDeleteBusy(false);
    }
  }

  if (checking || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  const isAdmin = activeWorkspace?.role === 'ADMIN';

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto', minWidth: 0 }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.25rem' }}>Settings</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Manage your workspace configuration.</p>
        </div>

        {!activeWorkspace ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No workspace selected.</div>
        ) : (
          <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Workspace Info ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Pencil size={16} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Rename Workspace</h2>
              </div>

              {!isAdmin && (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.83rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={14} />
                  Only ADMINs can rename or delete workspaces.
                </div>
              )}

              <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Workspace Name
                  </label>
                  <input
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="My Workspace"
                    disabled={!isAdmin || renameBusy}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Slug <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(URL-safe identifier)</span>
                  </label>
                  <input
                    value={renameSlug}
                    onChange={(e) => setRenameSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-workspace"
                    disabled={!isAdmin || renameBusy}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </div>

                {renameError && (
                  <p style={{ fontSize: '0.83rem', color: 'var(--danger)', margin: 0 }}>{renameError}</p>
                )}
                {renameSuccess && (
                  <p style={{ fontSize: '0.83rem', color: 'var(--success)', margin: 0 }}>Workspace updated.</p>
                )}

                {isAdmin && (
                  <div>
                    <button type="submit" className="btn-primary" disabled={renameBusy} style={{ fontSize: '0.875rem' }}>
                      {renameBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      {renameBusy ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* ── Delete Workspace ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>Delete Workspace</h2>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Permanently deletes <strong>{activeWorkspace.name}</strong> and all its data — prompts, topics, onboarding config, and members.
                This action <strong>cannot be undone</strong>.
              </p>

              {!isAdmin ? (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '0.6rem 0.85rem', fontSize: '0.83rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={14} />
                  Only ADMINs can delete a workspace.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Type <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: '0.83rem' }}>{activeWorkspace.name}</code> to confirm
                    </label>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                      placeholder={activeWorkspace.name}
                      disabled={deleteBusy}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {deleteError && (
                    <p style={{ fontSize: '0.83rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>{deleteError}</p>
                  )}

                  <button
                    className="btn-primary"
                    onClick={handleDelete}
                    disabled={deleteBusy || deleteConfirm !== activeWorkspace.name}
                    style={{ background: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.875rem', opacity: deleteConfirm !== activeWorkspace.name ? 0.5 : 1 }}
                  >
                    {deleteBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                    {deleteBusy ? 'Deleting…' : 'Delete Workspace'}
                  </button>
                </>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
