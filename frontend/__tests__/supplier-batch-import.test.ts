import { suppliersService } from '@/services/suppliers.service';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('suppliersService.batchCreateSuppliers (Ticket 01)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call POST /suppliers/batch with the full array of suppliers', async () => {
    const mockPayload = {
      suppliers: [
        { code: 'NCC-01', name: 'Công ty Du lịch A', supplierTypeName: 'Dịch vụ xe' },
        { code: 'NCC-02', name: 'Nhà hàng B', supplierTypeName: 'Nhà hàng' },
      ],
    };

    const mockResponse = {
      total: 2,
      imported: 2,
      items: [
        { id: 'uuid-1', code: 'NCC-01', name: 'Công ty Du lịch A' },
        { id: 'uuid-2', code: 'NCC-02', name: 'Nhà hàng B' },
      ],
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await suppliersService.batchCreateSuppliers(mockPayload);

    expect(apiClient.post).toHaveBeenCalledWith('/suppliers/batch', mockPayload);
    expect(result).toEqual(mockResponse);
  });

  it('should handle API conflict error when duplicate codes are rejected by server', async () => {
    const mockPayload = {
      suppliers: [
        { code: 'DUPLICATE', name: 'Nhà cung cấp 1' },
      ],
    };

    const conflictError = new Error('Mã nhà cung cấp đã tồn tại trong hệ thống: DUPLICATE');
    (apiClient.post as jest.Mock).mockRejectedValueOnce(conflictError);

    await expect(suppliersService.batchCreateSuppliers(mockPayload)).rejects.toThrow(
      'Mã nhà cung cấp đã tồn tại trong hệ thống: DUPLICATE',
    );
  });
});
