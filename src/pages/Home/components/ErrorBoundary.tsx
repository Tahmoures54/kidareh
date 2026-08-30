import React, { Component, ErrorInfo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class HomeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Home Page Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            اوه! مشکلی پیش آمد
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
            یک خطای غیرمنتظره رخ داده است. لطفاً صفحه را رفرش کنید.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> بارگذاری مجدد
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
