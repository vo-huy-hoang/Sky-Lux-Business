import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinancialReportingHubNav, REPORTING_TABS } from '@/components/reports/FinancialReportingHubNav';
import { useAuthStore } from '@/lib/stores/auth-store';

const mockPush = jest.fn();
let currentPathname = '/reports';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => currentPathname,
}));

describe('FinancialReportingHubNav Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentPathname = '/reports';
    useAuthStore.setState({
      user: {
        id: 'ceo-user-id',
        email: 'ceo@skylux.vn',
        fullName: 'CEO Admin',
        roles: ['CEO_ADMIN'],
        permissions: ['*'],
      } as any,
    });
  });

  it('renders all 3 reporting and finance tabs with correct labels for CEO', () => {
    render(<FinancialReportingHubNav />);

    expect(screen.getByTestId('financial-reporting-hub-nav')).toBeInTheDocument();
    expect(screen.getByTestId('tab-reports')).toHaveTextContent('Báo cáo quản trị');
    expect(screen.getByTestId('tab-revenue')).toHaveTextContent('Doanh thu & Chi phí');
    expect(screen.getByTestId('tab-kpi')).toHaveTextContent('Chỉ số KPI Sales');
  });

  it('hides KPI Sales tab for OPERATOR role to prevent 403 authorization leaks', () => {
    useAuthStore.setState({
      user: {
        id: 'operator-user-id',
        email: 'operator@skylux.vn',
        fullName: 'Operator Staff',
        roles: ['OPERATOR'],
        permissions: ['dashboard.operator', 'report.view'],
      } as any,
    });

    render(<FinancialReportingHubNav />);

    expect(screen.getByTestId('tab-reports')).toBeInTheDocument();
    expect(screen.getByTestId('tab-revenue')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-kpi')).toBeNull();
  });

  it('highlights the reports tab when on /reports', () => {
    currentPathname = '/reports';
    render(<FinancialReportingHubNav />);

    const reportsTab = screen.getByTestId('tab-reports');
    expect(reportsTab).toHaveAttribute('aria-current', 'page');
    expect(reportsTab.className).toContain('bg-[var(--color-primary-950)]');

    const revenueTab = screen.getByTestId('tab-revenue');
    expect(revenueTab).not.toHaveAttribute('aria-current');
  });

  it('highlights the revenue tab when on /revenue', () => {
    currentPathname = '/revenue';
    render(<FinancialReportingHubNav />);

    const revenueTab = screen.getByTestId('tab-revenue');
    expect(revenueTab).toHaveAttribute('aria-current', 'page');
    expect(revenueTab.className).toContain('bg-[var(--color-primary-950)]');

    const reportsTab = screen.getByTestId('tab-reports');
    expect(reportsTab).not.toHaveAttribute('aria-current');
  });

  it('highlights the kpi tab when on /kpi', () => {
    currentPathname = '/kpi';
    render(<FinancialReportingHubNav />);

    const kpiTab = screen.getByTestId('tab-kpi');
    expect(kpiTab).toHaveAttribute('aria-current', 'page');
    expect(kpiTab.className).toContain('bg-[var(--color-primary-950)]');
  });

  it('calls router.push when clicking a different tab', () => {
    currentPathname = '/reports';
    render(<FinancialReportingHubNav />);

    fireEvent.click(screen.getByTestId('tab-revenue'));
    expect(mockPush).toHaveBeenCalledWith('/revenue');

    fireEvent.click(screen.getByTestId('tab-kpi'));
    expect(mockPush).toHaveBeenCalledWith('/kpi');
  });

  it('does not call router.push when clicking the currently active tab', () => {
    currentPathname = '/reports';
    render(<FinancialReportingHubNav />);

    fireEvent.click(screen.getByTestId('tab-reports'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
