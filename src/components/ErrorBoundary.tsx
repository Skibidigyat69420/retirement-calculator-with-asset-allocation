import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6">
          <div className="max-w-md w-full bg-white border border-[#D1CDC3] rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold text-[#1A233A] mb-4">
              Something went wrong
            </h1>
            <p className="text-[#5C5C5C] mb-6">
              The application encountered an unexpected error. Please try
              reloading the page.
            </p>
            {this.state.error?.message && (
              <pre className="text-left bg-[#F6F4F0] text-sm text-[#A31621] p-4 rounded mb-6 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-2 bg-[#1A233A] text-white rounded hover:bg-[#111111] transition-colors cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
