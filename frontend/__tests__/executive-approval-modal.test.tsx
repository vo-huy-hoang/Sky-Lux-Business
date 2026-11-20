import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExecutiveApprovalModal } from '@/app/(main)/approvals/components/ExecutiveApprovalModal';
import { EstimateItem, EstimateStatus } from '@/types/estimate';
import { workflowService } from '@/services/workflow.service';
import { estimatesService } from '@/services/estimates.service';
import { dossiersService } from '@/services/dossiers.service';

jest.mock('@/services/workflow.service', () => ({
  workflowService: {
    approve: jest.fn(),
    requestChanges: jest.fn(),
  },
}));

jest.mock('@/services/estimates.service', () => ({
  estimatesService: {
    getEstimate: jest.fn(),
  },
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossier: jest.fn(),
  },
}));

describe('Ticket 04: ExecutiveApprovalModal (CEO Fast-Track Approval)', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockEstimate: EstimateItem = {
    id: 'est-123',
    organizationId: 'org-1',
    dossierId: 'dossier-456',
    versionNo: 1,
    status: EstimateStatus.SUBMITTED,
    currency: 'VND',
    totalRevenue: 200000000,
    totalCost: 150000000,
    totalProfit: 50000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dossier: {
      id: 'dossier-456',
      code: 'DOS-2026-SUN',
      name: 'Tour Khám phá Đà Nẵng 4N3Đ',
      route: 'Hà Nội - Đà Nẵng',
      customer: {
        id: 'cust-1',
        displayName: 'Tập đoàn Sun Group',
      },
    },
  };

  const mockDossier = {
    id: 'dossier-456',
    code: 'DOS-2026-SUN',
    name: 'Tour Khám phá Đà Nẵng 4N3Đ',
    route: 'Hà Nội - Đà Nẵng',
    startDate: '2026-06-15T00:00:00.000Z',
    endDate: '2026-06-19T00:00:00.000Z',
    status: 'SUBMITTED',
    version: 3,
    salesUser: {
      id: 'sales-1',
      fullName: 'Trần Văn Sales',
      email: 'sales@skylux.vn',
    },
    customer: {
      id: 'cust-1',
      code: 'CUST-001',
      displayName: 'Tập đoàn Sun Group',
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue({
      ...mockEstimate,
      revenueLines: [
        { id: 'rev-1', quantity: 25, unitPrice: 8000000 },
      ],
    });
    (dossiersService.getDossier as jest.Mock).mockResolvedValue(mockDossier);
    (workflowService.approve as jest.Mock).mockResolvedValue({
      data: { id: 'dossier-456', status: 'APPROVED' },
    });
    (workflowService.requestChanges as jest.Mock).mockResolvedValue({
      data: { id: 'dossier-456', status: 'NEED_CHANGES' },
    });
  });

  const renderModal = (open = true) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveApprovalModal
          open={open}
          estimate={mockEstimate}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </QueryClientProvider>,
    );

  it('renders concise financial snapshot and metadata (Revenue, Cost, Profit, Margin %, Pax)', async () => {
    renderModal(true);

    // Header & Code
    expect(await screen.findByText('DOS-2026-SUN')).toBeInTheDocument();
    expect(screen.getByText('Phê duyệt nhanh hồ sơ tour')).toBeInTheDocument();

    // Customer & Route & Sales
    expect(screen.getByText('Tập đoàn Sun Group')).toBeInTheDocument();
    expect(screen.getByText('Hà Nội - Đà Nẵng')).toBeInTheDocument();
    expect(screen.getByText(/Trần Văn Sales • 25 khách/)).toBeInTheDocument();

    // Financial Cards
    expect(screen.getByText(/^200\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/^150\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/^50\.000\.000/)).toBeInTheDocument();

    // Margin %
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText('Tốt')).toBeInTheDocument();
  });

  it('executes direct approval when clicking [Chấp thuận phê duyệt ngay]', async () => {
    renderModal(true);

    const approveButton = await screen.findByText('Chấp thuận phê duyệt ngay');
    expect(approveButton).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText(/Nhập lời nhắn hoặc ghi chú kèm theo quyết định phê duyệt/);
    fireEvent.change(noteInput, { target: { value: 'Duyệt nhanh giá tốt' } });

    await act(async () => {
      fireEvent.click(approveButton);
    });

    await waitFor(() => {
      expect(workflowService.approve).toHaveBeenCalledWith('dossier-456', {
        note: 'Duyệt nhanh giá tốt',
        version: 3,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('allows requesting changes with comment and routes back to Sales', async () => {
    renderModal(true);

    const requestChangesBtn = await screen.findByText('Yêu cầu điều chỉnh');
    expect(requestChangesBtn).toBeInTheDocument();

    // Click to expand changes input
    fireEvent.click(requestChangesBtn);

    const sendRequestBtn = screen.getByText('Gửi yêu cầu điều chỉnh đến Sales');
    expect(sendRequestBtn).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText(/Nhập cụ thể các hạng mục cần Sales\/Điều hành kiểm tra/);
    fireEvent.change(noteInput, { target: { value: 'Vui lòng kiểm tra lại giá phòng khách sạn' } });

    await act(async () => {
      fireEvent.click(sendRequestBtn);
    });

    await waitFor(() => {
      expect(workflowService.requestChanges).toHaveBeenCalledWith('dossier-456', {
        note: 'Vui lòng kiểm tra lại giá phòng khách sạn',
        version: 3,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('renders warning banner when margin is thin or duplicate warning exists', async () => {
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue({
      id: 'est-thin',
      totalRevenue: 100000000,
      totalCost: 96000000,
      totalProfit: 4000000,
      revenueLines: [{ quantity: 10 }],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveApprovalModal
          open={true}
          estimate={{ ...mockEstimate, id: 'est-thin' }}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Cảnh báo biên lợi nhuận thấp')).toBeInTheDocument();
    expect(screen.getByText(/thấp hơn ngưỡng khuyến nghị tối thiểu 8.0%/)).toBeInTheDocument();
  });
});
