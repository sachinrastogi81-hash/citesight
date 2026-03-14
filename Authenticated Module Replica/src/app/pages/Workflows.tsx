import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Search,
  Play,
  Pause,
  MoreVertical,
  Workflow,
  Calendar,
  Activity,
} from 'lucide-react';

const workflows = [
  {
    id: 1,
    name: 'Email Classification',
    description: 'Automatically categorize incoming emails using AI',
    status: 'active',
    triggers: 'Email Received',
    actions: 5,
    lastRun: '2 mins ago',
    runs: 1247,
  },
  {
    id: 2,
    name: 'Lead Enrichment',
    description: 'Enrich lead data with company information',
    status: 'active',
    triggers: 'New Lead',
    actions: 8,
    lastRun: '15 mins ago',
    runs: 892,
  },
  {
    id: 3,
    name: 'Content Generator',
    description: 'Generate blog posts from topics',
    status: 'paused',
    triggers: 'Manual',
    actions: 3,
    lastRun: '1 hour ago',
    runs: 234,
  },
  {
    id: 4,
    name: 'Customer Support Bot',
    description: 'AI-powered support ticket responses',
    status: 'active',
    triggers: 'New Ticket',
    actions: 6,
    lastRun: '5 mins ago',
    runs: 2341,
  },
  {
    id: 5,
    name: 'Data Sync Pipeline',
    description: 'Sync data between CRM and database',
    status: 'active',
    triggers: 'Scheduled',
    actions: 4,
    lastRun: '3 mins ago',
    runs: 4567,
  },
  {
    id: 6,
    name: 'Sentiment Analysis',
    description: 'Analyze customer feedback sentiment',
    status: 'active',
    triggers: 'New Feedback',
    actions: 7,
    lastRun: '8 mins ago',
    runs: 678,
  },
];

export function Workflows() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
        <p className="text-gray-600">Manage and monitor your automation workflows</p>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="size-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Workflow className="size-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                  <p className="text-sm text-gray-600">{workflow.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                {workflow.status}
              </Badge>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-600">{workflow.triggers}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Actions</p>
                <p className="font-semibold text-gray-900">{workflow.actions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Runs</p>
                <p className="font-semibold text-gray-900">{workflow.runs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Run</p>
                <p className="font-semibold text-gray-900 text-xs">{workflow.lastRun}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Activity className="size-4 mr-2" />
                View Logs
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Calendar className="size-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={workflow.status === 'active' ? '' : 'border-green-200 text-green-600'}
              >
                {workflow.status === 'active' ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
