'use client';

import React from 'react';
import { Card, Empty, Timeline, Typography } from 'antd';
import { dateTime } from '../types';

const { Text } = Typography;

export interface DossierWorkflowTimelineProps {
  workflowHistory: any[];
  estimate: any;
  dossier: any;
}

export function DossierWorkflowTimeline({
  workflowHistory = [],
  estimate,
  dossier,
}: DossierWorkflowTimelineProps) {
  return (
    <Card className="ceo-card" title="Lịch sử workflow xử lý">
      {workflowHistory.length > 0 ? (
        <Timeline
          items={workflowHistory.map((item) => {
            const node = (
              <div key={item.id} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Text strong className="text-xs">
                    {item.action === 'APPROVE'
                      ? 'Phê duyệt hồ sơ'
                      : item.action === 'REQUEST_CHANGES'
                      ? 'Yêu cầu bổ sung'
                      : item.action === 'START_REVIEW'
                      ? 'Bắt đầu xem xét'
                      : item.action === 'SUBMIT'
                      ? 'Gửi duyệt'
                      : item.action === 'RESUBMIT'
                      ? 'Submit lại'
                      : item.action === 'LOCK'
                      ? 'Khóa hồ sơ'
                      : item.action === 'COMPLETE'
                      ? 'Hoàn tất hồ sơ'
                      : item.action}
                  </Text>
                  <span className="text-[11px] text-[var(--ceo-text-muted)]">
                    {dateTime(item.createdAt)}
                  </span>
                </div>
                {item.actor?.fullName && (
                  <div className="text-[11px] text-slate-500">
                    Người thực hiện: {item.actor.fullName}
                  </div>
                )}
                {item.comment && (
                  <div className="rounded bg-slate-50 p-1.5 text-xs text-slate-600 italic">
                    &ldquo;{item.comment}&rdquo;
                  </div>
                )}
              </div>
            );
            return {
              color:
                item.action === 'APPROVE'
                  ? 'green'
                  : item.action === 'REQUEST_CHANGES'
                  ? 'orange'
                  : item.action === 'LOCK'
                  ? 'red'
                  : 'blue',
              content: node,
            };
          })}
        />
      ) : (
        <Timeline
          items={[
            ...(estimate?.approvedAt
              ? [
                  {
                    color: 'green',
                    content: (
                      <div>
                        <Text strong>Đã duyệt</Text>
                        <div className="text-xs text-slate-500">
                          {dateTime(estimate.approvedAt)}
                        </div>
                      </div>
                    ),
                  },
                ]
              : []),
            ...(estimate?.submittedAt
              ? [
                  {
                    color: 'blue',
                    content: (
                      <div>
                        <Text strong>Đã gửi dự toán</Text>
                        <div className="text-xs text-slate-500">
                          {dateTime(estimate.submittedAt)}
                        </div>
                      </div>
                    ),
                  },
                ]
              : []),
            {
              color: 'gray',
              content: (
                <div>
                  <Text strong>Khởi tạo hồ sơ</Text>
                  <div className="text-xs text-slate-500">
                    {dateTime(dossier?.createdAt)}
                  </div>
                </div>
              ),
            },
          ]}
          pending={false}
        />
      )}
      {!estimate && workflowHistory.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có lịch sử dự toán"
        />
      )}
    </Card>
  );
}
