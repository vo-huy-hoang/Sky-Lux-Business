import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@ant-design/icons', () => ({
  ReloadOutlined: () => <span data-testid="reload-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
}));

import { WidgetErrorBoundary } from '../components/common/widget-error-boundary';


// Mock component that throws when shouldThrow is true
const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Đã xảy ra lỗi render widget');
  }
  return <div data-testid="widget-content">Nội dung widget hoạt động tốt</div>;
};

describe('Phase 25: WidgetErrorBoundary & Graceful Degradation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    // Suppress console.error during test because React logs boundary errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  it('renders children successfully when there is no error', () => {
    renderWithProviders(
      <WidgetErrorBoundary title="Biểu đồ doanh thu">
        <ProblemChild shouldThrow={false} />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByTestId('widget-content')).toBeInTheDocument();
    expect(screen.getByText('Nội dung widget hoạt động tốt')).toBeInTheDocument();
  });

  it('catches render error and displays graceful fallback card with custom title', () => {
    renderWithProviders(
      <WidgetErrorBoundary title="Biểu đồ doanh thu">
        <ProblemChild shouldThrow={true} />
      </WidgetErrorBoundary>,
    );

    expect(screen.queryByTestId('widget-content')).not.toBeInTheDocument();
    expect(screen.getByText('Biểu đồ doanh thu')).toBeInTheDocument();
    expect(screen.getByText(/Đã xảy ra lỗi render widget/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Fallback tùy chỉnh</div>;

    renderWithProviders(
      <WidgetErrorBoundary title="Biểu đồ" fallback={customFallback}>
        <ProblemChild shouldThrow={true} />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('resets error state when clicking "Thử lại"', () => {
    const onResetMock = jest.fn();

    const TestContainer = () => {
      const [hasError, setHasError] = useState(true);
      return (
        <WidgetErrorBoundary
          title="Biểu đồ chi phí"
          onReset={() => {
            onResetMock();
            setHasError(false);
          }}
        >
          <ProblemChild shouldThrow={hasError} />
        </WidgetErrorBoundary>
      );
    };

    renderWithProviders(<TestContainer />);

    expect(screen.getByText('Biểu đồ chi phí')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryButton);

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('widget-content')).toBeInTheDocument();
  });
});
