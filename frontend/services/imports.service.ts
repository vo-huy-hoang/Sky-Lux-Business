import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  ImportSession,
  ConfirmImportResponse,
  PaginatedImportRowsResponse,
  PaginatedImportErrorsResponse,
  QueryImportParams,
  UpdateImportRowInput,
} from '@/types/import';

export const importsService = {
  /**
   * API-IMPORT-001: Tải lên tệp Excel và khởi tạo phiên nhập
   */
  upload: (file: File, templateType: string = 'ESTIMATE', templateId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateType', templateType);
    if (templateId) {
      formData.append('templateId', templateId);
    }

    return apiClient.post<any, ImportSession>('/imports', formData);
  },

  /**
   * API-IMPORT-002: Lấy thông tin & trạng thái phiên nhập
   */
  getSession: (id: string, options?: RequestOptions) => {
    return apiClient.get<any, ImportSession>(`/imports/${id}`, {
      signal: options?.signal,
    });
  },

  /**
   * API-IMPORT-003: Xem trước các dòng dữ liệu thô và đã chuẩn hóa
   */
  getPreview: (id: string, params?: QueryImportParams, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedImportRowsResponse>(
      `/imports/${id}/preview`,
      { params, signal: options?.signal },
    );
  },

  /**
   * API-IMPORT-004: Xem danh sách lỗi kiểm duyệt
   */
  getErrors: (id: string, params?: QueryImportParams, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedImportErrorsResponse>(
      `/imports/${id}/errors`,
      { params, signal: options?.signal },
    );
  },


  /**
   * API-IMPORT-005: Sửa lỗi thông tin dòng trên bảng tạm
   */
  updateRowStaging: (
    id: string,
    rowId: string,
    data: UpdateImportRowInput,
  ) => {
    return apiClient.patch<any, any>(
      `/imports/${id}/rows/${rowId}`,
      data,
    );
  },

  /**
   * API-IMPORT-006: Yêu cầu chạy lại tiến trình validate dữ liệu
   */
  validateSession: (id: string) => {
    return apiClient.post<any, { message: string }>(`/imports/${id}/validate`);
  },

  /**
   * API-IMPORT-007: Xác nhận nhập dữ liệu hợp lệ chính thức
   */
  confirm: (id: string) => {
    return apiClient.post<any, ConfirmImportResponse>(
      `/imports/${id}/confirm`,
    );
  },
};
