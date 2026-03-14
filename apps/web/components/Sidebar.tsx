'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Globe,
  LayoutGrid,
  GitBranch,
  Briefcase,
  Plug,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Plus,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { listWorkspaces, type WorkspaceSummary } from '../lib/api';

const WORKSPACE_KEY = 'citesight_workspace_id';

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavSection = { label: string | null; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: null,
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'INSIGHTS',
    items: [
      { name: 'Prompts', href: '/dashboard/prompt-research', icon: MessageSquare },
      { name: 'Pages', href: '/dashboard/pages', icon: FileText },
      { name: 'WP Posts', href: '/dashboard/wordpress-posts', icon: Globe },
    ],
  },
  {
    label: 'ACTIONS',
    items: [
      { name: 'Grids', href: '/dashboard/grids', icon: LayoutGrid },
      { name: 'Workflows', href: '/dashboard/workflows', icon: GitBranch },
    ],
  },
  {
    label: 'FOUNDATION',
    items: [
      { name: 'Brand Kit', href: '/dashboard/brand-kit', icon: Briefcase },
      { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    ],
  },
];

export function Sidebar() {
  const { user, logout, accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    listWorkspaces(accessToken)
      .then((wsList) => {
        setWorkspaces(wsList);
        const stored = localStorage.getItem(WORKSPACE_KEY);
        setActiveWorkspace(wsList.find((w) => w.id === stored) ?? wsList[0] ?? null);
      })
      .catch(() => {});
  }, [accessToken]);

  function switchWorkspace(ws: WorkspaceSummary) {
    localStorage.setItem(WORKSPACE_KEY, ws.id);
    setActiveWorkspace(ws);
    setDropdownOpen(false);
    router.refresh();
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Sparkles />
        </div>
        <span className="sidebar-brand-name">CiteSight</span>
      </div>

      {/* Workspace switcher */}
      <div className="ws-switcher" ref={dropdownRef}>
        <button
          className="ws-switcher-btn"
          onClick={() => setDropdownOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <Building2 className="ws-icon" />
          <span className="ws-switcher-name">{activeWorkspace?.name ?? 'Select workspace'}</span>
          <ChevronDown className={`ws-switcher-caret${dropdownOpen ? ' open' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="ws-dropdown" role="listbox">
            {workspaces.length > 0 && (
              <>
                <div className="ws-dropdown-label">Workspaces</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={`ws-dropdown-item${ws.id === activeWorkspace?.id ? ' active' : ''}`}
                    role="option"
                    aria-selected={ws.id === activeWorkspace?.id}
                    onClick={() => switchWorkspace(ws)}
                  >
                    <Building2 />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ws.name}
                    </span>
                    {ws.id === activeWorkspace?.id && <Check size={14} />}
                  </button>
                ))}
                <div className="ws-dropdown-divider" />
              </>
            )}
            <button
              className="ws-dropdown-item new"
              onClick={() => {
                setDropdownOpen(false);
                localStorage.removeItem(WORKSPACE_KEY);
                router.push('/onboarding?new=1');
              }}
            >
              <Plus />
              New workspace
            </button>
          </div>
        )}
      </div>

      {/* Sectioned nav */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label ?? '__top'} className="nav-section">
            {section.label && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {section.items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item${isActive(item.href, item.exact) ? ' active' : ''}`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          className={`nav-item${isActive('/dashboard/settings', true) ? ' active' : ''}`}
          style={{ width: '100%' }}
        >
          <Settings size={16} />
          Settings
        </Link>
        <button className="btn-outline nav-item" onClick={logout} style={{ width: '100%' }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
