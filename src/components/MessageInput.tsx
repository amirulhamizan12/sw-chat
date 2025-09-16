"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Loader2, Square } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  isLoading: boolean;
  isGenerating: boolean;
  placeholder?: string;
}

export default function MessageInput({ 
  onSendMessage, 
  onStopGeneration, 
  isLoading, 
  isGenerating, 
  placeholder = "Type your message..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setTimeout(() => { 
        if (textareaRef.current) textareaRef.current.style.height = '24px'; 
      }, 0);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSubmit(); 
    }
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
}
