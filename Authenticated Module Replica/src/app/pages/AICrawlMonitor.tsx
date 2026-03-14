import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Eye, 
  Bot, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

const crawlData = {
  totalCrawls: 1247,
  thisWeek: 89,
  avgResponseTime: '1.2s',
  successRate: 98.5
};

const botActivity = [
  {
    bot: 'GPTBot',
    engine: 'OpenAI',
    crawls: 342,
    lastSeen: '2 hours ago',
    status: 'active',
    trend: '+15%',
    avgFrequency: '4x/day'
  },
  {
    bot: 'PerplexityBot',
    engine: 'Perplexity',
    crawls: 234,
    lastSeen: '5 hours ago',
    status: 'active',
    trend: '+23%',
    avgFrequency: '3x/day'
  },
  {
    bot: 'GoogleBot-AI',
    engine: 'Google',
    crawls: 456,
    lastSeen: '1 hour ago',
    status: 'active',
    trend: '+8%',
    avgFrequency: '6x/day'
  },
  {
    bot: 'ClaudeBot',
    engine: 'Anthropic',
    crawls: 156,
    lastSeen: '8 hours ago',
    status: 'active',
    trend: '+31%',
    avgFrequency: '2x/day'
  }
];

const pageActivity = [
  {
    url: '/blog/ai-seo-guide',
    crawls: 89,
    bots: ['GPTBot', 'PerplexityBot', 'GoogleBot-AI'],
    lastCrawl: '2 hours ago',
    status: 'healthy',
    responseTime: '0.8s'
  },
  {
    url: '/blog/aeo-best-practices',
    crawls: 67,
    bots: ['GPTBot', 'ClaudeBot', 'GoogleBot-AI'],
    lastCrawl: '5 hours ago',
    status: 'healthy',
    responseTime: '1.1s'
  },
  {
    url: '/products/aeo-tool',
    crawls: 45,
    bots: ['PerplexityBot', 'GoogleBot-AI'],
    lastCrawl: '1 day ago',
    status: 'warning',
    responseTime: '2.3s'
  },
  {
    url: '/blog/schema-markup',
    crawls: 52,
    bots: ['GPTBot', 'PerplexityBot'],
    lastCrawl: '3 hours ago',
    status: 'healthy',
    responseTime: '0.9s'
  }
];

const recentCrawls = [
  { bot: 'GPTBot', page: '/blog/ai-seo-guide', time: '2 hours ago', status: 'success', responseTime: '0.8s' },
  { bot: 'GoogleBot-AI', page: '/blog/aeo-best-practices', time: '3 hours ago', status: 'success', responseTime: '1.1s' },
  { bot: 'PerplexityBot', page: '/products/aeo-tool', time: '5 hours ago', status: 'success', responseTime: '1.5s' },
  { bot: 'ClaudeBot', page: '/blog/schema-markup', time: '8 hours ago', status: 'success', responseTime: '0.9s' },
  { bot: 'GPTBot', page: '/about', time: '12 hours ago', status: 'warning', responseTime: '2.7s' }
];

export function AICrawlMonitor() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Crawl Monitor</h1>
        <p className="text-gray-600">Track how AI bots crawl and index your content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Crawls</p>
              <p className="text-3xl font-bold text-gray-900">{crawlData.totalCrawls}</p>
            </div>
            <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Eye className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">This Week</p>
              <p className="text-3xl font-bold text-gray-900">{crawlData.thisWeek}</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Response</p>
              <p className="text-3xl font-bold text-gray-900">{crawlData.avgResponseTime}</p>
            </div>
            <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="size-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900">{crawlData.successRate}%</p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bot Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">AI Bot Activity</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className="size-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {botActivity.map((bot, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="size-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      <Bot className="size-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bot.bot}</h3>
                      <p className="text-xs text-gray-500">{bot.engine}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{bot.crawls}</p>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {bot.trend}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Last seen</p>
                    <p className="font-medium text-gray-900">{bot.lastSeen}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Frequency</p>
                    <p className="font-medium text-gray-900">{bot.avgFrequency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Page Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Page Crawl Activity</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {pageActivity.map((page, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm mb-1">{page.url}</p>
                    <div className="flex items-center space-x-2">
                      {page.status === 'healthy' ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Healthy</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          <AlertTriangle className="size-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{page.lastCrawl}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-600 ml-4">{page.crawls}</p>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Response Time</span>
                    <span className="text-xs font-medium text-gray-900">{page.responseTime}</span>
                  </div>
                  <Progress value={page.responseTime === '2.3s' ? 70 : 90} className="h-1.5" />
                </div>

                <div className="flex flex-wrap gap-1">
                  {page.bots.map((bot, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded"
                    >
                      {bot}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Crawls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Crawl Activity</h2>
        <div className="space-y-3">
          {recentCrawls.map((crawl, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="size-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <Bot className="size-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <p className="font-medium text-gray-900">{crawl.bot}</p>
                    <span className="text-sm text-gray-500">→</span>
                    <p className="text-sm text-gray-600">{crawl.page}</p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span>{crawl.time}</span>
                    <span>•</span>
                    <span>Response: {crawl.responseTime}</span>
                  </div>
                </div>
              </div>
              <div>
                {crawl.status === 'success' ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : (
                  <AlertTriangle className="size-5 text-orange-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Eye className="size-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Crawl Insights</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• GoogleBot-AI is the most active crawler on your site</li>
              <li>• GPTBot crawl frequency increased by 15% this week</li>
              <li>• Your average response time is excellent for AI crawlers</li>
              <li>• One page has slower response times - consider optimization</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
