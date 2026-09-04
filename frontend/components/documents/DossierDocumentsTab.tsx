'use client';

import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  Popconfirm,
  message,
  Card,
  Empty,
  Skeleton,
  Tooltip,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  useDossierDocuments,
  useUploadDossierDocument,
  useDeleteDocument,
  useDownloadDocument,
  useDocumentVersions,
  useCreateDocumentVersion,
} from '@/hooks/documents';
import { DocumentItem, DocumentVersionItem } from '@/types/document';

interface DossierDocumentsTabProps {
  dossierId: string;
  isLocked?: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType = '', originalName = '') {
  const name = originalName.toLowerCase();
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) {
    return <FilePdfOutlined className="text-red-500 text-lg" />;
  }
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv')
  ) {
    return <FileExcelOutlined className="text-green-600 text-lg" />;
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return <FileWordOutlined className="text-blue-600 text-lg" />;
  }
  if (
    mimeType.includes('image') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  ) {
    return <FileImageOutlined className="text-purple-500 text-lg" />;
  }
  return <FileOutlined className="text-gray-500 text-lg" />;
}

export default function DossierDocumentsTab({
  dossierId,
  isLocked = false,
}: DossierDocumentsTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Version history state
  const [versionPage, setVersionPage] = useState(1);
  const [versionPageSize, setVersionPageSize] = useState(5);
  const [versionSearch, setVersionSearch] = useState('');

  // Forms
  const [uploadForm] = Form.useForm();
  const [versionForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [versionFileList, setVersionFileList] = useState<UploadFile[]>([]);

  // Queries & Mutations
  const { data, isLoading } = useDossierDocuments(dossierId, {
    page,
    limit: pageSize,
    search: search || undefined,
  });

  const uploadMutation = useUploadDossierDocument();
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();
  const createVersionMutation = useCreateDocumentVersion();

  const { data: versionsData, isLoading: isVersionsLoading } =
    useDocumentVersions(
      selectedDoc?.id || '',
      {
        page: versionPage,
        limit: versionPageSize,
        search: versionSearch || undefined,
      },
      {
        enabled: Boolean(selectedDoc && isVersionModalOpen),
      },
    );

  // Handle Download
  const handleDownload = async (doc: DocumentItem, versionNo?: number) => {
    try {
      await downloadMutation.mutateAsync({
        id: doc.id,
        params: versionNo ? { versionNo } : undefined,
      });
      message.success(`Đang tải về: ${doc.originalName}`);
    } catch {
      message.error('Không thể lấy liên kết tải tài liệu');
    }
  };

  // Handle Delete
  const handleDelete = async (docId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: docId, dossierId });
      message.success('Đã xóa tài liệu thành công');
    } catch (err: any) {
      message.error(err.message || 'Không thể xóa tài liệu');
    }
  };

  // Handle Upload Submit
  const handleUploadSubmit = async (values: any) => {
    if (fileList.length === 0 || !fileList[0].originFileObj) {
      message.warning('Vui lòng chọn tệp để tải lên');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        dossierId,
        payload: {
          file: fileList[0].originFileObj as File,
          changeNote: values.changeNote,
        },
      });
      message.success('Tải lên tài liệu thành công');
      setIsUploadModalOpen(false);
      uploadForm.resetFields();
      setFileList([]);
    } catch (err: any) {
      message.error(err.message || 'Tải lên tài liệu thất bại');
    }
  };

  // Handle New Version Submit
  const handleNewVersionSubmit = async (values: any) => {
    if (!selectedDoc) return;
    if (versionFileList.length === 0 || !versionFileList[0].originFileObj) {
      message.warning('Vui lòng chọn tệp phiên bản mới');
      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        id: selectedDoc.id,
        dossierId,
        payload: {
          file: versionFileList[0].originFileObj as File,
          changeNote: values.changeNote, // Backend maps this to versionNote or changeNote
          description: values.description,
        },
      });
      message.success('Cập nhật phiên bản mới thành công');
      setIsNewVersionModalOpen(false);
      versionForm.resetFields();
      setVersionFileList([]);
    } catch (err: any) {
      message.error(err.message || 'Cập nhật phiên bản mới thất bại');
    }
  };

  const columns = [
    {
      title: 'Tài liệu',
      key: 'name',
      render: (_: any, record: DocumentItem) => (
        <div className="flex items-center gap-3">
          {getFileIcon(record.mimeType, record.originalName)}
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {record.originalName}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(record.fileSize)}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Phiên bản',
      key: 'version',
      width: 110,
      render: (_: any, record: DocumentItem) => (
        <Tag color="blue">v{record.versionNo}</Tag>
      ),
    },
    {
      title: 'Người tải lên',
      key: 'uploader',
      render: (_: any, record: DocumentItem) => (
        <div>
          <div className="text-sm">{record.uploader?.fullName || '-'}</div>
          <div className="text-xs text-gray-400">
            {record.createdAt
              ? new Intl.DateTimeFormat('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(record.createdAt))
              : '-'}
          </div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      align: 'right' as const,
      render: (_: any, record: DocumentItem) => (
        <Space size="small">
          <Tooltip title="Tải về">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>

          <Tooltip title="Lịch sử phiên bản">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => {
                setSelectedDoc(record);
                setIsVersionModalOpen(true);
              }}
            />
          </Tooltip>

          {!isLocked && (
            <>
              <Tooltip title="Tải phiên bản mới">
                <Button
                  type="text"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setSelectedDoc(record);
                    setIsNewVersionModalOpen(true);
                  }}
                />
              </Tooltip>

              <Popconfirm
                title="Xóa tài liệu"
                description="Bạn có chắc chắn muốn xóa tài liệu này không?"
                onConfirm={() => handleDelete(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa tài liệu">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  const documentList = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input.Search
          placeholder="Tìm kiếm tài liệu theo tên..."
          allowClear
          className="max-w-xs"
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />

        {!isLocked && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="skylux-primary-button"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Tải lên tài liệu
          </Button>
        )}
      </div>

      {documentList.length === 0 ? (
        <Card className="ceo-card text-center py-8">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Hồ sơ chưa có tài liệu nào"
          >
            {!isLocked && (
              <Button
                type="primary"
                icon={<UploadOutlined />}
                className="skylux-primary-button mt-2"
                onClick={() => setIsUploadModalOpen(true)}
              >
                Tải lên tài liệu đầu tiên
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Table
          dataSource={documentList}
          columns={columns}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      )}

      {/* Modal Upload Document */}
      <Modal
        title="Tải lên tài liệu đính kèm"
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          uploadForm.resetFields();
          setFileList([]);
        }}
        onOk={() => uploadForm.submit()}
        confirmLoading={uploadMutation.isPending}
        okText="Tải lên"
        cancelText="Hủy"
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUploadSubmit}
        >
          <Form.Item
            label="Chọn tệp"
            required
            tooltip="Hỗ trợ các định dạng PDF, Excel, Word, Hình ảnh (Tối đa 50MB)"
          >
            <Upload.Dragger
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file]);
                return false;
              }}
              onRemove={() => setFileList([])}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined className="text-2xl text-[var(--ceo-primary-600)]" />
              </p>
              <p className="ant-upload-text text-sm">
                Kéo thả tệp vào đây hoặc nhấn để duyệt tệp
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item name="changeNote" label="Ghi chú mô tả">
            <Input.TextArea
              rows={3}
              placeholder="Nhập ghi chú cho tài liệu (ví dụ: Hợp đồng tour đã ký kết)"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Version History */}
      <Modal
        title={`Lịch sử phiên bản: ${selectedDoc?.originalName || ''}`}
        open={isVersionModalOpen}
        onCancel={() => {
          setIsVersionModalOpen(false);
          setSelectedDoc(null);
          setVersionPage(1);
          setVersionSearch('');
        }}
        footer={[
          <Button key="close" onClick={() => setIsVersionModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={750}
      >
        <div className="mb-4">
          <Input.Search
            placeholder="Tìm kiếm theo ghi chú thay đổi..."
            allowClear
            onSearch={(val) => {
              setVersionSearch(val);
              setVersionPage(1);
            }}
          />
        </div>
        
        {isVersionsLoading ? (
          <Skeleton active />
        ) : (
          <Table
            dataSource={versionsData?.data || []}
            rowKey="id"
            pagination={{
              current: versionPage,
              pageSize: versionPageSize,
              total: versionsData?.meta?.total || 0,
              showSizeChanger: true,
              onChange: (p, ps) => {
                setVersionPage(p);
                setVersionPageSize(ps);
              },
            }}
            columns={[
              {
                title: 'Phiên bản',
                key: 'versionNo',
                render: (_: any, r: DocumentVersionItem) => (
                  <Tag color={r.versionNo === selectedDoc?.versionNo ? 'green' : 'default'}>
                    v{r.versionNo} {r.versionNo === selectedDoc?.versionNo ? '(Hiện tại)' : ''}
                  </Tag>
                ),
              },
              {
                title: 'Dung lượng',
                key: 'fileSize',
                render: (_: any, r: DocumentVersionItem) => formatFileSize(r.fileSize),
              },
              {
                title: 'Ghi chú thay đổi',
                dataIndex: 'changeNote',
                key: 'changeNote',
                render: (val: string) => val || '-',
              },
              {
                title: 'Người tải',
                key: 'uploader',
                render: (_: any, r: DocumentVersionItem) => r.uploader?.fullName || '-',
              },
              {
                title: 'Tải về',
                key: 'action',
                render: (_: any, r: DocumentVersionItem) => (
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => selectedDoc && handleDownload(selectedDoc, r.versionNo)}
                  >
                    Tải
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* Modal Upload New Version */}
      <Modal
        title={`Tải lên phiên bản mới: ${selectedDoc?.originalName || ''}`}
        open={isNewVersionModalOpen}
        onCancel={() => {
          setIsNewVersionModalOpen(false);
          versionForm.resetFields();
          setVersionFileList([]);
        }}
        onOk={() => versionForm.submit()}
        confirmLoading={createVersionMutation.isPending}
        okText="Tải lên phiên bản mới"
        cancelText="Hủy"
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={handleNewVersionSubmit}
        >
          <Form.Item label="Chọn tệp phiên bản mới" required>
            <Upload
              maxCount={1}
              fileList={versionFileList}
              beforeUpload={(file) => {
                setVersionFileList([file]);
                return false;
              }}
              onRemove={() => setVersionFileList([])}
            >
              <Button icon={<UploadOutlined />}>Chọn tệp mới</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="description" label="Mô tả tài liệu">
            <Input.TextArea
              rows={2}
              placeholder="Cập nhật mô tả chung cho tài liệu nếu cần..."
            />
          </Form.Item>

          <Form.Item
            name="changeNote"
            label="Ghi chú thay đổi"
            rules={[{ required: true, message: 'Vui lòng nhập ghi chú thay đổi' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả nội dung cập nhật trong phiên bản này..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
