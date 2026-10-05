'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Tag } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  LockOutlined,
  MessageOutlined,
  RocketOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { DossierWorkflowAction } from '../types';
import { useUIStore } from '@/lib/stores/ui-store';

export interface DossierWorkflowActionBarProps {
  dossierId?: string;
  dossierStatus?: string;
  isDrawer?: boolean;
  canOperate: boolean;
  isSales: boolean;
  isCeoAdmin?: boolean;
  isActionLoading: boolean;
  onStartReview: () => void;
  onReturnToOperations?: () => void;
  onSubmit: () => void;
  onResubmit: () => void;
  onOpenModal: (action: DossierWorkflowAction) => void;
}

export function DossierWorkflowActionBar({
  dossierId,
  dossierStatus,
  isDrawer = false,
  canOperate,
  isSales,
  isCeoAdmin = false,
  isActionLoading,
  onStartReview,
  onReturnToOperations,
  onSubmit,
  onResubmit,
  onOpenModal,
}: DossierWorkflowActionBarProps) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <div
      className={
        isDrawer
          ? 'sticky bottom-0 left-0 right-0 z-20 -mx-6 -mb-6 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-3px_14px_rgb(15_61_46_/_0.07)] backdrop-blur-sm'
          : `fixed bottom-0 right-0 z-20 border-t border-[var(--ceo-border)] bg-white/95 p-3 shadow-[0_-3px_14px_rgb(15_61_46_/_0.07)] backdrop-blur-sm transition-[left] duration-200 ease-in-out ${
              sidebarCollapsed ? 'left-0 lg:left-[72px]' : 'left-0 lg:left-[238px]'
            }`
      }
    >
      <div
        className={`mx-auto flex flex-wrap items-center justify-center gap-3 ${
          isDrawer ? 'justify-end' : 'max-w-[1000px] sm:justify-end'
        }`}
      >
        {dossierStatus === 'LOCKED' ? (
          <Tag
            color="red"
            icon={<LockOutlined />}
            className="px-4 py-1 text-sm font-semibold"
          >
            Hồ sơ đã khóa an toàn (Chỉ đọc)
          </Tag>
        ) : (
          <>
            {/* Direct link to Edit Import for rapid navigation */}
            {dossierId && (
              <Link href={`/main/dossiers/${dossierId}/edit-import`}>
                <Button
                  size={isDrawer ? 'middle' : 'large'}
                  icon={<EditOutlined />}
                  className="border-slate-300 text-slate-700 hover:text-slate-900"
                >
                  Sửa dự toán
                </Button>
              </Link>
            )}

            {/* Operator / CEO actions */}
            {canOperate &&
              (dossierStatus === 'SUBMITTED' ||
                dossierStatus === 'RESUBMITTED') && (
                <Button
                  size={isDrawer ? 'middle' : 'large'}
                  type="primary"
                  icon={<SyncOutlined />}
                  className="skylux-primary-button"
                  loading={isActionLoading}
                  onClick={onStartReview}
                >
                  Bắt đầu tiếp nhận & xem xét
                </Button>
              )}

            {canOperate && dossierStatus === 'IN_REVIEW' && (
              <>
                {isCeoAdmin && (
                  <Button
                    size={isDrawer ? 'middle' : 'large'}
                    icon={<SendOutlined />}
                    className="border-slate-300 text-slate-700 hover:text-slate-900"
                    loading={isActionLoading}
                    onClick={onReturnToOperations}
                  >
                    Gửi lại Điều hành
                  </Button>
                )}
                {!isCeoAdmin && (
                  <Button
                    size={isDrawer ? 'middle' : 'large'}
                    icon={<MessageOutlined />}
                    className="border-amber-500 text-amber-700 hover:border-amber-600 hover:text-amber-800"
                    loading={isActionLoading}
                    onClick={() => onOpenModal('REQUEST_CHANGES')}
                  >
                    Yêu cầu bổ sung
                  </Button>
                )}
                <Button
                  size={isDrawer ? 'middle' : 'large'}
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  className="skylux-primary-button"
                  loading={isActionLoading}
                  onClick={() => onOpenModal('APPROVE')}
                >
                  Duyệt hồ sơ
                </Button>
              </>
            )}

            {isCeoAdmin && dossierStatus === 'IN_REVIEW' && (
              <Button
                size={isDrawer ? 'middle' : 'large'}
                icon={<MessageOutlined />}
                className="border-amber-500 text-amber-700 hover:border-amber-600 hover:text-amber-800"
                loading={isActionLoading}
                onClick={() => onOpenModal('REQUEST_CHANGES')}
              >
                Yêu cầu bổ sung
              </Button>
            )}

            {canOperate && dossierStatus === 'APPROVED' && (
              <Button
                size={isDrawer ? 'middle' : 'large'}
                icon={<CheckCircleOutlined />}
                className="skylux-primary-button"
                loading={isActionLoading}
                onClick={() => onOpenModal('COMPLETE')}
              >
                Hoàn tất hồ sơ
              </Button>
            )}

            {isCeoAdmin &&
              (dossierStatus === 'APPROVED' ||
                dossierStatus === 'COMPLETED') && (
                <Button
                  size={isDrawer ? 'middle' : 'large'}
                  danger
                  icon={<LockOutlined />}
                  loading={isActionLoading}
                  onClick={() => onOpenModal('LOCK')}
                >
                  Khóa hồ sơ
                </Button>
              )}

            {/* Sales actions */}
            {isSales && dossierStatus === 'DRAFT' && (
              <Button
                size={isDrawer ? 'middle' : 'large'}
                type="primary"
                icon={<SendOutlined />}
                className="skylux-primary-button"
                loading={isActionLoading}
                onClick={onSubmit}
              >
                Gửi điều hành duyệt
              </Button>
            )}

            {isSales && dossierStatus === 'NEED_CHANGES' && (
              <Button
                size={isDrawer ? 'middle' : 'large'}
                type="primary"
                icon={<RocketOutlined />}
                className="skylux-primary-button"
                loading={isActionLoading}
                onClick={onResubmit}
              >
                Gửi điều hành lại
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DossierWorkflowActionBar;
