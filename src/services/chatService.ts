"use client";

import { OpenRouterModel, OpenRouterMessage, OpenRouterResponse, OpenRouterStreamChunk } from './openrouterService';

export interface ChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  success: boolean;
  data?: OpenRouterResponse;
  error?: string;
}

export class ChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }


  async createCompletion(request: ChatRequest): Promise<OpenRouterResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating completion:', error);
      throw error;
    }
  }

  async *createStreamingCompletion(request: ChatRequest): AsyncGenerator<OpenRouterStreamChunk, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
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
      console.error('Error in streaming completion:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection by making a simple chat request
      const testRequest: ChatRequest = {
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      };
      await this.createCompletion(testRequest);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const chatService = new ChatService();
