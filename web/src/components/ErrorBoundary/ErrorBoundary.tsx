/**
 * ErrorBoundary Component
 * 全局错误边界组件 - 捕获并处理 React 组件树中的错误
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // 刷新页面
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle="抱歉，页面遇到了一些问题。请尝试刷新页面或联系技术支持。"
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReset}>
                刷新页面
              </Button>,
              <Button key="home" onClick={() => (window.location.href = '/dashboard')}>
                返回首页
              </Button>,
            ]}
          >
            {this.state.error && (
              <div style={{ textAlign: 'left', marginTop: 24 }}>
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary>错误详情</summary>
                  <p style={{ color: 'red' }}>{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <p style={{ color: '#666', fontSize: 12 }}>
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </details>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
