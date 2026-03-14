import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Code, Copy, Check, Download, Sparkles } from 'lucide-react';

const schemaTypes = [
  { name: 'Article', description: 'Blog posts and news articles', icon: '📰' },
  { name: 'Product', description: 'E-commerce product pages', icon: '🛍️' },
  { name: 'FAQ', description: 'Frequently asked questions', icon: '❓' },
  { name: 'Organization', description: 'Company and brand information', icon: '🏢' },
  { name: 'Person', description: 'Author and person profiles', icon: '👤' },
  { name: 'HowTo', description: 'Step-by-step guides', icon: '📋' },
  { name: 'Event', description: 'Conferences and events', icon: '📅' },
  { name: 'Recipe', description: 'Cooking recipes', icon: '🍳' },
];

const exampleSchemas = {
  Article: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Article Title",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "datePublished": "2026-03-07",
  "dateModified": "2026-03-07",
  "image": "https://example.com/image.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "Your Company",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.jpg"
    }
  },
  "description": "Article description"
}`,
  FAQ: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Answer Engine Optimization?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AEO is the practice of optimizing content to be easily understood and cited by AI answer engines."
      }
    }
  ]
}`,
  Product: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": "https://example.com/product.jpg",
  "description": "Product description",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}`
};

export function SchemaMarkup() {
  const [selectedType, setSelectedType] = useState('Article');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleSchemas[selectedType as keyof typeof exampleSchemas] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schema Markup Generator</h1>
        <p className="text-gray-600">Generate structured data to help AI understand your content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schema Type Selection */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schema Types</h2>
            <div className="space-y-2">
              {schemaTypes.map((type) => (
                <button
                  key={type.name}
                  onClick={() => setSelectedType(type.name)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedType === type.name
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{type.name}</p>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Schema Code */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Code className="size-5 mr-2" />
                {selectedType} Schema
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="size-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="size-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <Tabs defaultValue="code" className="w-full">
              <TabsList>
                <TabsTrigger value="code">JSON-LD</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-4">
                <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono">
                    {exampleSchemas[selectedType as keyof typeof exampleSchemas] || ''}
                  </pre>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Implementation Instructions</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the schema code above</li>
                    <li>Paste it inside a {'<script type="application/ld+json">'} tag</li>
                    <li>Place the script tag in your page's {'<head>'} section</li>
                    <li>Validate using Google's Rich Results Test</li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-8 border border-purple-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    How AI Engines Use This Schema
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm font-medium text-gray-900 mb-2">✓ Better Understanding</p>
                      <p className="text-sm text-gray-600">
                        AI can accurately identify the type and purpose of your content
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm font-medium text-gray-900 mb-2">✓ Rich Answers</p>
                      <p className="text-sm text-gray-600">
                        Enables AI to provide detailed, structured answers to user queries
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm font-medium text-gray-900 mb-2">✓ Higher Citation Rate</p>
                      <p className="text-sm text-gray-600">
                        Increases the likelihood of being cited by AI answer engines
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="validation" className="mt-4">
                <div className="space-y-4">
                  <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex items-start space-x-3">
                      <Check className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Valid Schema.org Format</p>
                        <p className="text-sm text-gray-600 mt-1">
                          This schema follows proper Schema.org specifications
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex items-start space-x-3">
                      <Check className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">AI-Readable Structure</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Optimized for parsing by major AI answer engines
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="pt-4">
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      <Sparkles className="size-4 mr-2" />
                      Test with Google Rich Results
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">12</p>
              <p className="text-sm text-gray-600">Schemas Generated</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">8</p>
              <p className="text-sm text-gray-600">Pages Enhanced</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">94%</p>
              <p className="text-sm text-gray-600">Validation Rate</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
