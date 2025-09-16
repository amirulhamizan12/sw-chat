"use client";
import { useState, useRef, useEffect } from 'react';
import { Zap, MessageSquare, Copy, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { OpenRouterModel, OpenRouterMessage, formatModelName, formatProvider, calculateCost, OpenRouterService } from '@/services/openrouterService';
import { chatService, ChatRequest } from '@/services/chatService';
import ModelSelector from './ModelSelector';
import MessageInput from './MessageInput';

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
  rawResponse?: ApiResponseData;
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
  requestData?: {
    model?: string;
    messages?: Array<{ content?: string; role?: string; }>;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
  };
  responseData?: {
    content?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
    timing?: Record<string, unknown>;
    cost?: number;
  };
  timestamp: Date;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

const getModelDisplayName = (model: OpenRouterModel) => formatModelName(model.id);
const getModelProvider = (model: OpenRouterModel) => formatProvider(model.id);
const formatTime = (ms: number) => ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;


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
      message: data.requestData?.messages?.[0]?.content || 'No message',
      stream: data.requestData?.stream,
      temperature: data.requestData?.temperature,
      max_tokens: data.requestData?.max_tokens
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
    const initializeChat = async () => {
      try {
        setError(null);
        console.log('Initializing chat service...');
        
        // Load models directly from OpenRouterService (no API call needed)
        const openRouterService = new OpenRouterService();
        const models = await openRouterService.getModels();
        
        setAvailableModels(models);
        setIsConnected(true); // Always connected since we have hardcoded models
        
        if (!selectedModel && models.length > 0) {
          const preferredModelIds = ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-001', 'openai/gpt-5', 'meta-llama/llama-4-maverick'];
          const defaultModel = models.find(model => preferredModelIds.includes(model.id)) || models[0];
          setSelectedModel(defaultModel);
        }
        
        console.log('Chat service initialized with', models.length, 'models');
      } catch (err) {
        console.error('Error initializing chat service:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat service');
        setIsConnected(false);
      }
    };
    initializeChat();
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

  const sanitizeInput = (input: string): string => {
    // Remove potentially harmful characters and limit length
    return input
      .replace(/[<>]/g, '') // Remove < and > to prevent XSS
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 10000); // Limit to 10k characters
  };

  const validateInput = (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (input.length > 10000) {
      return { isValid: false, error: 'Message too long (max 10,000 characters)' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Message contains potentially harmful content' };
      }
    }
    
    return { isValid: true };
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedModel) { setError('Please select a model first'); return; }
    if (!isConnected) { setError('Not connected to chat service. Please check your connection.'); return; }

    // Validate and sanitize input
    const validation = validateInput(content);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    const sanitizedContent = sanitizeInput(content);

    const userMessage: Message = { id: `user-${Date.now()}`, type: 'user', content: sanitizedContent, timestamp: new Date() };
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
      const apiMessages: OpenRouterMessage[] = [{ role: 'user', content: sanitizedContent }];
      const request: ChatRequest = {
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
          for await (const chunk of chatService.createStreamingCompletion(request)) {
            if (controller.signal.aborted) break;
            
            if (chunk.usage) finalUsage = chunk.usage;
            
            // Safe access to chunk.choices with proper null/undefined checks
            if (chunk.choices && Array.isArray(chunk.choices) && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
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
            } else if (chunk.choices && Array.isArray(chunk.choices) && chunk.choices.length > 0) {
              // Log when we have choices but no content (for debugging)
              console.log('Streaming chunk received with choices but no content:', chunk.choices[0]);
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
        const response = await chatService.createCompletion(request);
        if (!response) return;
        
        // Safe access to response.choices with proper null/undefined checks
        const content = (response.choices && Array.isArray(response.choices) && response.choices.length > 0 && response.choices[0]?.message?.content) 
          ? response.choices[0].message.content 
          : 'No response received';
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
