import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#0a0e1a] p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6">{this.state.message}</p>
            <button onClick={this.handleReset} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
