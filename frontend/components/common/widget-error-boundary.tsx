'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Card, Button, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  title?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Widget Error Boundary caught an error:', error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card
          className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
          styles={{ body: { padding: '20px' } }}
        >
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3">
              <WarningOutlined style={{ fontSize: 24 }} />
            </div>
            <Title level={5} className="!mb-1 !text-slate-800">
              {this.props.title || 'Không thể tải thành phần này'}
            </Title>
            <Text className="text-xs text-slate-500 max-w-md mb-4">
              {this.state.error?.message ||
                'Đã có lỗi xảy ra trong quá trình kết xuất dữ liệu. Các thành phần khác vẫn hoạt động bình thường.'}
            </Text>
            <Button
              type="primary"
              size="middle"
              icon={<ReloadOutlined />}
              onClick={this.resetErrorBoundary}
              className="bg-[#003828] hover:bg-[#00543D] text-xs font-medium"
            >
              Thử lại
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export interface WidgetErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  onReset?: () => void;
  fallback?: ReactNode;
}

export function WidgetErrorBoundary({
  children,
  title,
  onReset,
  fallback,
}: WidgetErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          title={title}
          fallback={fallback}
          onReset={() => {
            reset();
            onReset?.();
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
