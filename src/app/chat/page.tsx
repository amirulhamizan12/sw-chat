"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import MainGeneration from "@/components/chatInterface";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-200 border border-red-500/30 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-400 mb-4">
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-primary hover:bg-blue-hover text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <MainGeneration />
    </ErrorBoundary>
  );
}
