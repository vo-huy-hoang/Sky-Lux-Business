export type ImportSessionStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'CONFIRMED'
  | 'FAILED';

export type ImportRowStatus = 'PENDING' | 'VALID' | 'ERROR' | 'IMPORTED';

export interface ImportTemplate {
  id: string;
  code: string;
  name: string;
  templateType: string;
  mappingConfig?: Record<string, any>;
  sampleFileUrl?: string;
  status: string;
}

export interface ImportSession {
  id: string;
  organizationId: string;
  templateId?: string;
  template?: ImportTemplate;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: ImportSessionStatus;
  uploadedBy: string;
  uploader?: {
    id: string;
    fullName: string;
    email: string;
  };
  totalRows: number;
  processedRows: number;
  validRows: number;
  errorRows: number;
  summary?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRow {
  id: string;
  sessionId: string;
  sheetName: string;
  rowNumber: number;
  rawData: Record<string, any>;
  normalizedData?: Record<string, any> | null;
  status: ImportRowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ImportError {
  id: string;
  sessionId: string;
  rowNumber: number;
  columnName?: string;
  errorCode: string;
  errorMessage: string;
  createdAt: string;
}

export interface QueryImportParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface PaginatedImportRowsResponse {
  data: ImportRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedImportErrorsResponse {
  data: ImportError[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadImportInput {
  file: File;
  templateType?: string;
  templateId?: string;
}

export interface UpdateImportRowInput {
  rawData: Record<string, any>;
}
