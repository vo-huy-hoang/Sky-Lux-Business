import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import dayjs from 'dayjs';

import CeoExportActions from '@/components/ceo/widgets/CeoExportActions';
import CeoMetricsGrid from '@/components/ceo/widgets/CeoMetricsGrid';
import CeoRevenueTrendWidget from '@/components/ceo/widgets/CeoRevenueTrendWidget';
import CeoPerformanceTable, {
  CeoSalesRanking,
  CeoDossiersTable,
} from '@/components/ceo/widgets/CeoPerformanceTable';
import OperatorMetricsGrid from '@/components/operator/widgets/OperatorMetricsGrid';
import OperatorDossierStatusTable from '@/components/operator/widgets/OperatorDossierStatusTable';
import OperatorQuickReminders from '@/components/operator/widgets/OperatorQuickReminders';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    if (pseudoElt) {
      return {
        width: '0px',
        height: '0px',
        getPropertyValue: () => '',
      } as any;
    }
    return originalGetComputedStyle.call(this, elt);
  };
});

describe('Ticket 04: Decomposed Dashboard Sub-Widgets', () => {
  describe('CeoExportActions', () => {
    it('renders report period selection and export buttons', () => {
      const onToggleAllTime = jest.fn();
      const onDateChange = jest.fn();

      render(
        <CeoExportActions
          allTime={false}
          onToggleAllTime={onToggleAllTime}
          anchorDate={dayjs('2026-10-01')}
          onDateChange={onDateChange}
          overview={{ totalRevenue: 500000000, totalProfit: 100000000 }}
          totalDossiers={12}
          pendingCount={3}
          sortedChartBreakdown={[{ name: 'Inbound', amount: 500000000 }]}
        />,
      );

      expect(screen.getByText('Kỳ báo cáo')).toBeInTheDocument();
      expect(screen.getByText('Xuất PDF')).toBeInTheDocument();
      expect(screen.getByText('Xuất Excel')).toBeInTheDocument();
    });
  });

  describe('CeoMetricsGrid', () => {
    it('renders all key financial and dossier metrics with drilldown links', () => {
      render(
        <CeoMetricsGrid
          overview={{ totalRevenue: 1500000000, totalProfit: 350000000 }}
          totalDossiers={25}
          pendingCount={4}
          isLoading={false}
          allTime={false}
          currentMonthLabel="Tháng 10/2026"
        />,
      );

      expect(screen.getByText('Doanh thu Tháng 10/2026')).toBeInTheDocument();
      expect(screen.getByText('Lợi nhuận Tháng 10/2026')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ toàn hệ thống')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ chờ duyệt')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('CeoRevenueTrendWidget', () => {
    it('renders revenue trend widget with header and legend', () => {
      render(
        <CeoRevenueTrendWidget
          monthlyTrend={[
            { monthKey: '2026-01', label: 'T1', totalRevenue: 100000000, totalCost: 80000000, totalProfit: 20000000, approvedDossiers: 5 },
            { monthKey: '2026-02', label: 'T2', totalRevenue: 200000000, totalCost: 150000000, totalProfit: 50000000, approvedDossiers: 8 },
          ]}
          isLoadingTrend={false}
          allTime={false}
          selectedYear={2026}
        />,
      );

      expect(screen.getByText('Doanh thu theo tháng')).toBeInTheDocument();
      expect(screen.getByText('Năm 2026')).toBeInTheDocument();
      expect(screen.getByText('Doanh thu (đ)')).toBeInTheDocument();
      expect(screen.getByText('Lợi nhuận (đ)')).toBeInTheDocument();
    });
  });

  describe('CeoPerformanceTable', () => {
    it('renders sales ranking and latest dossiers', () => {
      const mockSales = [
        {
          salesUserId: 'u1',
          salesUserName: 'Nguyễn Văn A',
          totalRevenue: 300000000,
          totalCost: 200000000,
          totalProfit: 100000000,
          totalDossiers: 5,
          approvedDossiers: 4,
          completedDossiers: 3,
          completionRate: 80,
          rank: 1,
          progress: 100,
        },
      ];

      const mockDossiers = [
        {
          id: 'dos-1',
          code: 'DOS-2026-001',
          name: 'Tour Nhật Bản',
          status: 'IN_REVIEW',
          updatedAt: '2026-10-25T10:00:00Z',
        },
      ];

      render(
        <CeoPerformanceTable
          topSalesList={mockSales}
          latestDossiers={mockDossiers as any}
          isLoadingSales={false}
          isLoadingDossiers={false}
        />,
      );

      expect(screen.getByText('Top 5 Sales theo doanh thu')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ toàn hệ thống - Cập nhật gần nhất')).toBeInTheDocument();
      expect(screen.getByText('DOS-2026-001')).toBeInTheDocument();
    });
  });

  describe('OperatorMetricsGrid', () => {
    it('renders operational cards with accessible region', () => {
      render(
        <OperatorMetricsGrid
          totalDossiersCount={15}
          pendingApprovalsCount={3}
          activeDossiers={8}
          priorityDossiers={2}
          totalSuppliers={20}
          isLoading={false}
        />,
      );

      expect(screen.getByLabelText('Chỉ số vận hành điều hành')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ toàn hệ thống')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ chờ duyệt')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ đang xử lý')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Ưu tiên cao / Khẩn cấp')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Nhà cung cấp đối tác')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('OperatorDossierStatusTable', () => {
    it('renders dossier status table with columns and link', () => {
      const mockDossiers = [
        {
          id: 'dos-op-1',
          code: 'DOS-OP-001',
          salesUser: { fullName: 'Trần Thị B' },
          customer: { displayName: 'FPT Corp' },
          startDate: '2026-11-01',
          status: 'APPROVED',
        },
      ];

      render(
        <OperatorDossierStatusTable
          recentDossiers={mockDossiers as any}
          loading={false}
        />,
      );

      expect(screen.getByText('Hồ sơ gần đây')).toBeInTheDocument();
      expect(screen.getByText('DOS-OP-001')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
      expect(screen.getByText('FPT Corp')).toBeInTheDocument();
      expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    });
  });

  describe('OperatorQuickReminders', () => {
    it('renders actionable reminders with links to tasks, priority dossiers, and suppliers', () => {
      render(
        <OperatorQuickReminders
          overdueTasks={4}
          priorityDossiers={2}
          totalSuppliers={18}
        />,
      );

      expect(screen.getByText('Nhắc nhở vận hành')).toBeInTheDocument();
      expect(screen.getByText('Quá hạn công việc')).toBeInTheDocument();
      expect(screen.getByText('4 công việc cần đôn đốc hạn xử lý')).toBeInTheDocument();
      expect(screen.getByText('Ưu tiên xử lý')).toBeInTheDocument();
      expect(screen.getByText('2 hồ sơ mức độ ưu tiên cao')).toBeInTheDocument();
      expect(screen.getByText('Mạng lưới đối tác')).toBeInTheDocument();
      expect(screen.getByText('18 nhà cung cấp đang sẵn sàng')).toBeInTheDocument();
    });
  });
});
