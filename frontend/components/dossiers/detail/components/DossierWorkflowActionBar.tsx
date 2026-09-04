'use client';

import React from 'react';
import { Button, Tag } from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  MessageOutlined,
  RocketOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { DossierWorkflowAction } from '../types';

export interface DossierWorkflowActionBarProps {
  dossierStatus?: string;
  isDrawer?: boolean;
  canOperate: boolean;
  isSales: boolean;
  isCeoAdmin?: boolean;
  isActionLoading: boolean;
  onStartReview: () => void;
  onSubmit: () => void;
  onResubmit: () => void;
  onOpenModal: (action: DossierWorkflowAction) => void;
}

export function DossierWorkflowActionBar({
  dossierStatus,
  isDrawer = false,
  canOperate,
  isSales,
  isCeoAdmin = false,
  isActionLoading,
  onStartReview,
  onSubmit,
  onResubmit,
  onOpenModal,
}: DossierWorkflowActionBarProps) {
  return (
    <div
      className={
        isDrawer
          ? 'sticky bottom-0 left-0 right-0 z-20 -mx-6 -mb-6 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-3px_14px_rgb(15_61_46_/_0.07)] backdrop-blur-sm'
          : 'fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--ceo-border)] bg-white/95 p-3 shadow-[0_-3px_14px_rgb(15_61_46_/_0.07)] backdrop-blur-sm lg:left-[238px]'
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
                <Button
                  size={isDrawer ? 'middle' : 'large'}
                  icon={<MessageOutlined />}
                  className="border-amber-500 text-amber-700 hover:border-amber-600 hover:text-amber-800"
                  loading={isActionLoading}
                  onClick={() => onOpenModal('REQUEST_CHANGES')}
                >
                  Yêu cầu bổ sung
                </Button>
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
                Gửi duyệt hồ sơ
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
                Gửi duyệt lại (Submit lại)
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
