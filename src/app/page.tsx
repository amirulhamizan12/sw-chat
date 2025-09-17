import Link from "next/link";
import { ArrowRight, Sparkles, MessageSquare, Code } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">SuperWizard</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-white hover:text-gray-300 transition-colors">
              Overview
            </Link>
            <Link href="/chat" className="text-white hover:text-gray-300 transition-colors">
              Models
            </Link>
            <Link href="#" className="text-white hover:text-gray-300 transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                The AI Gateway
                <span className="block">For Developers</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Robustly access hundreds of AI models through a centralized interface and ship with ease.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/chat"
                  className="flex items-center space-x-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="/chat"
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-600 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>View Models</span>
                </Link>
              </div>
            </div>

            {/* Right Side - Code Example */}
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex space-x-4 mb-4">
                <div className="px-3 py-1 bg-gray-800 text-white text-sm rounded">AI SDK</div>
                <div className="px-3 py-1 text-gray-400 text-sm">Python</div>
                <div className="px-3 py-1 text-gray-400 text-sm">OpenAI HTTP</div>
              </div>
              <div className="font-mono text-sm">
                <div className="text-purple-400">import</div>
                <div className="text-white ml-4">
                  <span className="text-purple-400">const</span> result = <span className="text-blue-400">streamText</span>({'{'}
                </div>
                <div className="text-white ml-4">
                  model: <span className="text-green-400">'openai/gpt-5'</span>,
                </div>
                <div className="text-white ml-4">
                  prompt: <span className="text-green-400">'Why is the sky blue?'</span>
                </div>
                <div className="text-white ml-4">{'}'})</div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Use it with</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded">OpenAI</span>
                  <span className="px-3 py-1 border border-gray-600 text-white text-xs rounded">xAI</span>
                  <span className="px-3 py-1 border border-gray-600 text-white text-xs rounded">Anthropic</span>
                  <span className="px-3 py-1 border border-gray-600 text-white text-xs rounded">and many more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">One endpoint, all your models</h3>
              <p className="text-gray-400 leading-relaxed">
                Access all of your favorite models without ripping out your backend.
              </p>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Eliminate overhead, ship faster.</h3>
              <p className="text-gray-400 leading-relaxed">
                Stop managing API keys, rate limits, or provider accounts. All under a single source of billing.
              </p>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Intelligent failovers, increase uptime</h3>
              <p className="text-gray-400 leading-relaxed">
                Automatically fall back during provider outages.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
