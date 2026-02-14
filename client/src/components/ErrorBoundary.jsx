import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container" style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#0a0a0f',
          color: '#f0f0f5',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ color: '#fd5e72', marginBottom: '20px' }}>Something went wrong.</h1>
          <p style={{ color: '#8888a0', marginBottom: '30px' }}>
            The application encountered an unexpected error.
          </p>
          <pre style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '100%',
            overflow: 'auto',
            textAlign: 'left',
            fontSize: '0.9rem',
            color: '#fd5e72',
            border: '1px solid rgba(253, 94, 114, 0.2)'
          }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
            style={{ marginTop: '30px' }}
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
