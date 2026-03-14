import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';

const dataSources = [
  {
    id: 1,
    name: 'PostgreSQL Database',
    type: 'SQL',
    status: 'connected',
    lastSync: '5 mins ago',
    records: '1.2M',
    icon: '🐘',
  },
  {
    id: 2,
    name: 'Salesforce CRM',
    type: 'API',
    status: 'connected',
    lastSync: '10 mins ago',
    records: '45K',
    icon: '☁️',
  },
  {
    id: 3,
    name: 'Google Sheets',
    type: 'Spreadsheet',
    status: 'connected',
    lastSync: '2 mins ago',
    records: '8.5K',
    icon: '📊',
  },
  {
    id: 4,
    name: 'MongoDB Atlas',
    type: 'NoSQL',
    status: 'connected',
    lastSync: '15 mins ago',
    records: '3.4M',
    icon: '🍃',
  },
  {
    id: 5,
    name: 'AWS S3 Bucket',
    type: 'Storage',
    status: 'error',
    lastSync: '2 hours ago',
    records: '256GB',
    icon: '☁️',
  },
  {
    id: 6,
    name: 'HubSpot',
    type: 'API',
    status: 'connected',
    lastSync: '8 mins ago',
    records: '23K',
    icon: '🚀',
  },
];

export function DataSources() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Sources</h1>
        <p className="text-gray-600">Connect and manage your data integrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Connected Sources</p>
              <p className="text-3xl font-bold text-gray-900">
                {dataSources.filter(ds => ds.status === 'connected').length}
              </p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Records</p>
              <p className="text-3xl font-bold text-gray-900">4.9M</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sync Status</p>
              <p className="text-3xl font-bold text-gray-900">98%</p>
            </div>
            <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add New Button */}
      <div className="mb-6">
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="size-4 mr-2" />
          Connect Data Source
        </Button>
      </div>

      {/* Data Sources List */}
      <div className="space-y-4">
        {dataSources.map((source) => (
          <Card key={source.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="size-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-2xl">
                  {source.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                    <Badge variant={source.status === 'connected' ? 'default' : 'destructive'}>
                      {source.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>Type: {source.type}</span>
                    <span>•</span>
                    <span>Last sync: {source.lastSync}</span>
                    <span>•</span>
                    <span>Records: {source.records}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {source.status === 'connected' ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : (
                  <AlertCircle className="size-5 text-red-600" />
                )}
                <Button variant="outline" size="sm">
                  <RefreshCw className="size-4 mr-2" />
                  Sync
                </Button>
                <Button variant="outline" size="icon" size="sm">
                  <Settings className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
