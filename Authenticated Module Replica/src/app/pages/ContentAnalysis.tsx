import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  FileSearch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Target,
  Eye,
  RefreshCw
} from 'lucide-react';

const analyzedPages = [
  {
    url: 'https://example.com/blog/ai-seo-guide',
    title: 'Complete Guide to AI SEO',
    score: 92,
    status: 'excellent',
    metrics: {
      readability: 95,
      structure: 88,
      entities: 94,
      schema: 90,
      answerability: 89
    },
    issues: [
      { type: 'warning', message: 'Add more entity mentions', priority: 'medium' },
      { type: 'info', message: 'Consider adding FAQ schema', priority: 'low' }
    ],
    lastAnalyzed: '10 mins ago'
  },
  {
    url: 'https://example.com/products/dashboard',
    title: 'Dashboard Product Page',
    score: 78,
    status: 'good',
    metrics: {
      readability: 82,
      structure: 75,
      entities: 80,
      schema: 70,
      answerability: 78
    },
    issues: [
      { type: 'error', message: 'Missing Product schema markup', priority: 'high' },
      { type: 'warning', message: 'Improve headings structure', priority: 'medium' },
      { type: 'warning', message: 'Add more Q&A content', priority: 'medium' }
    ],
    lastAnalyzed: '1 hour ago'
  },
  {
    url: 'https://example.com/about',
    title: 'About Us Page',
    score: 65,
    status: 'needs-work',
    metrics: {
      readability: 70,
      structure: 60,
      entities: 65,
      schema: 55,
      answerability: 68
    },
    issues: [
      { type: 'error', message: 'Add Organization schema', priority: 'high' },
      { type: 'error', message: 'Missing key entities', priority: 'high' },
      { type: 'warning', message: 'Content too generic', priority: 'medium' },
      { type: 'warning', message: 'No clear value proposition', priority: 'medium' }
    ],
    lastAnalyzed: '3 hours ago'
  }
];

export function ContentAnalysis() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'excellent') return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (status === 'good') return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    return <Badge className="bg-orange-100 text-orange-800">Needs Work</Badge>;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Analysis</h1>
        <p className="text-gray-600">Analyze your content for answer engine optimization</p>
      </div>

      {/* Analysis Input */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="url"
            placeholder="Enter URL to analyze (e.g., https://example.com/page)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !url}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                Analyze Page
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Analyzed Pages */}
      <div className="space-y-6">
        {analyzedPages.map((page, index) => (
          <Card key={index} className="p-6">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{page.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{page.url}</p>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(page.status)}
                    <span className="text-sm text-gray-500">Last analyzed: {page.lastAnalyzed}</span>
                  </div>
                </div>
                <div className="text-center ml-6">
                  <p className={`text-4xl font-bold ${getScoreColor(page.score)}`}>{page.score}</p>
                  <p className="text-sm text-gray-600">AEO Score</p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="metrics" className="w-full">
              <TabsList>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="issues">Issues ({page.issues.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Readability</span>
                      <span className="text-sm font-bold text-gray-900">{page.metrics.readability}%</span>
                    </div>
                    <Progress value={page.metrics.readability} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Structure</span>
                      <span className="text-sm font-bold text-gray-900">{page.metrics.structure}%</span>
                    </div>
                    <Progress value={page.metrics.structure} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Entities</span>
                      <span className="text-sm font-bold text-gray-900">{page.metrics.entities}%</span>
                    </div>
                    <Progress value={page.metrics.entities} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Schema</span>
                      <span className="text-sm font-bold text-gray-900">{page.metrics.schema}%</span>
                    </div>
                    <Progress value={page.metrics.schema} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Answerability</span>
                      <span className="text-sm font-bold text-gray-900">{page.metrics.answerability}%</span>
                    </div>
                    <Progress value={page.metrics.answerability} className="h-2" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="issues" className="mt-6">
                <div className="space-y-3">
                  {page.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-3 p-4 rounded-lg ${
                        issue.type === 'error'
                          ? 'bg-red-50 border border-red-100'
                          : issue.type === 'warning'
                          ? 'bg-orange-50 border border-orange-100'
                          : 'bg-blue-50 border border-blue-100'
                      }`}
                    >
                      {issue.type === 'error' ? (
                        <XCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : issue.type === 'warning' ? (
                        <AlertTriangle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                        <p className="text-xs text-gray-600 mt-1">Priority: {issue.priority}</p>
                      </div>
                      <Button variant="outline" size="sm">Fix</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center space-x-3 mt-6 pt-6 border-t">
              <Button variant="outline" size="sm">
                <Eye className="size-4 mr-2" />
                View Details
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="size-4 mr-2" />
                Re-analyze
              </Button>
              <Button variant="outline" size="sm">
                <Target className="size-4 mr-2" />
                Optimize
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
