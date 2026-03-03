import React from 'react';

// catches unhandled React errors to prevent the entire app from crashing
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-zinc-300 font-mono">
          <div className="max-w-2xl w-full bg-[#0d0d0d] border border-red-500/30 rounded-xl p-8 shadow-2xl">
            <h1 className="text-red-500 font-bold text-xl mb-4">Application Crashed</h1>
            <p className="text-sm text-zinc-400 mb-6">An unhandled exception occurred in the React component tree.</p>
            <pre className="bg-black p-4 rounded-lg text-xs text-red-400 overflow-x-auto border border-zinc-800">
              {this.state.error?.toString()}
            </pre>
            <button onClick={() => window.location.reload()} className="mt-6 bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded text-sm font-bold text-white transition-colors">
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;