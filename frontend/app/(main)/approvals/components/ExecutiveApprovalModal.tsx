'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Modal,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message as staticMessage,
} from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EstimateItem, EstimateStatus } from '@/types/estimate';
import { estimatesService } from '@/services/estimates.service';
import { dossiersService } from '@/services/dossiers.service';
import { workflowService } from '@/services/workflow.service';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/financial-calculations';
import { themeTokens } from '@/lib/theme/tokens.config';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface ExecutiveApprovalModalProps {
  open: boolean;
  estimate: EstimateItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExecutiveApprovalModal({
  open,
  estimate,
  onClose,
  onSuccess,
}: ExecutiveApprovalModalProps) {
  let appMessage: any = staticMessage;
  try {
    const app = App.useApp();
    if (app && app.message) {
      appMessage = app.message;
    }
  } catch {
    // Fallback to staticMessage in tests
  }
  const queryClient = useQueryClient();

  const [note, setNote] = useState('');
  const [showChangesInput, setShowChangesInput] = useState(false);

  // Fetch full estimate details (lines, pax, etc.)
  const { data: fullEstimate, isLoading: isLoadingEstimate } = useQuery({
    queryKey: queryKeys.estimates.detail(estimate?.id || ''),
    queryFn: () => estimatesService.getEstimate(estimate!.id),
    enabled: open && !!estimate?.id,
  });

  // Fetch dossier details (sales agent, departure date, route, version)
  const { data: dossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: queryKeys.dossiers.detail(estimate?.dossierId || ''),
    queryFn: () => dossiersService.getDossier(estimate!.dossierId),
    enabled: open && !!estimate?.dossierId,
  });

  const isLoadingDetails = isLoadingEstimate || isLoadingDossier;

  // Financial calculations
  const revenue = Number(
    fullEstimate?.totalRevenue ?? estimate?.totalRevenue ?? 0,
  );
  const cost = Number(fullEstimate?.totalCost ?? estimate?.totalCost ?? 0);
  const profit = Number(
    fullEstimate?.totalProfit ??
      estimate?.totalProfit ??
      (revenue - cost),
  );
  const marginPercent =
    revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  const marginValue = parseFloat(marginPercent);

  // Calculate total pax from estimate revenue lines
  const paxCount =
    fullEstimate?.revenueLines?.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0),
      0,
    ) || 0;

  // Departure date formatting
  const departureDate = dossier?.startDate
    ? new Date(dossier.startDate).toLocaleDateString('vi-VN')
    : '-';
  const returnDate = dossier?.endDate
    ? new Date(dossier.endDate).toLocaleDateString('vi-VN')
    : undefined;

  // Close and reset state
  const handleClose = () => {
    setNote('');
    setShowChangesInput(false);
    onClose();
  };

  // 1. Direct Approve Mutation
  const approveMutation = useMutation<any, any, string | void>({
    mutationFn: (customNote?: string | void) => {
      const noteToSend = (customNote ? customNote : note).trim();
      return workflowService.approve(estimate!.dossierId, {
        note: noteToSend || undefined,
        version: dossier?.version,
      });
    },
    onSuccess: async () => {
      appMessage?.success?.('Đã phê duyệt hồ sơ tour thành công!');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.all,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dossiers.all,
      });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      appMessage?.error?.(err?.message || 'Phê duyệt hồ sơ thất bại');
    },
  });

  // 2. Request Changes Mutation
  const requestChangesMutation = useMutation<any, any, string | void>({
    mutationFn: (customNote?: string | void) => {
      const noteToSend = (customNote ? customNote : note).trim();
      if (!noteToSend) {
        throw new Error('Vui lòng nhập lý do/ghi chú yêu cầu điều chỉnh');
      }
      return workflowService.requestChanges(estimate!.dossierId, {
        note: noteToSend,
        version: dossier?.version,
      });
    },
    onSuccess: async () => {
      appMessage?.info?.('Đã gửi yêu cầu điều chỉnh hồ sơ đến Sales');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.all,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dossiers.all,
      });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      appMessage?.error?.(err?.message || 'Không thể gửi yêu cầu điều chỉnh');
    },
  });

  const isSubmitting =
    approveMutation.isPending || requestChangesMutation.isPending;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      destroyOnHidden
      width={780}
      title={
        <div className="flex items-center gap-2 pr-6">
          <CheckCircleOutlined className="text-xl text-[var(--ceo-primary-700)]" />
          <div>
            <div className="text-base font-bold text-[var(--color-text)] leading-tight">
              Phê duyệt nhanh hồ sơ tour
            </div>
            <div className="text-xs font-normal text-[var(--color-text-muted)]">
              Đánh giá tài chính và ra quyết định phê duyệt trong 30 giây
            </div>
          </div>
        </div>
      }
      footer={null}
    >
      <div className="space-y-4 pt-2">
        {isLoadingDetails ? (
          <div className="py-8">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <>
            {/* Tour & Customer Metadata Bar */}
            <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5 border border-[var(--color-border)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                    Mã hồ sơ:
                  </span>{' '}
                  <span className="font-mono font-bold text-base text-[var(--color-text)]">
                    {dossier?.code || estimate?.dossier?.code || estimate?.dossierId.slice(0, 8)}
                  </span>
                  <Tag
                    className="ml-2 font-mono"
                    color={
                      estimate?.status === EstimateStatus.IN_REVIEW
                        ? 'gold'
                        : 'purple'
                    }
                  >
                    {estimate?.status === EstimateStatus.IN_REVIEW
                      ? 'Đang xem xét'
                      : 'Chờ duyệt'}
                  </Tag>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dossiers/${estimate?.dossierId}`}
                    target="_blank"
                    className="text-xs font-medium text-[var(--ceo-primary-700)] hover:underline flex items-center gap-1"
                  >
                    Mở trang chi tiết đầy đủ <EyeOutlined />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2.5 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)] block">Khách hàng:</span>
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5 truncate">
                    <UserOutlined className="text-[var(--color-text-muted)]" />
                    {dossier?.customer?.displayName ||
                      estimate?.dossier?.customer?.displayName ||
                      'Khách lẻ / Chưa cập nhật'}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--color-text-muted)] block">Tuyến hành trình:</span>
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5 truncate">
                    <CompassOutlined className="text-[var(--color-text-muted)]" />
                    {dossier?.route || estimate?.dossier?.route || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--color-text-muted)] block">Khởi hành:</span>
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5 font-mono">
                    <CalendarOutlined className="text-[var(--color-text-muted)]" />
                    {departureDate}
                    {returnDate ? ` → ${returnDate}` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--color-text-muted)] block">Sales & Số khách:</span>
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5">
                    <TeamOutlined className="text-[var(--color-text-muted)]" />
                    {dossier?.salesUser?.fullName || 'Sales'} • {paxCount > 0 ? `${paxCount} khách` : 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Banner: Low margin or duplicate alert */}
            {(marginValue < 8 || (estimate as any)?.hasDuplicateWarning) && (
              <Alert
                type={marginValue < 8 ? 'warning' : 'info'}
                showIcon
                message={
                  marginValue < 8
                    ? 'Cảnh báo biên lợi nhuận thấp'
                    : 'Lưu ý kiểm tra dữ liệu'
                }
                description={
                  marginValue < 8
                    ? `Biên lợi nhuận gộp của tour này hiện ở mức ${marginPercent}%, thấp hơn ngưỡng khuyến nghị tối thiểu 8.0%. Vui lòng kiểm tra chi tiết trước khi phê duyệt.`
                    : 'Hồ sơ có cảnh báo kiểm tra từ giai đoạn import dữ liệu.'
                }
                className="rounded-xl border border-[var(--color-border)]"
              />
            )}

            {/* Financial Decision Snapshot Cards */}
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={6}>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
                  <div className="text-xs text-[var(--color-text-muted)]">Doanh thu dự toán</div>
                  <div className="text-lg font-bold text-[var(--color-text)] mt-1 font-mono tabular-nums">
                    {formatCurrency(revenue)}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={6}>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
                  <div className="text-xs text-[var(--color-text-muted)]">Tổng chi phí dự kiến</div>
                  <div className="text-lg font-bold text-[var(--color-text)] mt-1 font-mono tabular-nums">
                    {formatCurrency(cost)}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={6}>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
                  <div className="text-xs text-[var(--color-text-muted)]">Lợi nhuận gộp</div>
                  <div
                    className={`text-lg font-bold mt-1 font-mono tabular-nums ${
                      profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(profit)}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={6}>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs flex flex-col justify-between">
                  <div className="text-xs text-[var(--color-text-muted)]">Tỷ suất LN gộp</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`text-lg font-bold font-mono tabular-nums ${
                        marginValue >= 15
                          ? 'text-emerald-600'
                          : marginValue >= 8
                            ? 'text-amber-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {marginPercent}%
                    </span>
                    <Tag
                      color={
                        marginValue >= 15
                          ? 'success'
                          : marginValue >= 8
                            ? 'warning'
                            : 'error'
                      }
                      className="text-[11px] px-1.5 font-medium"
                    >
                      {marginValue >= 15
                        ? 'Tốt'
                        : marginValue >= 8
                          ? 'Đạt'
                          : 'Mỏng'}
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Note / Comment Input Area */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="approval-note"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1"
                >
                  <MessageOutlined />
                  {showChangesInput
                    ? 'Lý do & nội dung yêu cầu điều chỉnh (Bắt buộc)'
                    : 'Ghi chú phê duyệt (Tùy chọn)'}
                </label>
                {showChangesInput && (
                  <Button
                    type="link"
                    size="small"
                    className="text-xs p-0 h-auto"
                    onClick={() => setShowChangesInput(false)}
                  >
                    Hủy yêu cầu điều chỉnh
                  </Button>
                )}
              </div>
              <TextArea
                id="approval-note"
                rows={showChangesInput ? 3 : 2}
                placeholder={
                  showChangesInput
                    ? 'Nhập cụ thể các hạng mục cần Sales/Điều hành kiểm tra hoặc điều chỉnh lại đơn giá...'
                    : 'Nhập lời nhắn hoặc ghi chú kèm theo quyết định phê duyệt...'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                showCount
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button onClick={handleClose} disabled={isSubmitting}>
                Đóng
              </Button>

              <Space wrap className="justify-end">
                {!showChangesInput ? (
                  <>
                    <Button
                      icon={<ExclamationCircleOutlined />}
                      className="border-amber-400 text-amber-700 hover:border-amber-500 hover:text-amber-800"
                      onClick={() => setShowChangesInput(true)}
                      disabled={isSubmitting}
                    >
                      Yêu cầu điều chỉnh
                    </Button>

                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      className="skylux-primary-button px-5 font-semibold"
                      loading={approveMutation.isPending}
                      disabled={isSubmitting}
                      onClick={() => approveMutation.mutate()}
                    >
                      Chấp thuận phê duyệt ngay
                    </Button>
                  </>
                ) : (
                  <Button
                    type="primary"
                    danger
                    icon={<MessageOutlined />}
                    loading={requestChangesMutation.isPending}
                    disabled={isSubmitting || !note.trim()}
                    onClick={() => requestChangesMutation.mutate()}
                  >
                    Gửi yêu cầu điều chỉnh đến Sales
                  </Button>
                )}
              </Space>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
