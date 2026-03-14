import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Network, Search, TrendingUp, Target, Plus, ExternalLink } from 'lucide-react';

const entities = [
  {
    name: 'Artificial Intelligence',
    type: 'Concept',
    mentions: 47,
    prominence: 92,
    related: ['Machine Learning', 'Deep Learning', 'Neural Networks'],
    sentiment: 'positive'
  },
  {
    name: 'Google',
    type: 'Organization',
    mentions: 23,
    prominence: 78,
    related: ['Search Engine', 'SEO', 'Algorithm'],
    sentiment: 'neutral'
  },
  {
    name: 'ChatGPT',
    type: 'Product',
    mentions: 31,
    prominence: 85,
    related: ['OpenAI', 'Language Model', 'AI Assistant'],
    sentiment: 'positive'
  },
  {
    name: 'Content Marketing',
    type: 'Concept',
    mentions: 19,
    prominence: 68,
    related: ['SEO', 'Digital Marketing', 'Brand Awareness'],
    sentiment: 'positive'
  },
  {
    name: 'OpenAI',
    type: 'Organization',
    mentions: 15,
    prominence: 72,
    related: ['ChatGPT', 'GPT-4', 'AI Research'],
    sentiment: 'positive'
  }
];

const recommendations = [
  {
    entity: 'Natural Language Processing',
    reason: 'Highly relevant to your content topic',
    priority: 'high',
    currentMentions: 0,
    potential: 95
  },
  {
    entity: 'Semantic Search',
    reason: 'Related to AI and search optimization',
    priority: 'high',
    currentMentions: 2,
    potential: 88
  },
  {
    entity: 'Knowledge Graph',
    reason: 'Key concept for AEO',
    priority: 'medium',
    currentMentions: 1,
    potential: 82
  }
];

export function EntityOptimization() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entity Optimization</h1>
        <p className="text-gray-600">Optimize entities to improve AI understanding and context</p>
      </div>

      {/* Search Bar */}
      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search or add new entity..."
              className="pl-10"
            />
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Plus className="size-4 mr-2" />
            Add Entity
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Entities</p>
              <p className="text-3xl font-bold text-gray-900">{entities.length}</p>
            </div>
            <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Network className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Mentions</p>
              <p className="text-3xl font-bold text-gray-900">135</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Prominence</p>
              <p className="text-3xl font-bold text-gray-900">79%</p>
            </div>
            <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Target className="size-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Optimization</p>
              <p className="text-3xl font-bold text-gray-900">87%</p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Network className="size-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Entities */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Detected Entities</h2>
            <div className="space-y-4">
              {entities.map((entity, index) => (
                <div
                  key={index}
                  className="p-5 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{entity.name}</h3>
                        <Badge variant="outline">{entity.type}</Badge>
                        <Badge className={`${
                          entity.sentiment === 'positive' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entity.sentiment}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span>{entity.mentions} mentions</span>
                        <span>•</span>
                        <span>{entity.prominence}% prominence</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Prominence Score</span>
                      <span className="text-xs font-bold text-gray-900">{entity.prominence}%</span>
                    </div>
                    <Progress value={entity.prominence} className="h-2" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Related Entities:</p>
                    <div className="flex flex-wrap gap-2">
                      {entity.related.map((rel, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full"
                        >
                          {rel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recommendations</h2>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{rec.entity}</h3>
                    <Badge className={`${
                      rec.priority === 'high' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {rec.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3">{rec.reason}</p>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Current Mentions</span>
                      <span className="font-medium text-gray-900">{rec.currentMentions}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Potential Impact</span>
                      <span className="font-medium text-gray-900">{rec.potential}%</span>
                    </div>
                  </div>

                  <Progress value={rec.potential} className="h-2 mb-3" />

                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="size-3 mr-2" />
                    Add to Content
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">💡 Pro Tip</p>
              <p className="text-xs text-blue-800">
                Adding these entities will improve your content's semantic richness and increase AI citation likelihood by up to 35%.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
