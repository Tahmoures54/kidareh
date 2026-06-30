import React, { Component, ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export class HomeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error): State { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Home Page Error:", error, errorInfo); }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
          <h2 className="text-lg font-black text-rose-600">مشکلی پیش آمد!</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">لطفاً صفحه را مجدداً بارگذاری کنید.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">بارگذاری مجدد</button>
        </div>
      );
    }
    return this.props.children;
  }
}