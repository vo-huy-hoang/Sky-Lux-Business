import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { SupplierManagementContent } from '@/app/(main)/suppliers/components/SupplierManagementContent';
import { suppliersService } from '@/services/suppliers.service';
import { parseSupplierExcel } from '@/app/(main)/suppliers/utils/excel-supplier-parser';

// Mocks
jest.mock('@/services/suppliers.service', () => ({
  suppliersService: {
    getSuppliers: jest.fn(),
    batchCreateSuppliers: jest.fn(),
    deleteSupplier: jest.fn(),
  },
}));

jest.mock('@/app/(main)/suppliers/utils/excel-supplier-parser', () => ({
  parseSupplierExcel: jest.fn(),
}));

jest.mock('@/app/(main)/suppliers/components/SupplierFormModal', () => ({
  SupplierFormModal: () => null,
}));

jest.mock('@/app/(main)/suppliers/components/SupplierDetailDrawer', () => ({
  SupplierDetailDrawer: () => null,
}));

describe('SupplierManagementContent - Import Preview Modal (Ticket 02)', () => {
  let queryClient: QueryClient;

  // Generate 42 sample rows matching the user's Excel files
  const mock42Rows = Array.from({ length: 42 }, (_, index) => {
    const num = index + 1;
    const code = `SUP${num < 10 ? '0' + num : num}`;
    let name = `Nhà cung cấp số ${num}`;
    let type = 'Dịch vụ xe';

    if (num === 1) {
      name = 'TRIỆU BẢO Ý';
      type = 'Dịch vụ xe';
    } else if (num === 2) {
      name = 'KIM HÙNG';
      type = 'Dịch vụ xe';
    } else if (num === 8) {
      name = 'MẸT HỘI AN';
      type = 'Nhà hàng';
    } else if (num > 7 && num <= 30) {
      type = 'Nhà hàng';
    } else if (num > 30 && num <= 34) {
      type = 'Vé máy bay';
    } else {
      type = 'Vé tham quan';
    }

    return {
      sourceRow: index + 3,
      input: {
        code,
        name,
        supplierTypeName: type,
      },
    };
  });

  const mockParseResult = {
    fileName: 'Danh_sach_nha_cung_cap.xlsx',
    sheetName: 'NCC',
    totalRowsScanned: 45,
    rows: mock42Rows,
    errors: [],
    strategyUsed: 'PATTERN_BASED' as const,
  };

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
      return originalGetComputedStyle ? originalGetComputedStyle.call(this, elt) : ({
        width: '0px',
        height: '0px',
        getPropertyValue: () => '',
      } as any);
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    (suppliersService.getSuppliers as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <SupplierManagementContent />
        </AntdApp>
      </QueryClientProvider>,
    );
  };

  it('renders preview modal with full 42 rows, strategy badge, and pagination info', async () => {
    (parseSupplierExcel as jest.Mock).mockResolvedValueOnce(mockParseResult);

    renderComponent();

    const fileInput = screen.getByLabelText('Chọn file Excel nhà cung cấp');
    const mockFile = new File(['dummy content'], 'Danh_sach_nha_cung_cap.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(16));

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Modal opens
    expect(await screen.findByText('Import nhà cung cấp từ Excel')).toBeInTheDocument();

    // Summary texts
    expect(screen.getByText('Danh_sach_nha_cung_cap.xlsx')).toBeInTheDocument();
    expect(screen.getByText('NCC')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Tự động nhận diện tiền tố dịch vụ')).toBeInTheDocument();

    // Verification: Notice "Đang xem trước 8 dòng đầu tiên" is NOT present
    expect(screen.queryByText(/Đang xem trước 8 dòng/i)).not.toBeInTheDocument();

    // Pagination info
    expect(screen.getByText(/1-10 của 42 dòng hợp lệ/i)).toBeInTheDocument();

    // First page items rendered
    expect(screen.getByText('TRIỆU BẢO Ý')).toBeInTheDocument();
    expect(screen.getByText('KIM HÙNG')).toBeInTheDocument();
    expect(screen.getByText('SUP01')).toBeInTheDocument();
  });

  it('filters preview rows when typing in the search input', async () => {
    (parseSupplierExcel as jest.Mock).mockResolvedValueOnce(mockParseResult);

    renderComponent();

    const fileInput = screen.getByLabelText('Chọn file Excel nhà cung cấp');
    const mockFile = new File(['dummy'], 'test.xlsx');
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(await screen.findByText('Import nhà cung cấp từ Excel')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      'Tìm kiếm nhanh trong danh sách xem trước (Mã, Tên, Loại)...',
    );

    // Search for "MẸT" (which is SUP08, row 8)
    fireEvent.change(searchInput, { target: { value: 'MẸT' } });

    await waitFor(() => {
      expect(screen.getByText('MẸT HỘI AN')).toBeInTheDocument();
      expect(screen.queryByText('TRIỆU BẢO Ý')).not.toBeInTheDocument();
      expect(screen.getByText('Tìm thấy 1 / 42 dòng')).toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('TRIỆU BẢO Ý')).toBeInTheDocument();
      expect(screen.queryByText('Tìm thấy 1 / 42 dòng')).not.toBeInTheDocument();
    });
  });

  it('calls batchCreateSuppliers with ALL 42 rows when clicking Tiến hành import', async () => {
    (parseSupplierExcel as jest.Mock).mockResolvedValueOnce(mockParseResult);
    (suppliersService.batchCreateSuppliers as jest.Mock).mockResolvedValueOnce({
      total: 42,
      imported: 42,
      items: [],
    });

    renderComponent();

    const fileInput = screen.getByLabelText('Chọn file Excel nhà cung cấp');
    const mockFile = new File(['dummy'], 'test.xlsx');
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(await screen.findByText('Import nhà cung cấp từ Excel')).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /Tiến hành import/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(suppliersService.batchCreateSuppliers).toHaveBeenCalledTimes(1);
    });

    const callPayload = (suppliersService.batchCreateSuppliers as jest.Mock).mock.calls[0][0];
    expect(callPayload.suppliers).toHaveLength(42);
    expect(callPayload.suppliers[0]).toEqual({
      code: 'SUP01',
      name: 'TRIỆU BẢO Ý',
      supplierTypeName: 'Dịch vụ xe',
    });
    expect(callPayload.suppliers[7]).toEqual({
      code: 'SUP08',
      name: 'MẸT HỘI AN',
      supplierTypeName: 'Nhà hàng',
    });

    // After success, modal closes and internal preview content unmounts
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(
          'Tìm kiếm nhanh trong danh sách xem trước (Mã, Tên, Loại)...',
        ),
      ).not.toBeInTheDocument();
    });
  });
});
