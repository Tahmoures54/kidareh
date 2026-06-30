// src/components/ui/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Optional custom reset handler (default: reload page) */
  onReset?: () => void;
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

    // In production, send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      // Default behaviour: reload page
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50"
          dir="rtl"
        >
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            خطایی رخ داد!
          </h2>
          <p className="text-gray-600 text-center mb-6 max-w-md leading-relaxed">
            متأسفانه مشکلی در برنامه پیش آمده است. لطفاً دوباره تلاش کنید.
          </p>

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="bg-gray-900 text-white p-4 rounded-xl text-xs mb-6 max-w-2xl overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}

          <button
            onClick={this.handleReset}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            بارگذاری مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}