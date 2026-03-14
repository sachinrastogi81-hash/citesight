import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  MessageSquareQuestion, 
  Search, 
  TrendingUp, 
  Target, 
  Lightbulb,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

const questions = [
  {
    question: 'What is answer engine optimization?',
    volume: 1240,
    difficulty: 'medium',
    answerQuality: 'excellent',
    currentRanking: 1,
    intent: 'informational',
    relatedQueries: ['AEO vs SEO', 'How to optimize for AI', 'AEO best practices']
  },
  {
    question: 'How do AI search engines work?',
    volume: 890,
    difficulty: 'high',
    answerQuality: 'good',
    currentRanking: 3,
    intent: 'informational',
    relatedQueries: ['AI search algorithms', 'ChatGPT search', 'Perplexity AI']
  },
  {
    question: 'Best practices for AEO in 2026?',
    volume: 2100,
    difficulty: 'low',
    answerQuality: 'needs improvement',
    currentRanking: null,
    intent: 'informational',
    relatedQueries: ['AEO tips', 'optimize for chatgpt', 'AI SEO strategy']
  },
  {
    question: 'How to get cited by ChatGPT?',
    volume: 1560,
    difficulty: 'medium',
    answerQuality: 'good',
    currentRanking: 2,
    intent: 'how-to',
    relatedQueries: ['ChatGPT citations', 'AI attribution', 'source visibility']
  },
  {
    question: 'Difference between SEO and AEO?',
    volume: 3200,
    difficulty: 'low',
    answerQuality: 'excellent',
    currentRanking: 1,
    intent: 'comparison',
    relatedQueries: ['SEO vs AEO', 'traditional SEO', 'modern optimization']
  },
  {
    question: 'What schema markup for AI optimization?',
    volume: 720,
    difficulty: 'high',
    answerQuality: 'needs improvement',
    currentRanking: 5,
    intent: 'how-to',
    relatedQueries: ['structured data', 'schema types', 'JSON-LD']
  }
];

const opportunityQuestions = [
  {
    question: 'How to measure AEO success?',
    volume: 980,
    difficulty: 'medium',
    competition: 'low',
    potential: 92
  },
  {
    question: 'Tools for answer engine optimization?',
    volume: 1450,
    difficulty: 'low',
    competition: 'medium',
    potential: 88
  },
  {
    question: 'Entity optimization strategies?',
    volume: 650,
    difficulty: 'high',
    competition: 'low',
    potential: 85
  }
];

export function QuestionTargeting() {
  const [searchQuery, setSearchQuery] = useState('');

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === 'low') return 'bg-green-100 text-green-800';
    if (difficulty === 'medium') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getQualityColor = (quality: string) => {
    if (quality === 'excellent') return 'bg-green-100 text-green-800';
    if (quality === 'good') return 'bg-blue-100 text-blue-800';
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Targeting</h1>
        <p className="text-gray-600">Find and optimize for questions your audience asks AI</p>
      </div>

      {/* Search */}
      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Discover questions related to your content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Search className="size-4 mr-2" />
            Discover Questions
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Questions</p>
              <p className="text-3xl font-bold text-gray-900">{questions.length}</p>
            </div>
            <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <MessageSquareQuestion className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Volume</p>
              <p className="text-3xl font-bold text-gray-900">10.3K</p>
            </div>
            <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Ranking</p>
              <p className="text-3xl font-bold text-gray-900">2.4</p>
            </div>
            <div className="size-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Target className="size-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Opportunities</p>
              <p className="text-3xl font-bold text-gray-900">{opportunityQuestions.length}</p>
            </div>
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Lightbulb className="size-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="tracked" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tracked">Tracked Questions</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="tracked">
          <div className="space-y-4">
            {questions.map((item, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.question}</h3>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge className={getDifficultyColor(item.difficulty)}>
                        {item.difficulty}
                      </Badge>
                      <Badge className={getQualityColor(item.answerQuality)}>
                        {item.answerQuality}
                      </Badge>
                      <Badge variant="outline">{item.intent}</Badge>
                      {item.currentRanking && (
                        <Badge className="bg-purple-100 text-purple-800">
                          Rank #{item.currentRanking}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <p className="text-2xl font-bold text-purple-600">{item.volume.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">monthly searches</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Related Queries:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.relatedQueries.map((query, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {query}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Target className="size-4 mr-2" />
                    Optimize Content
                  </Button>
                  <Button variant="outline" size="sm">
                    <ArrowUpRight className="size-4 mr-2" />
                    View Analysis
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="size-4 mr-2" />
                    Research
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="opportunities">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {opportunityQuestions.map((opp, index) => (
              <Card key={index} className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="size-5 text-purple-600" />
                      <Badge className="bg-purple-600 text-white">Opportunity</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{opp.question}</h3>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-3xl font-bold text-purple-600">{opp.potential}%</p>
                    <p className="text-xs text-gray-600">potential</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Volume</p>
                    <p className="font-semibold text-gray-900">{opp.volume}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Difficulty</p>
                    <Badge className={getDifficultyColor(opp.difficulty)} variant="outline">
                      {opp.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Competition</p>
                    <p className="font-semibold text-gray-900">{opp.competition}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <CheckCircle2 className="size-4 mr-2" />
                    Target This
                  </Button>
                  <Button variant="outline">
                    <Search className="size-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="size-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Why Target These Questions?</h3>
                  <p className="text-sm text-blue-800">
                    These questions have high search volume with lower competition, making them ideal targets for AEO. 
                    Creating comprehensive answers can significantly increase your AI citation rate.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
