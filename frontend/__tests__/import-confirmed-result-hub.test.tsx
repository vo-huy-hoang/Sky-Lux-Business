import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ImportConfirmedResult } from '@/app/(main)/imports/components/ImportConfirmedResult';
import { ConfirmImportResponse, ImportSession } from '@/types/import';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Ticket 02: ImportConfirmedResult Actionable Success Hub', () => {
  const mockOnResetSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders single-tour actionable hub with deep-link CTA, revenue, and customer info', async () => {
    const singleTourResult: ConfirmImportResponse = {
      message: 'Import hoàn tất',
      importedRowsCount: 15,
      createdDossiers: [
        {
          dossierId: 'dossier-abc-123',
          code: 'DOS-2026-TOUR01',
          customerName: 'Công ty Cổ phần Alpha',
          totalRevenue: 150000000,
          totalCost: 110000000,
          hasDuplicateWarning: false,
        },
      ],
    };

    render(
      <ImportConfirmedResult
        confirmedResult={singleTourResult}
        onResetSession={mockOnResetSession}
      />,
    );

    // 1. Verify header and tour code
    expect(
      screen.getByText('Nhập dữ liệu dự toán thành công!'),
    ).toBeInTheDocument();
    expect(screen.getByText('DOS-2026-TOUR01')).toBeInTheDocument();
    expect(
      screen.getByText('Khách hàng: Công ty Cổ phần Alpha'),
    ).toBeInTheDocument();

    // 2. Financial metrics
    expect(screen.getByText('150.000.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('110.000.000 ₫')).toBeInTheDocument();

    // 3. Primary deep link CTA
    const primaryCta = screen.getByText(
      /Vào xem & gửi duyệt Tour ngay: DOS-2026-TOUR01/,
    );
    expect(primaryCta).toBeInTheDocument();

    // 4. Clicking primary CTA triggers router.push directly to tour detail
    fireEvent.click(primaryCta);
    expect(mockPush).toHaveBeenCalledWith('/dossiers/dossier-abc-123');

    // 5. Test copy tour code button
    const copyButton = screen.getByLabelText('Sao chép mã tour');
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'DOS-2026-TOUR01',
    );
  });

  it('renders duplicate warning alert when created tour has duplicate warnings flagged', () => {
    const tourWithWarning: ConfirmImportResponse = {
      message: 'Import hoàn tất',
      importedRowsCount: 10,
      createdDossiers: [
        {
          dossierId: 'dossier-dup-999',
          code: 'DOS-2026-DUP01',
          customerName: 'Tập đoàn Beta',
          totalRevenue: 80000000,
          totalCost: 60000000,
          hasDuplicateWarning: true,
        },
      ],
    };

    render(
      <ImportConfirmedResult
        confirmedResult={tourWithWarning}
        onResetSession={mockOnResetSession}
      />,
    );

    expect(
      screen.getByText('Lưu ý cảnh báo trùng lặp'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hồ sơ này có thông tin trùng lặp với tour đã tồn tại trong hệ thống/),
    ).toBeInTheDocument();
  });

  it('renders multi-tour breakdown table with individual deep links when multiple tours are created', () => {
    const multiTourResult: ConfirmImportResponse = {
      message: 'Import hoàn tất',
      importedRowsCount: 25,
      createdDossiers: [
        {
          dossierId: 'tour-1',
          code: 'DOS-2026-MULTI-01',
          customerName: 'Khách hàng 1',
          totalRevenue: 50000000,
          totalCost: 35000000,
          hasDuplicateWarning: false,
        },
        {
          dossierId: 'tour-2',
          code: 'DOS-2026-MULTI-02',
          customerName: 'Khách hàng 2',
          totalRevenue: 75000000,
          totalCost: 55000000,
          hasDuplicateWarning: true,
        },
      ],
    };

    render(
      <ImportConfirmedResult
        confirmedResult={multiTourResult}
        onResetSession={mockOnResetSession}
      />,
    );

    // Multi-tour title
    expect(
      screen.getByText(/Nhập dữ liệu thành công \(2 tour đã tạo\)/),
    ).toBeInTheDocument();

    // Table rows
    expect(screen.getByText('DOS-2026-MULTI-01')).toBeInTheDocument();
    expect(screen.getByText('DOS-2026-MULTI-02')).toBeInTheDocument();
    expect(screen.getByText('Trùng lặp hồ sơ')).toBeInTheDocument();

    // Click link for first tour
    const viewButtons = screen.getAllByText('Vào xem Tour');
    expect(viewButtons).toHaveLength(2);

    fireEvent.click(viewButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/dossiers/tour-1');
  });

  it('renders fallback result card when createdDossiers is empty or legacy', () => {
    const legacySession: ImportSession = {
      id: 'sess-old',
      organizationId: 'org-1',
      fileName: 'old.xlsx',
      fileUrl: '',
      fileSize: 1000,
      status: 'CONFIRMED',
      uploadedBy: 'user-1',
      totalRows: 5,
      processedRows: 5,
      validRows: 5,
      errorRows: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <ImportConfirmedResult
        session={legacySession}
        onResetSession={mockOnResetSession}
      />,
    );

    expect(screen.getByText('Nhập dữ liệu thành công')).toBeInTheDocument();
    expect(
      screen.getByText(/Toàn bộ 5 hồ sơ và thông tin khách hàng đã được lưu trữ thành công/),
    ).toBeInTheDocument();

    const dossiersButton = screen.getByText('Xem danh sách hồ sơ');
    fireEvent.click(dossiersButton);
    expect(mockPush).toHaveBeenCalledWith('/dossiers');

    const resetBtn = screen.getByText('Import file khác');
    fireEvent.click(resetBtn);
    expect(mockOnResetSession).toHaveBeenCalled();
  });
});
