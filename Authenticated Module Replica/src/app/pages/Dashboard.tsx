import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  ArrowUpRight, 
  FileSearch, 
  TrendingUp, 
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  MessageSquareQuote,
  Bot
} from 'lucide-react';

const stats = [
  { name: 'AEO Score', value: '87', change: '+5.2%', icon: Target, color: 'purple' },
  { name: 'AI Citations', value: '342', change: '+23.1%', icon: MessageSquareQuote, color: 'blue' },
  { name: 'Optimized Pages', value: '156', change: '+12.5%', icon: CheckCircle2, color: 'green' },
  { name: 'Answer Rate', value: '68%', change: '+8.3%', icon: TrendingUp, color: 'indigo' },
];

const recentAnalysis = [
  { title: 'Homepage Analysis', score: 92, status: 'excellent', lastRun: '10 mins ago', issues: 2 },
  { title: 'Product Page Audit', score: 78, status: 'good', lastRun: '1 hour ago', issues: 5 },
  { title: 'Blog Post Schema', score: 65, status: 'needs work', lastRun: '2 hours ago', issues: 12 },
  { title: 'FAQ Page Review', score: 88, status: 'excellent', lastRun: '3 hours ago', issues: 3 },
  { title: 'About Page Check', score: 71, status: 'good', lastRun: '5 hours ago', issues: 7 },
];

const aiEngines = [
  { name: 'ChatGPT', citations: 142, status: 'active', change: '+12%' },
  { name: 'Perplexity', citations: 98, status: 'active', change: '+18%' },
  { name: 'Google AI', citations: 76, status: 'active', change: '+8%' },
  { name: 'Claude', citations: 26, status: 'active', change: '+25%' },
];

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600 mt-1">Here's your AEO performance overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <TrendingUp className="size-4 mr-1" />
                  {stat.change}
                </p>
              </div>
              <div className={`size-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`size-6 text-${stat.color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <FileSearch className="size-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyze Content</h3>
          <p className="text-sm text-gray-600 mb-4">Run AEO analysis on your pages</p>
          <Button variant="outline" className="w-full">
            <Sparkles className="size-4 mr-2" />
            New Analysis
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Target className="size-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Questions</h3>
          <p className="text-sm text-gray-600 mb-4">Find questions to optimize for</p>
          <Button variant="outline" className="w-full">
            <ArrowUpRight className="size-4 mr-2" />
            Discover
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
            <MessageSquareQuote className="size-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Citations</h3>
          <p className="text-sm text-gray-600 mb-4">Monitor AI engine mentions</p>
          <Button variant="outline" className="w-full">
            <TrendingUp className="size-4 mr-2" />
            View Report
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Content Analysis */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Analysis</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {recentAnalysis.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="size-12 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <FileSearch className="size-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'excellent' 
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'good'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-sm text-gray-500">{item.lastRun}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{item.score}</p>
                    <p className="text-xs text-gray-500">{item.issues} issues</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Engine Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">AI Engine Citations</h2>
            <Button variant="outline" size="sm">
              Details
            </Button>
          </div>

          <div className="space-y-4">
            {aiEngines.map((engine, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="size-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <Bot className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{engine.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {engine.status}
                      </span>
                      <span className="text-sm text-green-600">{engine.change}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{engine.citations}</p>
                  <p className="text-xs text-gray-500">citations</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
