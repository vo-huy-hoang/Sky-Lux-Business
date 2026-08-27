'use client';

import React from 'react';
import { Card, List, Avatar, Typography, Space, Empty, Spin } from 'antd';
import { CommentOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { DossierComment } from '@/types/dossier';

const { Text, Paragraph } = Typography;

interface DossierCommentsProps {
  dossierId: string;
}

export const DossierComments: React.FC<DossierCommentsProps> = ({
  dossierId,
}) => {
  const { data: comments, isLoading } = useQuery<DossierComment[]>({
    queryKey: ['dossier-comments', dossierId],
    queryFn: () => dossiersService.getDossierComments(dossierId),
    enabled: !!dossierId,
  });

  return (
    <Card
      size="small"
      title={
        <Space>
          <CommentOutlined />
          <span>Trao đổi & Bình luận hồ sơ (API-COMMENT-001)</span>
        </Space>
      }
      style={{ marginTop: 16 }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Đang tải bình luận..." />
        </div>
      ) : !comments || comments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có bình luận hoặc ghi chú nào cho hồ sơ này"
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={comments}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0' }}>
              <List.Item.Meta
                avatar={
                  item.user?.avatarUrl ? (
                    <Avatar src={item.user.avatarUrl} />
                  ) : (
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                  )
                }
                title={
                  <Space>
                    <Text strong>{item.user?.fullName || 'Người dùng'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </Text>
                  </Space>
                }
                description={
                  <Paragraph style={{ margin: '4px 0 0 0', color: '#262626' }}>
                    {item.content}
                  </Paragraph>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
