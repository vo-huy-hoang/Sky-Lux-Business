export interface DocumentUploader {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface DocumentTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  sortOrder?: number;
}

export interface DocumentVersionItem {
  id: string;
  organizationId: string;
  documentId: string;
  versionNo: number;
  fileSize: number;
  checksum?: string;
  changeNote?: string;
  uploadedBy?: string;
  uploader?: DocumentUploader;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  organizationId: string;
  dossierId?: string;
  estimateId?: string;
  documentTypeId?: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  versionNo: number;
  uploadedBy?: string;
  uploader?: DocumentUploader;
  documentType?: DocumentTypeItem;
  versions?: DocumentVersionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QueryDocumentParams {
  page?: number;
  limit?: number;
  search?: string;
  documentTypeId?: string;
}

export interface QueryDocumentVersionParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UploadDocumentPayload {
  file: File;
  documentTypeId?: string;
  estimateId?: string;
  changeNote?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  versionNo: number;
  expiresIn: number;
}

export interface DownloadUrlParams {
  versionNo?: number;
  expiresIn?: number;
}

export interface CreateDocumentVersionPayload {
  file: File;
  documentTypeId?: string;
  changeNote?: string;
  versionNote?: string;
  description?: string;
}
