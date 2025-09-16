// ========== TYPES & INTERFACES ==========
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: { prompt: string; completion: string; };
  top_provider: { context_length: number; pricing: { prompt: string; completion: string; }; };
  per_request_limits: { prompt_tokens: number; completion_tokens: number; };
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{ index: number; message: { role: string; content: string; }; finish_reason: string; }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
}

export interface OpenRouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{ index: number; delta: { role?: string; content?: string; }; finish_reason?: string; }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
}

export interface OpenRouterError {
  error: { message: string; type: string; code?: string; };
}

// ========== CONFIGURATION ==========
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Support both client and server-side API key access
const getApiKey = (): string => {
  // Server-side: try OPENROUTER_API_KEY first, then NEXT_PUBLIC_OPENROUTER_API_KEY
  if (typeof window === 'undefined') {
    return process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  }
  // Client-side: only NEXT_PUBLIC_OPENROUTER_API_KEY
  return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
};

const OPENROUTER_API_KEY = getApiKey();

if (!OPENROUTER_API_KEY) {
  console.warn('OpenRouter API key not found. Please set OPENROUTER_API_KEY (server-side) or NEXT_PUBLIC_OPENROUTER_API_KEY (client-side) in your environment variables.');
}

// ========== SERVICE CLASS ==========
export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private models: OpenRouterModel[] = [];
  private modelsCache: { data: OpenRouterModel[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || OPENROUTER_API_KEY || '';
    this.baseUrl = OPENROUTER_BASE_URL;
  }

  // ========== AUTHENTICATION ==========
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://superwizard-studio.vercel.app',
      'X-Title': 'SuperWizard Studio',
    };
  }

  // ========== MODELS MANAGEMENT ==========
  async getModels(forceRefresh = false): Promise<OpenRouterModel[]> {
    if (!forceRefresh && this.modelsCache) {
      const now = Date.now();
      if (now - this.modelsCache.timestamp < this.CACHE_DURATION) return this.modelsCache.data;
    }

    // Always return only our curated models, regardless of API key status
    const curatedModels = this.getPopularModels().map(model => ({
      id: model.id!,
      name: model.name!,
      description: model.description!,
      context_length: model.context_length!,
      pricing: model.pricing!,
      top_provider: { context_length: model.context_length!, pricing: model.pricing! },
      per_request_limits: { prompt_tokens: 0, completion_tokens: 4000 }
    }));
    
    this.models = curatedModels;
    this.modelsCache = { data: this.models, timestamp: Date.now() };
    return this.models;
  }

  // ========== CHAT COMPLETION ==========
  async createCompletion(request: OpenRouterRequest, abortController?: AbortController): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      console.warn('No API key provided, returning mock response');
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: `Mock response from ${request.model}: This is a demo response. Please set your OpenRouter API key to use real AI models.` },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData: OpenRouterError = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled by user');
      }
      console.error('Error creating completion:', error);
      throw error;
    }
  }

  // ========== STREAMING COMPLETION ==========
  async *createStreamingCompletion(request: OpenRouterRequest, abortController?: AbortController): AsyncGenerator<OpenRouterStreamChunk, void, unknown> {
    if (!this.apiKey) {
      console.warn('No API key provided, returning mock streaming response');
      const mockContent = `Mock streaming response from ${request.model}: This is a demo streaming response. Please set your OpenRouter API key to use real AI models.`;
      const words = mockContent.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        // Check if request was cancelled
        if (abortController?.signal.aborted) {
          throw new Error('Request cancelled by user');
        }
        
        yield {
          id: `mock-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: request.model,
          choices: [{
            index: 0,
            delta: { content: words[i] + (i < words.length - 1 ? ' ' : '') },
            finish_reason: i === words.length - 1 ? 'stop' : undefined
          }]
        };
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...request, stream: true }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData: OpenRouterError = await response.json();
        throw new Error(errorData.error?.message || `Streaming request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          // Check if request was cancelled before reading
          if (abortController?.signal.aborted) {
            throw new Error('Request cancelled by user');
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);
              if (data === '[DONE]') return;

              try {
                const chunk: OpenRouterStreamChunk = JSON.parse(data);
                yield chunk;
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled by user');
      }
      console.error('Error in streaming completion:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('No OpenRouter API key provided. Please set NEXT_PUBLIC_OPENROUTER_API_KEY');
        return false;
      }
      await this.getModels();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  getModelById(modelId: string): OpenRouterModel | undefined {
    return this.models.find(model => model.id === modelId);
  }

  getModelPricing(modelId: string): { prompt: string; completion: string } | null {
    const model = this.getModelById(modelId);
    return model?.pricing || null;
  }

  // ========== AVAILABLE MODELS ==========
  getPopularModels(): Partial<OpenRouterModel>[] {
    return [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Google\'s fastest and most efficient model', context_length: 1000000, pricing: { prompt: '$0.000075', completion: '$0.0003' } },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Google\'s latest generation model with improved reasoning', context_length: 1000000, pricing: { prompt: '$0.000075', completion: '$0.0003' } },
      { id: 'openai/gpt-5', name: 'GPT-5', description: 'OpenAI\'s most advanced model with enhanced capabilities', context_length: 128000, pricing: { prompt: '$0.005', completion: '$0.015' } },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', description: 'Open source model with 120B parameters', context_length: 128000, pricing: { prompt: '$0.0002', completion: '$0.0002' } },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', description: 'Open source model with 20B parameters', context_length: 128000, pricing: { prompt: '$0.0001', completion: '$0.0001' } },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', description: 'Meta\'s latest Llama model with advanced capabilities', context_length: 128000, pricing: { prompt: '$0.0003', completion: '$0.0003' } },
      { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', description: 'Meta\'s efficient Llama model for fast responses', context_length: 128000, pricing: { prompt: '$0.0002', completion: '$0.0002' } }
    ];
  }
}

// ========== SINGLETON & HELPERS ==========
export const openRouterService = OPENROUTER_API_KEY ? new OpenRouterService() : new OpenRouterService('');

export const formatModelName = (modelId: string): string => {
  const parts = modelId.split('/');
  return parts[parts.length - 1] || modelId;
};

export const formatProvider = (modelId: string): string => {
  const parts = modelId.split('/');
  return parts[0] || 'Unknown';
};

export const calculateCost = (promptTokens: number, completionTokens: number, pricing: { prompt: string; completion: string }): number => {
  const promptCost = parseFloat(pricing.prompt.replace('$', '')) * (promptTokens / 1000);
  const completionCost = parseFloat(pricing.completion.replace('$', '')) * (completionTokens / 1000);
  return promptCost + completionCost;
};
