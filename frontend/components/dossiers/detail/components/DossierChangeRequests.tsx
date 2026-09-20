'use client';

import React, { useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  MessageOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  useDossierChangeRequests,
  useRespondToDossierChangeRequest,
} from '@/hooks/dossiers';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

interface DossierChangeRequestsProps {
  dossierId: string;
  isLocked?: boolean;
}

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '';

export function DossierChangeRequests({
  dossierId,
  isLocked = false,
}: DossierChangeRequestsProps) {
  const { message } = AntApp.useApp();
  const isSales = useAuthStore((state) => state.hasRole('SALES'));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data, isLoading, isFetching, isError, refetch } =
    useDossierChangeRequests(dossierId);
  const respondMutation = useRespondToDossierChangeRequest();
  const requests = data?.data || [];

  const submitResponse = async (requestId: string) => {
    const responseText = drafts[requestId]?.trim();
    if (!responseText) {
      message.warning('Vui lòng nhập nội dung phản hồi');
      return;
    }
    try {
      await respondMutation.mutateAsync({
        dossierId,
        requestId,
        payload: { responseText },
      });
      setDrafts((current) => ({ ...current, [requestId]: '' }));
      message.success('Đã gửi phản hồi cho Operator');
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          'Không thể gửi phản hồi, vui lòng thử lại',
      );
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <MessageOutlined />
          <span>Yêu cầu bổ sung</span>
          {requests.length > 0 && <Tag color="blue">{requests.length}</Tag>}
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined spin={isFetching} />}
          onClick={() => refetch()}
          aria-label="Tải lại yêu cầu bổ sung"
        />
      }
    >
      {isLoading ? (
        <div className="py-6 text-center">
          <Spin description="Đang tải yêu cầu bổ sung..." />
        </div>
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải yêu cầu bổ sung"
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
        />
      ) : requests.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có yêu cầu bổ sung nào"
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map((request) => {
            const isOpen = request.status === 'OPEN';
            return (
              <div
                key={request.id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Space wrap>
                    <Text strong>
                      Yêu cầu từ {request.requester?.fullName || 'Operator'}
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {formatDateTime(request.requestedAt)}
                    </Text>
                  </Space>
                  {isOpen ? (
                    <Tag color="orange">Chờ Sales trả lời</Tag>
                  ) : (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Đã phản hồi
                    </Tag>
                  )}
                </div>
                <Paragraph className="mb-0 mt-2 whitespace-pre-wrap text-slate-700">
                  {request.requestText}
                </Paragraph>

                {request.responseText && (
                  <div className="mt-3 rounded-md border border-green-100 bg-green-50 p-3">
                    <Text strong className="text-green-800">
                      Phản hồi của {request.responder?.fullName || 'Sales'}
                    </Text>
                    <Paragraph className="mb-0 mt-1 whitespace-pre-wrap">
                      {request.responseText}
                    </Paragraph>
                    <Text type="secondary" className="text-xs">
                      {formatDateTime(request.respondedAt)}
                    </Text>
                  </div>
                )}

                {isSales && isOpen && !isLocked && (
                  <div className="mt-3">
                    <TextArea
                      rows={3}
                      maxLength={5000}
                      showCount
                      value={drafts[request.id] || ''}
                      placeholder="Nhập phản hồi cho đúng yêu cầu này..."
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      disabled={respondMutation.isPending}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={
                          respondMutation.isPending &&
                          respondMutation.variables?.requestId === request.id
                        }
                        disabled={!drafts[request.id]?.trim()}
                        onClick={() => submitResponse(request.id)}
                      >
                        Gửi phản hồi
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default DossierChangeRequests;
