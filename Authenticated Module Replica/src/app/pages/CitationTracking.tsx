import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, 
  MessageSquareQuote, 
  ExternalLink, 
  Bot,
  Calendar,
  ArrowUpRight,
  Target
} from 'lucide-react';

const citationData = {
  total: 342,
  thisMonth: 87,
  change: '+23.1%',
  topPages: [
    { url: '/blog/ai-seo-guide', title: 'AI SEO Guide', citations: 142, trend: '+18%' },
    { url: '/blog/aeo-best-practices', title: 'AEO Best Practices', citations: 98, trend: '+32%' },
    { url: '/blog/schema-markup', title: 'Schema Markup Guide', citations: 76, trend: '+12%' },
    { url: '/products/aeo-tool', title: 'AEO Tool Overview', citations: 26, trend: '+45%' }
  ]
};

const aiEngines = [
  {
    name: 'ChatGPT',
    icon: '🤖',
    citations: 142,
    change: '+12%',
    lastCitation: '2 hours ago',
    topContexts: ['AI optimization', 'content strategy', 'SEO techniques']
  },
  {
    name: 'Perplexity',
    icon: '🔮',
    citations: 98,
    change: '+18%',
    lastCitation: '5 hours ago',
    topContexts: ['answer engines', 'search optimization', 'content marketing']
  },
  {
    name: 'Google AI',
    icon: '🌐',
    citations: 76,
    change: '+8%',
    lastCitation: '1 day ago',
    topContexts: ['structured data', 'SEO best practices', 'ranking factors']
  },
  {
    name: 'Claude',
    icon: '💬',
    citations: 26,
    change: '+25%',
    lastCitation: '12 hours ago',
    topContexts: ['AI content', 'optimization strategies', 'digital marketing']
  }
];

const recentCitations = [
  {
    engine: 'ChatGPT',
    query: 'What is answer engine optimization?',
    page: 'AI SEO Guide',
    context: 'Your comprehensive guide was cited as the primary source for explaining AEO fundamentals',
    timestamp: '2 hours ago',
    userCount: 234
  },
  {
    engine: 'Perplexity',
    query: 'Best AEO practices 2026',
    page: 'AEO Best Practices',
    context: 'Referenced for updated strategies and implementation tips',
    timestamp: '5 hours ago',
    userCount: 156
  },
  {
    engine: 'Google AI',
    query: 'How to implement schema markup',
    page: 'Schema Markup Guide',
    context: 'Cited as step-by-step implementation guide',
    timestamp: '1 day ago',
    userCount: 89
  },
  {
    engine: 'Claude',
    query: 'AEO tools comparison',
    page: 'AEO Tool Overview',
    context: 'Used as reference for tool features and pricing',
    timestamp: '12 hours ago',
    userCount: 67
  }
];

export function CitationTracking() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Citation Tracking</h1>
        <p className="text-gray-600">Monitor how AI answer engines cite your content</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Citations</p>
              <p className="text-3xl font-bold text-gray-900">{citationData.total}</p>
              <p className="text-sm text-green-600 mt-2 flex items-center">
                <TrendingUp className="size-4 mr-1" />
                {citationData.change}
              </p>
            </div>
            <div className="size-12 bg-purple-600 rounded-xl flex items-center justify-center">
              <MessageSquareQuote className="size-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-3xl font-bold text-gray-900">{citationData.thisMonth}</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">AI Engines</p>
              <p className="text-3xl font-bold text-gray-900">{aiEngines.length}</p>
            </div>
            <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Bot className="size-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cited Pages</p>
              <p className="text-3xl font-bold text-gray-900">{citationData.topPages.length}</p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Target className="size-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="engines" className="space-y-6">
        <TabsList>
          <TabsTrigger value="engines">By AI Engine</TabsTrigger>
          <TabsTrigger value="pages">By Page</TabsTrigger>
          <TabsTrigger value="recent">Recent Citations</TabsTrigger>
        </TabsList>

        <TabsContent value="engines">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiEngines.map((engine, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="size-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl">
                      {engine.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{engine.name}</h3>
                      <p className="text-sm text-gray-500">Last: {engine.lastCitation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-600">{engine.citations}</p>
                    <Badge className="bg-green-100 text-green-800 mt-1">
                      {engine.change}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-2">Top Contexts:</p>
                  <div className="flex flex-wrap gap-2">
                    {engine.topContexts.map((context, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full"
                      >
                        {context}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <ArrowUpRight className="size-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="size-4 mr-2" />
                    Analyze
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <div className="space-y-4">
            {citationData.topPages.map((page, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{page.title}</h3>
                      <Badge className="bg-purple-100 text-purple-800">
                        {page.citations} citations
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        {page.trend}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{page.url}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="size-4 mr-2" />
                    View Page
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <div className="space-y-4">
            {recentCitations.map((citation, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className="bg-indigo-100 text-indigo-800">{citation.engine}</Badge>
                      <span className="text-sm text-gray-500">{citation.timestamp}</span>
                      <Badge variant="outline">{citation.userCount} users</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{citation.query}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Page: <span className="font-medium">{citation.page}</span>
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-purple-600">
                      <p className="text-sm text-gray-700">{citation.context}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Target className="size-4 mr-2" />
                    Optimize Further
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="size-4 mr-2" />
                    View Query
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="size-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Citation Performance Insights</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your citation rate increased by 23.1% this month</li>
              <li>• Most citations come from questions about "AI optimization" and "content strategy"</li>
              <li>• ChatGPT accounts for 41.5% of all citations</li>
              <li>• Pages with FAQ schema see 2.3x more citations on average</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
