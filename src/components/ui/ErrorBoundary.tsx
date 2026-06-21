import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary Caught:', error, errorInfo);
    
    // Send to error tracking service (Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50" dir="rtl">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Œÿ«ÌÌ —Œ œ«œ!</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            „ √”›«‰Â „‘ò·Ì œ— ‰„«Ì‘ «Ì‰ ’›ÕÂ ÊÃÊœ œ«—œ. ·ÿ›« œÊ»«—Â  ·«‘ ò‰Ìœ.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="bg-gray-900 text-white p-4 rounded-xl text-xs mb-6 max-w-2xl overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700"
          >
            <RefreshCw className="w-5 h-5" />
            »«—ê–«—Ì „Ãœœ
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}