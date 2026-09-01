'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  List,
  Avatar,
  Typography,
  Space,
  Empty,
  Spin,
  Input,
  Button,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  CommentOutlined,
  UserOutlined,
  SendOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useDossierComments, useCreateDossierComment } from '@/hooks/dossiers';
import { DossierComment } from '@/types/dossier';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface DossierCommentsProps {
  dossierId: string;
  isLocked?: boolean;
}

export const DossierComments: React.FC<DossierCommentsProps> = ({
  dossierId,
  isLocked = false,
}) => {
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<DossierComment | null>(null);
  const [search, setSearch] = useState('');

  const {
    data: commentsResponse,
    isLoading,
    refetch,
    isFetching,
  } = useDossierComments(dossierId);

  const comments = useMemo(
    () => commentsResponse?.data ?? [],
    [commentsResponse?.data],
  );

  const createCommentMutation = useCreateDossierComment();

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    if (!search.trim()) return comments;
    const query = search.toLowerCase();
    return comments.filter(
      (c) =>
        c.content?.toLowerCase().includes(query) ||
        c.user?.fullName?.toLowerCase().includes(query),
    );
  }, [comments, search]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập nội dung bình luận');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        dossierId,
        payload: {
          content: trimmed,
          parentId: replyTo?.id,
        },
      });
      setContent('');
      setReplyTo(null);
      message.success('Đã gửi bình luận thành công');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể gửi bình luận, vui lòng thử lại';
      message.error(errorMsg);
    }
  };

  return (
    <Card
      size="small"
      title={
        <div className="flex items-center justify-between gap-2">
          <Space>
            <CommentOutlined />
            <span>Trao đổi & Bình luận hồ sơ</span>
            {comments && comments.length > 0 && (
              <Tag color="blue">{comments.length}</Tag>
            )}
          </Space>
          <Space size="small">
            <Input
              size="small"
              placeholder="Tìm nội dung..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 160 }}
            />
            <Tooltip title="Tải lại bình luận">
              <Button
                size="small"
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
              />
            </Tooltip>
          </Space>
        </div>
      }
      style={{ marginTop: 16 }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Đang tải bình luận..." />
        </div>
      ) : filteredComments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            search
              ? 'Không tìm thấy bình luận phù hợp với từ khóa'
              : 'Chưa có bình luận hoặc ghi chú nào cho hồ sơ này'
          }
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={filteredComments}
          renderItem={(item) => {
            const isTargetReply = replyTo?.id === item.id;
            return (
              <List.Item
                style={{
                  padding: '12px 8px',
                  backgroundColor: isTargetReply ? '#f0f5ff' : 'transparent',
                  borderRadius: 6,
                  transition: 'background-color 0.2s',
                }}
                actions={[
                  !isLocked ? (
                    <Button
                      type="link"
                      size="small"
                      key="reply"
                      onClick={() => setReplyTo(item)}
                    >
                      Trả lời
                    </Button>
                  ) : null,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    item.user?.avatarUrl ? (
                      <Avatar src={item.user.avatarUrl} />
                    ) : (
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#1677ff' }}
                      />
                    )
                  }
                  title={
                    <Space size="middle">
                      <Text strong>{item.user?.fullName || 'Người dùng'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </Text>
                      {item.parentId && (
                        <Tag color="default" style={{ fontSize: 11 }}>
                          Đã trả lời
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Paragraph
                      style={{
                        margin: '4px 0 0 0',
                        color: '#262626',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content}
                    </Paragraph>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      {/* Input box for new comment */}
      <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
        {replyTo && (
          <div style={{ marginBottom: 8 }}>
            <Tag
              color="processing"
              closable
              onClose={() => setReplyTo(null)}
              closeIcon={<CloseCircleOutlined />}
            >
              Đang trả lời: <strong>{replyTo.user?.fullName || 'Người dùng'}</strong>
            </Tag>
          </div>
        )}

        {isLocked ? (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 6,
              color: '#d46b08',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LockOutlined />
            <span>Hồ sơ đã bị khóa. Không thể gửi thêm bình luận.</span>
          </div>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <TextArea
              rows={3}
              placeholder={
                replyTo
                  ? `Nhập nội dung trả lời ${replyTo.user?.fullName || ''}...`
                  : 'Nhập nội dung bình luận hoặc trao đổi về hồ sơ...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              showCount
              disabled={createCommentMutation.isPending}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={createCommentMutation.isPending}
                disabled={!content.trim()}
                onClick={handleSubmit}
              >
                Gửi bình luận
              </Button>
            </div>
          </Space>
        )}
      </div>
    </Card>
  );
};
