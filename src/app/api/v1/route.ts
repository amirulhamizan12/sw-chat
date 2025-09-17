import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService, OpenRouterRequest, OpenRouterMessage } from '@/services/openrouterService';

// ========== MODEL MAPPING ==========
// Maps our internal model IDs to OpenRouter model IDs
const MODEL_MAPPING: Record<string, string> = {
  'open-router/gemini-2.0-flash-001': 'google/gemini-2.0-flash-001',
  'open-router/gemini-2.5-flash': 'google/gemini-2.5-flash',
  'open-router/gpt-5': 'openai/gpt-5',
  'open-router/gpt-oss-120b': 'openai/gpt-oss-120b',
  'open-router/gpt-oss-20b': 'openai/gpt-oss-20b',
  'open-router/llama-4-maverick': 'meta-llama/llama-4-maverick',
  'open-router/llama-4-scout': 'meta-llama/llama-4-scout',
};

// Helper function to map internal model ID to external OpenRouter model ID
function mapToExternalModelId(internalId: string): string {
  return MODEL_MAPPING[internalId] || internalId;
}

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

function getRateLimitKey(ip: string): string {
  return `rate_limit_${ip}`;
}

function checkRateLimit(ip: string): boolean {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function validateInput(data: unknown): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid request data' };
  }

  const requestData = data as Record<string, unknown>;

  if (!requestData.model || typeof requestData.model !== 'string') {
    return { isValid: false, error: 'Model is required' };
  }

  if (!requestData.messages || !Array.isArray(requestData.messages) || requestData.messages.length === 0) {
    return { isValid: false, error: 'Messages array is required and cannot be empty' };
  }

  // Validate each message
  for (const message of requestData.messages as Array<Record<string, unknown>>) {
    if (!message.role || !message.content) {
      return { isValid: false, error: 'Each message must have role and content' };
    }
    
    if (!['user', 'assistant', 'system'].includes(message.role as string)) {
      return { isValid: false, error: 'Invalid message role' };
    }
    
    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      return { isValid: false, error: 'Message content must be a non-empty string' };
    }
    
    // Sanitize content - remove potentially harmful characters
    if (message.content.length > 10000) {
      return { isValid: false, error: 'Message content too long' };
    }
  }

  if (requestData.temperature !== undefined && (typeof requestData.temperature !== 'number' || requestData.temperature < 0 || requestData.temperature > 2)) {
    return { isValid: false, error: 'Temperature must be between 0 and 2' };
  }

  if (requestData.max_tokens !== undefined && (typeof requestData.max_tokens !== 'number' || requestData.max_tokens < 1 || requestData.max_tokens > 4000)) {
    return { isValid: false, error: 'Max tokens must be between 1 and 4000' };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Create OpenRouter service instance
    const openRouterService = new OpenRouterService(process.env.OPENROUTER_API_KEY);

    // Map internal model ID to external OpenRouter model ID
    const externalModelId = mapToExternalModelId(body.model);
    
    // Prepare request
    const openRouterRequest: OpenRouterRequest = {
      model: externalModelId,
      messages: body.messages as OpenRouterMessage[],
      stream: body.stream || false,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 4000,
    };

    // Handle streaming vs non-streaming
    if (body.stream) {
      // For streaming, we need to return a streaming response
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of openRouterService.createStreamingCompletion(openRouterRequest)) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = `data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await openRouterService.createCompletion(openRouterRequest);
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
