"use client";
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, ChevronDown, Zap, MessageSquare, Copy, Check, RefreshCw, AlertCircle, Sparkles, Square } from 'lucide-react';
import { openRouterService, OpenRouterModel, OpenRouterMessage, formatModelName, formatProvider, calculateCost } from '@/services/openrouterService';

// ===========================
// TYPES & INTERFACES
// ===========================

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  responseType?: 'streaming' | 'text';
  isStreaming?: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
  cost?: number;
  timing?: {
    requestStart: number;
    firstTokenTime?: number;
    responseEnd?: number;
    timeToFirstToken?: number;
    totalResponseTime?: number;
    actualResponseTime?: number;
  };
  rawResponse?: any;
}

interface ApiResponseData {
  id: string;
  author: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
  capabilities: string[];
  limits: { maxTokens: number; outputTokenLimit: number; contextWindow: number; };
  endpoints: { chat: string; };
  requestData?: any;
  responseData?: any;
  timestamp: Date;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

const getModelDisplayName = (model: OpenRouterModel) => formatModelName(model.id);
const getModelProvider = (model: OpenRouterModel) => formatProvider(model.id);
const getModelCost = (model: OpenRouterModel) => `${model.pricing.prompt}/${model.pricing.completion} per 1K tokens`;
const formatTime = (ms: number) => ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

// ===========================
// MODEL SELECTOR COMPONENT
// ===========================

const ModelSelector = ({ selectedModel, onModelChange, isOpen, onToggle, availableModels, isLoading }: {
  selectedModel: OpenRouterModel | null;
  onModelChange: (model: OpenRouterModel) => void;
  isOpen: boolean;
  onToggle: () => void;
  availableModels: OpenRouterModel[];
  isLoading: boolean;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 bg-dark-200 border border-dark-400/40 rounded-lg hover:bg-dark-300 hover:border-orange-500/40 group"
      >
        <div className="flex items-center space-x-2">
          {isLoading && <Loader2 className="w-4 h-4 text-orange-400" />}
          <div className="text-left">
            <div className="text-white font-semibold text-sm">
              {selectedModel ? getModelDisplayName(selectedModel) : 'Select Model'}
            </div>
            <div className="text-gray-400 text-xs">
              {selectedModel ? `${getModelProvider(selectedModel)} • ${selectedModel.context_length.toLocaleString()} tokens` : 'Choose model'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {selectedModel && <div className="px-2 py-1 bg-orange-500 text-white text-xs rounded font-medium">Active</div>}
          <ChevronDown className={`w-4 h-4 text-gray-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-dark-200/98 border border-dark-400/60 rounded-2xl z-50 max-h-96 overflow-hidden">
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-400" />
                <span className="ml-3 text-gray-400 text-lg">Loading models...</span>
              </div>
            ) : availableModels.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <span className="ml-3 text-gray-400 text-lg">No models available</span>
              </div>
            ) : (
              <div className="p-3">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { onModelChange(model); onToggle(); }}
                    className={`w-full p-2 text-left rounded-lg group ${
                      selectedModel?.id === model.id 
                        ? 'bg-orange-500/25 border border-orange-500/40' 
                        : 'hover:bg-dark-300/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-semibold text-sm">{getModelDisplayName(model)}</span>
                          <span className="px-1.5 py-0.5 bg-dark-400/60 text-gray-300 text-xs rounded font-medium">
                            {getModelProvider(model)}
                          </span>
                          {selectedModel?.id === model.id && (
                            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded font-bold">Selected</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <span>{model.context_length.toLocaleString()} tokens</span>
                          <span>•</span>
                          <span>{getModelCost(model)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================
// RESPONSE TYPE SELECTOR
// ===========================

const ResponseTypeSelector = ({ responseType, onResponseTypeChange }: {
  responseType: 'streaming' | 'text';
  onResponseTypeChange: (type: 'streaming' | 'text') => void;
}) => {
  const types = [
    { id: 'streaming', label: 'Streaming', icon: MessageSquare, description: 'Real-time response' },
    { id: 'text', label: 'Text', icon: MessageSquare, description: 'Plain text' }
  ] as const;

  return (
    <div className="flex space-x-2">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = responseType === type.id;
        return (
          <button
            key={type.id}
            onClick={() => onResponseTypeChange(type.id)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium ${
              isActive ? 'bg-orange-500 text-white' : 'bg-dark-300 text-gray-300 hover:bg-dark-400 hover:text-white'
            }`}
            title={type.description}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ===========================
// MESSAGE COMPONENTS
// ===========================

const UserMessage = ({ message }: { message: Message }) => (
  <div className="flex justify-end mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-orange-500 text-white px-4 py-3 rounded-2xl rounded-br-md">
        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-right mr-1">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const RealtimeTimer = ({ startTime, firstTokenTime, isStreaming }: { 
  startTime: number; 
  firstTokenTime?: number; 
  isStreaming?: boolean;
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 100);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const elapsed = currentTime - startTime;
  const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : undefined;
  const actualResponseTime = firstTokenTime ? currentTime - firstTokenTime : undefined;

  return (
    <div className="mt-3 p-3 bg-dark-400/30 border border-dark-500/40 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-300">Response Metrics</span>
        <div className="flex items-center space-x-2">
          <Zap className="w-3 h-3 text-orange-400" />
          {isStreaming && (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-orange-400 font-mono">Live</span>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Time to First Token:</span>
            <span className="text-orange-400 font-medium">
              {timeToFirstToken ? formatTime(timeToFirstToken) : 'Waiting...'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Response Time:</span>
            <span className="text-green-400 font-medium font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Actual Response:</span>
            <span className="text-cyan-400 font-medium font-mono">
              {actualResponseTime ? formatTime(actualResponseTime) : 'Waiting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponseCalculator = ({ timing, usage, isStreaming }: { 
  timing?: Message['timing']; 
  usage?: Message['usage'];
  isStreaming?: boolean;
}) => {
  if (!timing) return null;

  if (isStreaming && timing.requestStart) {
    return <RealtimeTimer startTime={timing.requestStart} firstTokenTime={timing.firstTokenTime} isStreaming={isStreaming} />;
  }

  return (
    <div className="mt-3 p-3 bg-dark-400/30 border border-dark-500/40 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-300">Response Metrics</span>
        <Zap className="w-3 h-3 text-orange-400" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Time to First Token:</span>
            <span className="text-orange-400 font-medium">
              {timing.timeToFirstToken ? formatTime(timing.timeToFirstToken) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Response Time:</span>
            <span className="text-green-400 font-medium">
              {timing.totalResponseTime ? formatTime(timing.totalResponseTime) : 'N/A'}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Actual Response:</span>
            <span className="text-cyan-400 font-medium">
              {timing.actualResponseTime ? formatTime(timing.actualResponseTime) : 'N/A'}
            </span>
          </div>
          {usage && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tokens:</span>
              <span className="text-purple-400 font-medium">{usage.completion_tokens.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AssistantMessage = ({ message, onCopy }: { message: Message; onCopy: (content: string) => void; }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { 
    onCopy(message.content); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] lg:max-w-[75%]">
        <div className="bg-dark-300 text-white px-4 py-3 rounded-2xl rounded-bl-md border border-dark-200/50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-orange-400 font-medium">{message.model}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400 capitalize">{message.responseType}</span>
              {message.isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-xs text-orange-400">Streaming</span>
                </div>
              )}
            </div>
            <button onClick={handleCopy} className="p-1 hover:bg-dark-500 rounded" title="Copy response">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />}
            </button>
          </div>
          <div className="text-sm leading-relaxed break-words">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
          <ResponseCalculator timing={message.timing} usage={message.usage} isStreaming={message.isStreaming} />
        </div>
        <div className="mt-1 text-xs text-gray-400 text-left ml-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator = ({ model }: { model: string }) => (
  <div className="flex justify-start mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-dark-300 text-white px-4 py-3 rounded-2xl rounded-bl-md border border-dark-200/50">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-300 font-medium">{model} is thinking...</span>
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex justify-center items-center h-full min-h-[400px]">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-orange-500/20 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-orange-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">AI Generation Studio</h3>
      <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
        Select a model, choose your response type, and start generating with multiple AI models via OpenRouter.
      </p>
    </div>
  </div>
);

// ===========================
// JSON RESPONSE VIEWER
// ===========================

const JsonResponseViewer = ({ responseData, isStreaming }: { 
  responseData: ApiResponseData | null; 
  isStreaming: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullData, setShowFullData] = useState(false);

  const handleCopy = () => {
    if (responseData) {
      const dataToCopy = showFullData ? responseData : getSimplifiedResponseData(responseData);
      navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSimplifiedResponseData = (data: ApiResponseData) => ({
    model: { id: data.id, name: data.name, author: data.author },
    request: {
      message: data.requestData.messages[0]?.content || 'No message',
      stream: data.requestData.stream,
      temperature: data.requestData.temperature,
      max_tokens: data.requestData.max_tokens
    },
    response: data.responseData || null,
    timestamp: data.timestamp
  });

  if (!responseData) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-dark-400/20 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">API Response</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Send a message to see the live API response data here.
          </p>
        </div>
      </div>
    );
  }

  const displayData = showFullData ? responseData : getSimplifiedResponseData(responseData);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-dark-400/30">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-gray-300">API Response</h3>
          {isStreaming && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-orange-400">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFullData(!showFullData)}
            className="px-2 py-1 text-xs bg-dark-400 hover:bg-dark-500 text-gray-300 rounded transition-colors"
            title={showFullData ? "Show simplified view" : "Show full data"}
          >
            {showFullData ? "Simple" : "Full"}
          </button>
          <button onClick={handleCopy} className="p-1.5 hover:bg-dark-500 rounded-lg transition-colors" title="Copy JSON">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// ===========================
// MESSAGE INPUT COMPONENT
// ===========================

const MessageInput = ({ onSendMessage, onStopGeneration, isLoading, isGenerating, placeholder = "Type your message..." }: {
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  isLoading: boolean;
  isGenerating: boolean;
  placeholder?: string;
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setTimeout(() => { if (textareaRef.current) textareaRef.current.style.height = '24px'; }, 0);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
  };

  useEffect(() => autoResize(), [message]);
  const hasContent = message.trim().length > 0;

  return (
    <div className="relative group">
      <div className={`relative flex items-end gap-3 p-3 rounded-xl bg-dark-200/80 border border-dark-400/30 ${isLoading ? 'opacity-70' : ''} min-h-[48px]`}>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full bg-transparent border-0 focus:outline-none placeholder:text-gray-400 text-white resize-none min-h-[24px] max-h-[100px] text-sm leading-relaxed pr-2 scrollbar-hide"
            rows={1}
            style={{ height: '24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          />
        </div>
        {isGenerating ? (
          <button
            onClick={onStopGeneration}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            title="Stop generation"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!hasContent || isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              hasContent && !isLoading
                ? 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-orange-500/25'
                : 'bg-dark-400 text-gray-600 cursor-not-allowed'
            }`}
            title={isLoading ? 'Sending...' : 'Send message'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ===========================
// MAIN COMPONENT
// ===========================

export default function MainGeneration() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModel | null>(null);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [responseType, setResponseType] = useState<'streaming' | 'text'>('streaming');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [currentApiResponse, setCurrentApiResponse] = useState<ApiResponseData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages, isTyping]);

  // ===========================
  // INITIALIZATION
  // ===========================

  useEffect(() => {
    const initializeOpenRouter = async () => {
      try {
        setIsLoadingModels(true);
        setError(null);
        console.log('Initializing OpenRouter...', { service: !!openRouterService, apiKey: !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY });
        
        if (!openRouterService) throw new Error('OpenRouter service not available');
        
        const connected = await openRouterService.testConnection();
        console.log('Connection result:', connected);
        setIsConnected(connected);
        
        if (connected) {
          const models = await openRouterService.getModels();
          setAvailableModels(models);
          
          if (!selectedModel && models.length > 0) {
            const preferredModelIds = ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-001', 'openai/gpt-5', 'meta-llama/llama-4-maverick'];
            const defaultModel = models.find(model => preferredModelIds.includes(model.id)) || models[0];
            setSelectedModel(defaultModel);
          }
        } else {
          setError('Failed to connect to OpenRouter API. Please check your API key.');
        }
      } catch (err) {
        console.error('Error initializing OpenRouter:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize OpenRouter');
        setIsConnected(false);
      } finally {
        setIsLoadingModels(false);
      }
    };
    initializeOpenRouter();
  }, [selectedModel]);

  // ===========================
  // HANDLERS
  // ===========================

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setIsTyping(false);
      
      setMessages(prev => prev.map(msg => 
        msg.type === 'assistant' && msg.isStreaming 
          ? { 
              ...msg, 
              isStreaming: false, 
              content: msg.content + '\n\n---\n\n*Generation stopped by user*',
              timing: msg.timing ? { ...msg.timing, responseEnd: Date.now() } : undefined
            }
          : msg
      ));
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedModel) { setError('Please select a model first'); return; }
    if (!isConnected) { setError('Not connected to OpenRouter API. Please check your connection.'); return; }

    const userMessage: Message = { id: `user-${Date.now()}`, type: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    const controller = new AbortController();
    setAbortController(controller);
    const requestStart = Date.now();

    const apiResponseData: ApiResponseData = {
      id: selectedModel.id,
      author: getModelProvider(selectedModel),
      slug: selectedModel.id.split('/')[1] || selectedModel.id,
      name: getModelDisplayName(selectedModel),
      description: `AI model for ${responseType} responses`,
      isActive: true,
      capabilities: ['text-generation', 'reasoning', 'analysis', 'coding'],
      limits: {
        maxTokens: selectedModel.per_request_limits?.completion_tokens || 4000,
        outputTokenLimit: selectedModel.per_request_limits?.completion_tokens || 4000,
        contextWindow: selectedModel.context_length
      },
      endpoints: { chat: `/api/v1/models/${selectedModel.id}/chat` },
      requestData: {
        model: selectedModel.id,
        messages: [{ role: 'user', content }],
        stream: responseType === 'streaming',
        temperature: 0.7,
        max_tokens: selectedModel.per_request_limits?.completion_tokens || 4000
      },
      timestamp: new Date()
    };
    setCurrentApiResponse(apiResponseData);

    try {
      const apiMessages: OpenRouterMessage[] = [{ role: 'user', content }];
      const request = {
        model: selectedModel.id,
        messages: apiMessages,
        stream: responseType === 'streaming',
        temperature: 0.7,
        max_tokens: selectedModel.per_request_limits?.completion_tokens || 4000
      };

      if (responseType === 'streaming') {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          model: getModelDisplayName(selectedModel),
          responseType: 'streaming',
          isStreaming: true,
          timing: { requestStart }
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);

        let fullContent = '';
        let firstTokenReceived = false;
        let firstTokenTime: number | undefined;
        let finalUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; } | undefined;

        try {
          for await (const chunk of openRouterService.createStreamingCompletion(request, controller)) {
            if (controller.signal.aborted) break;
            
            if (chunk.usage) finalUsage = chunk.usage;
            
            if (chunk.choices[0]?.delta?.content) {
              if (!firstTokenReceived) {
                firstTokenTime = Date.now();
                firstTokenReceived = true;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id ? { 
                    ...msg, 
                    timing: msg.timing ? { ...msg.timing, firstTokenTime } : { requestStart, firstTokenTime }
                  } : msg
                ));
              }
              fullContent += chunk.choices[0].delta.content;
              setMessages(prev => prev.map(msg => msg.id === assistantMessage.id ? { ...msg, content: fullContent } : msg));
            }
          }
        } catch (streamError) {
          if (streamError instanceof Error && streamError.message !== 'Request cancelled by user') {
            throw streamError;
          }
        }

        const responseEnd = Date.now();
        const timeToFirstToken = firstTokenTime ? firstTokenTime - requestStart : undefined;
        const totalResponseTime = responseEnd - requestStart;
        const actualResponseTime = firstTokenTime ? responseEnd - firstTokenTime : undefined;
        const completionTokens = finalUsage?.completion_tokens || 0;

        const finalApiResponse: ApiResponseData = {
          ...apiResponseData,
          responseData: {
            content: fullContent,
            usage: finalUsage,
            timing: { requestStart, firstTokenTime, responseEnd, timeToFirstToken, totalResponseTime, actualResponseTime },
            cost: finalUsage ? calculateCost(finalUsage.prompt_tokens, finalUsage.completion_tokens, selectedModel.pricing) : undefined
          },
          timestamp: new Date()
        };
        setCurrentApiResponse(finalApiResponse);

        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id ? { 
            ...msg, 
            isStreaming: false,
            usage: finalUsage || { prompt_tokens: 0, completion_tokens: completionTokens, total_tokens: completionTokens },
            cost: finalUsage ? calculateCost(finalUsage.prompt_tokens, finalUsage.completion_tokens, selectedModel.pricing) : undefined,
            timing: { requestStart, firstTokenTime, responseEnd, timeToFirstToken, totalResponseTime, actualResponseTime },
            rawResponse: finalApiResponse
          } : msg
        ));
      } else {
        const response = await openRouterService.createCompletion(request, controller);
        if (!response) return;
        
        const content = response.choices[0]?.message?.content || 'No response received';
        const responseEnd = Date.now();
        const totalResponseTime = responseEnd - requestStart;
        const actualResponseTime = totalResponseTime;
        
        const finalApiResponse: ApiResponseData = {
          ...apiResponseData,
          responseData: {
            content,
            usage: response.usage,
            timing: { requestStart, responseEnd, totalResponseTime, actualResponseTime },
            cost: response.usage ? calculateCost(response.usage.prompt_tokens, response.usage.completion_tokens, selectedModel.pricing) : undefined
          },
          timestamp: new Date()
        };
        setCurrentApiResponse(finalApiResponse);
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content,
          timestamp: new Date(),
          model: getModelDisplayName(selectedModel),
          responseType,
          usage: response.usage,
          cost: response.usage ? calculateCost(response.usage.prompt_tokens, response.usage.completion_tokens, selectedModel.pricing) : undefined,
          timing: { requestStart, responseEnd, totalResponseTime, actualResponseTime },
          rawResponse: finalApiResponse
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      if (err instanceof Error && err.message === 'Request cancelled by user') return;
      
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `❌ Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
        timestamp: new Date(),
        model: getModelDisplayName(selectedModel),
        responseType: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setAbortController(null);
    }
  };

  const handleCopy = (content: string) => navigator.clipboard.writeText(content);
  const handleClearChat = () => {
    setMessages([]);
    setCurrentApiResponse(null);
  };

  // ===========================
  // RENDER
  // ===========================

  return (
    <div className="w-full bg-dark-100 flex flex-col h-screen overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 flex flex-col overflow-hidden border-r border-dark-400/30">
          <div className="px-6 py-4 bg-dark-100 border-b border-dark-400/30">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1 w-full lg:max-w-md">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  isOpen={isModelSelectorOpen}
                  onToggle={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                  availableModels={availableModels}
                  isLoading={isLoadingModels}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <ResponseTypeSelector responseType={responseType} onResponseTypeChange={setResponseType} />
                <button
                  onClick={handleClearChat}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">New Chat</span>
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="p-4 space-y-4 min-h-full">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.type === 'user' ? (
                        <UserMessage message={message} />
                      ) : (
                        <AssistantMessage message={message} onCopy={handleCopy} />
                      )}
                    </div>
                  ))}
                  {isTyping && selectedModel && <TypingIndicator model={getModelDisplayName(selectedModel)} />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
          <div className="px-4 pt-4 pb-4">
            <div className="max-w-4xl mx-auto">
              <MessageInput
                onSendMessage={handleSendMessage}
                onStopGeneration={handleStopGeneration}
                isLoading={isLoading}
                isGenerating={isLoading || isTyping}
                placeholder={selectedModel ? `Message ${getModelDisplayName(selectedModel)}...` : "Select a model to start..."}
              />
            </div>
          </div>
        </div>

        <div className="w-1/3 bg-dark-200/50 border-l border-dark-400/30">
          <JsonResponseViewer responseData={currentApiResponse} isStreaming={isLoading || isTyping} />
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center space-x-2 px-3 py-2 bg-dark-300/90 border border-dark-400/50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-300 font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
