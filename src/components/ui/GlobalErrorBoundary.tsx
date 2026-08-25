/**
 * Global Error Boundary Component
 * Instagram-level error handling
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { errorLogger } from "../../utils/analytics";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorLogger.logError(error.message, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    this.setState((prev) => ({
      errorCount: prev.errorCount + 1,
    }));
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.state.errorCount > 3) {
        return (
          <div
            className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6"
            dir="rtl"
          >
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              خطای سیستمی
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 text-center max-w-sm">
              متأسفانه مشکلی در برنامه پیش آمد. لطفاً بعداً دوباره تلاش کنید یا با تیم
              پشتیبانی تماس بگیرید.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors"
              >
                <Home className="w-4 h-4" /> بازگشت به خانه
              </button>
            </div>
            {import.meta.env.DEV && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl max-w-md overflow-auto">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  جزئیات خطا:
                </p>
                <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6"
          dir="rtl"
        >
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            خطا در بارگذاری
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 text-center max-w-sm">
            {this.state.error?.message || "مشکلی در برنامه پیش آمد."}
          </p>
          <button
            onClick={this.resetError}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> تلاش مجدد
          </button>

          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl max-w-md overflow-auto">
              <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                جزئیات خطا:
              </p>
              <pre className="text-xs text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap break-words">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export function useErrorHandler() {
  return (error: Error) => {
    errorLogger.logError(error.message, error);
    throw error;
  };
}

export default GlobalErrorBoundary;
