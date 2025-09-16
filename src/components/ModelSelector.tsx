"use client";

import { useRef, useEffect } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { OpenRouterModel, formatModelName, formatProvider } from '@/services/openrouterService';

interface ModelSelectorProps {
  selectedModel: OpenRouterModel | null;
  onModelChange: (model: OpenRouterModel) => void;
  isOpen: boolean;
  onToggle: () => void;
  availableModels: OpenRouterModel[];
}

export default function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  isOpen, 
  onToggle, 
  availableModels
}: ModelSelectorProps) {
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

  const getModelDisplayName = (model: OpenRouterModel) => formatModelName(model.id);
  const getModelProvider = (model: OpenRouterModel) => formatProvider(model.id);
  const getModelCost = (model: OpenRouterModel) => `${model.pricing.prompt}/${model.pricing.completion} per 1K tokens`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 bg-dark-200 border border-dark-400/40 rounded-lg hover:bg-dark-300 hover:border-orange-500/40 group"
      >
        <div className="flex items-center space-x-2">
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
            {availableModels.length === 0 ? (
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
}
