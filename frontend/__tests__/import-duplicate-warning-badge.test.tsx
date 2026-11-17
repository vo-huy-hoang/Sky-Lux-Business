import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@rc-component/util/lib/getScrollBarSize', () => ({
  __esModule: true,
  default: () => 0,
  getTargetScrollBarSize: () => ({ width: 0, height: 0 }),
}));

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

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as any;
global.ResizeObserver = MockResizeObserver as any;

import { ImportPreviewTable } from '@/app/(main)/imports/components/ImportPreviewTable';
import { ImportFloatingActionBar } from '@/app/(main)/imports/components/ImportFloatingActionBar';
import { ImportErrorSidebar } from '@/app/(main)/imports/components/ImportErrorSidebar';
import { ImportSession, PaginatedImportRowsResponse } from '@/types/import';

describe('Ticket 04: Import Preview Duplicate Conflict Warning Badges', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockDuplicateRow = {
    id: 'row-dup-1',
    sessionId: 'session-123',
    sheetName: 'Dự toán',
    rowNumber: 2,
    status: 'VALID' as const,
    rawData: {
      'Tên hồ sơ': 'Tour Hạ Long Mùa Hè',
      'Tên khách hàng': 'Tập đoàn Vingroup',
      'Tuyến đường': 'Hà Nội - Hạ Long',
      __importFormat: 'SKYLUX_CUSTOMER_BUDGET',
      __revenueLines: [
        { description: 'Vé tour', quantity: 10, unitPrice: 5000000 },
      ],
      __costLines: [
        {
          id: 'cost-1',
          description: 'Khách sạn',
          quantity: 5,
          unitPrice: 2000000,
          totalAmount: 10000000,
        },
      ],
    },
    normalizedData: {
      name: 'Tour Hạ Long Mùa Hè',
      customerName: 'Tập đoàn Vingroup',
      route: 'Hà Nội - Hạ Long',
      warnings: [
        {
          type: 'DUPLICATE_ACTIVE_DOSSIER',
          existingDossierId: 'active-dos-uuid-1',
          existingDossierCode: 'TOUR-HL-ACTIVE-01',
          message: 'Hồ sơ có nguy cơ trùng lặp với hồ sơ đang hoạt động [Mã: TOUR-HL-ACTIVE-01].',
        },
      ],
      hasWarning: true,
    },
    warnings: [
      {
        type: 'DUPLICATE_ACTIVE_DOSSIER',
        existingDossierId: 'active-dos-uuid-1',
        existingDossierCode: 'TOUR-HL-ACTIVE-01',
        message: 'Hồ sơ có nguy cơ trùng lặp với hồ sơ đang hoạt động [Mã: TOUR-HL-ACTIVE-01].',
      },
    ],
    hasWarning: true,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
  };

  const mockCleanRow = {
    ...mockDuplicateRow,
    id: 'row-clean-2',
    warnings: [],
    hasWarning: false,
    normalizedData: {
      ...mockDuplicateRow.normalizedData,
      warnings: [],
      hasWarning: false,
    },
  };

  const mockSession: ImportSession = {
    id: 'session-123',
    organizationId: 'org-test',
    fileName: 'Tour_Du_Toan.xlsx',
    fileUrl: '/uploads/Tour_Du_Toan.xlsx',
    fileSize: 10240,
    status: 'READY_FOR_REVIEW',
    uploadedBy: 'user-sales-1',
    totalRows: 1,
    processedRows: 1,
    validRows: 1,
    errorRows: 0,
    summary: { warningRows: 1 },
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
  };

  const mockPreviewDuplicate: PaginatedImportRowsResponse = {
    data: [mockDuplicateRow],
    meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  };

  const mockPreviewClean: PaginatedImportRowsResponse = {
    data: [mockCleanRow],
    meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  };

  describe('ImportPreviewTable with duplicate warning', () => {
    it('renders Header Alert Banner and Amber Warning Badge when duplicate active dossier is detected', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ImportPreviewTable
            session={mockSession}
            previewData={mockPreviewDuplicate}
            isLoading={false}
          />
        </QueryClientProvider>,
      );

      // 1. Header Alert Banner
      expect(
        screen.getByText('Cảnh báo trùng lặp hồ sơ đang hoạt động'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Phát hiện.*dòng có thông tin trùng với hồ sơ đang chạy/i),
      ).toBeInTheDocument();

      // 2. Amber Warning Badge on metadata card
      expect(screen.getByText(/Trùng hồ sơ hiện có/i)).toBeInTheDocument();
      expect(screen.getByText('[TOUR-HL-ACTIVE-01]')).toBeInTheDocument();
    });

    it('does not render warning banner or badge when preview row is clean', () => {
      const cleanSession: ImportSession = {
        ...mockSession,
        summary: { warningRows: 0 },
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ImportPreviewTable
            session={cleanSession}
            previewData={mockPreviewClean}
            isLoading={false}
          />
        </QueryClientProvider>,
      );

      expect(
        screen.queryByText('Cảnh báo trùng lặp hồ sơ đang hoạt động'),
      ).toBeNull();
      expect(screen.queryByText(/Trùng hồ sơ hiện có/i)).toBeNull();
    });
  });

  describe('ImportFloatingActionBar with duplicate warning', () => {
    it('prompts user with duplicate warning dialog before confirming import', async () => {
      const handleConfirm = jest.fn();

      render(
        <ImportFloatingActionBar
          session={mockSession}
          previewData={mockPreviewDuplicate}
          isValidating={false}
          isConfirming={false}
          canConfirm={true}
          onValidate={jest.fn()}
          onConfirm={handleConfirm}
        />,
      );

      // Button reflects warning state
      const confirmBtn = screen.getByRole('button', {
        name: /Nhập 1 hồ sơ \(có cảnh báo\)/i,
      });
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);

      // Popconfirm prompt opens with warning text
      await waitFor(() => {
        expect(
          screen.getByText('Xác nhận nhập dữ liệu dù có cảnh báo trùng lặp?'),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Phát hiện 1 dòng trùng với hồ sơ đang chạy/i),
        ).toBeInTheDocument();
      });

      // Confirm button in popconfirm
      const proceedBtn = screen.getByRole('button', {
        name: /Vẫn tiếp tục nhập/i,
      });
      fireEvent.click(proceedBtn);

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('renders standard confirmation prompt when no duplicate warning exists', () => {
      const cleanSession: ImportSession = {
        ...mockSession,
        summary: { warningRows: 0 },
      };

      render(
        <ImportFloatingActionBar
          session={cleanSession}
          previewData={mockPreviewClean}
          isValidating={false}
          isConfirming={false}
          canConfirm={true}
          onValidate={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );

      expect(
        screen.getByRole('button', { name: /Xác nhận import/i }),
      ).toBeInTheDocument();
    });
  });

  describe('ImportErrorSidebar with duplicate warning', () => {
    it('renders duplicate conflict alert box in sidebar summary', () => {
      render(
        <ImportErrorSidebar
          session={mockSession}
          previewData={mockPreviewDuplicate}
        />,
      );

      expect(
        screen.getByText('Cảnh báo trùng lặp: 1 hồ sơ'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Phát hiện thông tin trùng với hồ sơ đang chạy. Vui lòng kiểm tra kỹ trước khi xác nhận nhập./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
