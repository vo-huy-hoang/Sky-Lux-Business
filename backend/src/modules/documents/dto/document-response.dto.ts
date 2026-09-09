export interface DocumentUploaderResponseDto {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface DocumentTypeResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  sortOrder?: number;
}

export interface DocumentVersionResponseDto {
  id: string;
  organizationId: string;
  documentId: string;
  versionNo: number;
  fileSize: number;
  checksum?: string;
  changeNote?: string;
  uploadedBy?: string;
  uploader?: DocumentUploaderResponseDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentResponseDto {
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
  uploader?: DocumentUploaderResponseDto;
  documentType?: DocumentTypeResponseDto;
  versions?: DocumentVersionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DownloadUrlResponseDto {
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  versionNo: number;
  expiresIn: number;
}
