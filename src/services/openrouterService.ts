// ===== TYPES =====
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

// ===== CONSTANTS =====
const BASE_URL = 'https://openrouter.ai/api/v1';
const CACHE_DURATION = 5 * 60 * 1000;
const MODEL_MAP: Record<string, string> = {
  'open-router/gemini-2.0-flash-001': 'google/gemini-2.0-flash-001',
  'open-router/gemini-2.5-flash': 'google/gemini-2.5-flash',
  'open-router/gpt-5': 'openai/gpt-5',
  'open-router/gpt-oss-120b': 'openai/gpt-oss-120b',
  'open-router/gpt-oss-20b': 'openai/gpt-oss-20b',
  'open-router/llama-4-maverick': 'meta-llama/llama-4-maverick',
  'open-router/llama-4-scout': 'meta-llama/llama-4-scout',
};

const REV_MAP = Object.fromEntries(Object.entries(MODEL_MAP).map(([k, v]) => [v, k]));

const getKey = () => typeof window === 'undefined' 
  ? process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
  : process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

const API_KEY = getKey();
if (!API_KEY) console.warn('OpenRouter API key not found. Set OPENROUTER_API_KEY or NEXT_PUBLIC_OPENROUTER_API_KEY.');

// ===== SERVICE =====
export class OpenRouterService {
  private apiKey: string;
  private models: OpenRouterModel[] = [];
  private cache: { data: OpenRouterModel[]; timestamp: number } | null = null;

  constructor(apiKey = API_KEY) {
    this.apiKey = apiKey;
  }

  // ===== HEADERS =====
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://superwizard-studio.vercel.app',
      'X-Title': 'SuperWizard Studio',
    };
  }

  // ===== MODEL MAPPING =====
  private mapToExternalModelId(id: string) { return MODEL_MAP[id] || id; }
  private mapToInternalModelId(id: string) { return REV_MAP[id] || id; }

  // ===== MODELS =====
  async getModels(forceRefresh = false): Promise<OpenRouterModel[]> {
    if (!forceRefresh && this.cache && Date.now() - this.cache.timestamp < CACHE_DURATION) {
      return this.cache.data;
    }

    this.models = this.getPopularModels().map(m => ({
      id: this.mapToInternalModelId(m.id!),
      name: m.name!,
      description: m.description!,
      context_length: m.context_length!,
      pricing: m.pricing!,
      top_provider: { context_length: m.context_length!, pricing: m.pricing! },
      per_request_limits: { prompt_tokens: 0, completion_tokens: 4000 }
    }));
    
    this.cache = { data: this.models, timestamp: Date.now() };
    return this.models;
  }

  // ===== COMPLETION =====
  async createCompletion(req: OpenRouterRequest, abort?: AbortController): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      console.warn('No API key, returning mock response');
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: req.model,
        choices: [{ index: 0, message: { role: 'assistant', content: `Mock response from ${req.model}: Demo response. Set API key for real models.` }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...req, model: this.mapToExternalModelId(req.model) }),
        signal: abort?.signal,
      });

      if (!res.ok) {
        const err: OpenRouterError = await res.json();
        throw new Error(err.error?.message || `API failed: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error('Request cancelled');
      console.error('Completion error:', e);
      throw e;
    }
  }

  // ===== STREAMING =====
  async *createStreamingCompletion(req: OpenRouterRequest, abort?: AbortController): AsyncGenerator<OpenRouterStreamChunk, void, unknown> {
    if (!this.apiKey) {
      console.warn('No API key, mock streaming');
      const words = `Mock streaming from ${req.model}: Demo streaming response. Set API key for real models.`.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        if (abort?.signal.aborted) throw new Error('Request cancelled');
        
        yield {
          id: `mock-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: req.model,
          choices: [{ index: 0, delta: { content: words[i] + (i < words.length - 1 ? ' ' : '') }, finish_reason: i === words.length - 1 ? 'stop' : undefined }]
        };
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...req, model: this.mapToExternalModelId(req.model), stream: true }),
        signal: abort?.signal,
      });

      if (!res.ok) {
        const err: OpenRouterError = await res.json();
        throw new Error(err.error?.message || `Streaming failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          if (abort?.signal.aborted) throw new Error('Request cancelled');

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const data = line.trim();
            if (data.startsWith('data: ')) {
              const chunk = data.slice(6);
              if (chunk === '[DONE]') return;

              try {
                yield JSON.parse(chunk);
              } catch (e) {
                console.warn('Parse error:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error('Request cancelled');
      console.error('Streaming error:', e);
      throw e;
    }
  }

  // ===== UTILITIES =====
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('No API key');
        return false;
      }
      await this.getModels();
      return true;
    } catch (e) {
      console.error('Connection test failed:', e);
      return false;
    }
  }

  getModelById(id: string) { return this.models.find(m => m.id === id); }
  getModelPricing(id: string) { return this.getModelById(id)?.pricing || null; }

  // ===== POPULAR MODELS =====
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

// ===== EXPORTS =====
export const openRouterService = new OpenRouterService();

export const formatModelName = (id: string) => id.split('/').pop() || id;
export const formatProvider = (id: string) => id.split('/')[0] || 'Unknown';
export const calculateCost = (prompt: number, completion: number, pricing: { prompt: string; completion: string }) => 
  parseFloat(pricing.prompt.replace('$', '')) * (prompt / 1000) + parseFloat(pricing.completion.replace('$', '')) * (completion / 1000);
