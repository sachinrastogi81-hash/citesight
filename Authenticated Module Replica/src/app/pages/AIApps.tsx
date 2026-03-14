import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Cpu,
  ExternalLink,
  Settings,
  Users,
  Zap,
} from 'lucide-react';

const apps = [
  {
    id: 1,
    name: 'Content Assistant',
    description: 'AI-powered content writing and editing tool',
    type: 'GPT-4',
    users: 124,
    requests: '15.2K',
    status: 'live',
    color: 'bg-blue-500',
  },
  {
    id: 2,
    name: 'Sales Predictor',
    description: 'Predict sales outcomes using ML models',
    type: 'Custom Model',
    users: 45,
    requests: '8.7K',
    status: 'live',
    color: 'bg-green-500',
  },
  {
    id: 3,
    name: 'Image Analyzer',
    description: 'Computer vision for product images',
    type: 'Vision AI',
    users: 89,
    requests: '21.3K',
    status: 'live',
    color: 'bg-purple-500',
  },
  {
    id: 4,
    name: 'Chatbot Builder',
    description: 'Custom chatbot for customer support',
    type: 'GPT-4',
    users: 234,
    requests: '42.1K',
    status: 'live',
    color: 'bg-indigo-500',
  },
  {
    id: 5,
    name: 'Document Parser',
    description: 'Extract data from documents automatically',
    type: 'OCR + AI',
    users: 67,
    requests: '12.4K',
    status: 'beta',
    color: 'bg-orange-500',
  },
  {
    id: 6,
    name: 'Translation API',
    description: 'Real-time language translation service',
    type: 'NLP',
    users: 156,
    requests: '34.8K',
    status: 'live',
    color: 'bg-pink-500',
  },
];

export function AIApps() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Apps</h1>
        <p className="text-gray-600">Deploy and manage AI-powered applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Apps</p>
              <p className="text-3xl font-bold text-gray-900">{apps.length}</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Cpu className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">715</p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="size-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">API Requests</p>
              <p className="text-3xl font-bold text-gray-900">134K</p>
            </div>
            <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Zap className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Uptime</p>
              <p className="text-3xl font-bold text-gray-900">99.8%</p>
            </div>
            <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Cpu className="size-6 text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Create New Button */}
      <div className="mb-6">
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="size-4 mr-2" />
          Deploy New AI App
        </Button>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {apps.map((app) => (
          <Card key={app.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`size-12 ${app.color} rounded-xl flex items-center justify-center`}>
                <Cpu className="size-6 text-white" />
              </div>
              <Badge variant={app.status === 'live' ? 'default' : 'secondary'}>
                {app.status}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{app.description}</p>

            <div className="flex items-center space-x-4 mb-4 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-900">{app.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Users</p>
                <p className="text-sm font-medium text-gray-900">{app.users}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Requests</p>
                <p className="text-sm font-medium text-gray-900">{app.requests}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="size-4 mr-2" />
                Open
              </Button>
              <Button variant="outline" size="icon" size="sm">
                <Settings className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
