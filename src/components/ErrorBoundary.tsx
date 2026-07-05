import * as React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends (React.Component as any) {
  // Explicitly type fields to satisfy TS
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-2xl mx-auto my-12 shadow-md">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 text-rose-600 mb-6">
            <ShieldAlert className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-black font-display tracking-tight text-[#0B1E3F]">
                {this.props.fallbackTitle || 'Component Rendering Error'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                The application encountered an unexpected runtime crash in this section.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-mono text-rose-700 font-semibold">
              <strong>Error Message:</strong> {this.state.error?.toString()}
            </div>

            {this.state.errorInfo && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono text-slate-600 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                <strong>Component Stack Trace:</strong>
                {this.state.errorInfo.componentStack}
              </div>
            )}

            {this.state.error?.stack && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono text-slate-600 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                <strong>Error Stack Trace:</strong>
                {this.state.error.stack}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#0B1E3F] hover:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
