import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { ContentAnalysis } from './pages/ContentAnalysis';
import { SchemaMarkup } from './pages/SchemaMarkup';
import { EntityOptimization } from './pages/EntityOptimization';
import { QuestionTargeting } from './pages/QuestionTargeting';
import { CitationTracking } from './pages/CitationTracking';
import { AICrawlMonitor } from './pages/AICrawlMonitor';
import { SettingsPage } from './pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'content',
        element: <ContentAnalysis />,
      },
      {
        path: 'schema',
        element: <SchemaMarkup />,
      },
      {
        path: 'entities',
        element: <EntityOptimization />,
      },
      {
        path: 'questions',
        element: <QuestionTargeting />,
      },
      {
        path: 'citations',
        element: <CitationTracking />,
      },
      {
        path: 'crawl',
        element: <AICrawlMonitor />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);