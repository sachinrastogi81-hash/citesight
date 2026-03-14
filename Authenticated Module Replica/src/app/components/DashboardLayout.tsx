import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  FileSearch,
  Code,
  Network,
  MessageSquareQuestion,
  TrendingUp,
  Eye,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Content Analysis', href: '/dashboard/content', icon: FileSearch },
  { name: 'Schema Markup', href: '/dashboard/schema', icon: Code },
  { name: 'Entity Optimization', href: '/dashboard/entities', icon: Network },
  { name: 'Question Targeting', href: '/dashboard/questions', icon: MessageSquareQuestion },
  { name: 'Citation Tracking', href: '/dashboard/citations', icon: TrendingUp },
  { name: 'AI Crawl Monitor', href: '/dashboard/crawl', icon: Eye },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="size-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="size-5 text-white" />
          </div>
          <span className="ml-3 text-xl font-bold text-gray-900">AEO Platform</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="size-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center px-4 py-3 mb-2">
            <div className="size-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-purple-600">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start"
          >
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          variant="outline"
          size="icon"
          className="bg-white"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white">
          <div className="flex flex-col h-full pt-20 px-4">
            <nav className="flex-1 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="size-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-200 mb-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start"
              >
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}