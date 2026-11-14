"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, Button, Space, Tag, Tooltip, Popconfirm, message } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  EditOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDeleteDossier } from "@/hooks/dossiers";
import { DossierDangerDeleteModal } from "@/components/dossiers/DossierDangerDeleteModal";
import { DossierItem } from "@/types/dossier";
import { getDossierDeleteEligibility } from "@/lib/dossier-delete-policy";

export interface DossierHeaderProps {
  dossier: Partial<DossierItem> | null | undefined;
  isDrawer?: boolean;
  isOperator?: boolean;
  isCeoAdmin?: boolean;
  hasPayments?: boolean;
  onDeleted?: () => void;
}

export function DossierHeader({
  dossier,
  isDrawer = false,
  isOperator = false,
  isCeoAdmin = false,
  hasPayments = false,
  onDeleted,
}: DossierHeaderProps) {
  const router = useRouter();
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);

  const deleteDossierMutation = useDeleteDossier();

  const isLocked = dossier?.status === "LOCKED";

  const {
    canDelete: canDeleteThisDossier,
    disableReason,
    isApprovedOrCompleted,
  } = getDossierDeleteEligibility(dossier, currentUser, {
    hasPermission,
    hasRole: (role) => {
      if (typeof hasRole === "function") {
        return hasRole(role);
      }
      if (Array.isArray(role)) {
        return Boolean(isCeoAdmin && role.includes("CEO_ADMIN"));
      }
      return role === "OPERATOR" ? Boolean(isOperator) : false;
    },
    hasPayments,
  });

  const handleDelete = async (reason?: string) => {
    if (!dossier?.id) return;
    try {
      setIsDeleting(true);
      await deleteDossierMutation.mutateAsync({ id: dossier.id, reason });
      message.success(`Đã xóa hồ sơ ${dossier.code || ""} thành công`);
      setDangerModalOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/dossiers");
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa hồ sơ. Vui lòng thử lại sau.";
      message.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDrawer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-bold text-slate-900">
            {dossier?.name || "Chi tiết hồ sơ tour"}
          </h3>
          {dossier && <Tag color="blue">{dossier.code}</Tag>}
        </div>

        {dossier?.id && (
          <Space size="small">
            {!isLocked && (
              <Link href={`/dossiers/${dossier.id}/edit-import`}>
                <Button size="small" icon={<EditOutlined />}>
                  Sửa dự toán
                </Button>
              </Link>
            )}
            {canDeleteThisDossier ? (
              isApprovedOrCompleted ? (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={isDeleting}
                  onClick={() => setDangerModalOpen(true)}
                  aria-label={`Xóa hồ sơ ${dossier.code || ""}`}
                >
                  Xóa
                </Button>
              ) : (
                <Popconfirm
                  title="Xác nhận xóa hồ sơ"
                  description="Bạn có chắc chắn muốn xóa hồ sơ này? Dự toán kèm theo sẽ bị xóa tạm thời."
                  onConfirm={() => handleDelete()}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading: isDeleting }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={isDeleting}
                    aria-label={`Xóa hồ sơ ${dossier.code || ""}`}
                  >
                    Xóa
                  </Button>
                </Popconfirm>
              )
            ) : (
              <Tooltip title={disableReason || "Không thể xóa hồ sơ này"}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled
                  className="opacity-50"
                  aria-label={`Xóa hồ sơ ${dossier.code || ""} (vô hiệu)`}
                >
                  Xóa
                </Button>
              </Tooltip>
            )}
          </Space>
        )}

        <DossierDangerDeleteModal
          open={dangerModalOpen}
          dossier={dossier}
          onClose={() => setDangerModalOpen(false)}
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Breadcrumb
          items={[
            {
              title: (
                <Link href="/dossiers" suppressHydrationWarning>
                  <span suppressHydrationWarning>
                    {isOperator
                      ? "Hồ sơ chờ xử lý"
                      : isCeoAdmin
                        ? "Hồ sơ toàn hệ thống"
                        : "Hồ sơ của tôi"}
                  </span>
                </Link>
              ),
            },
            { title: dossier?.code || "Đang tải" },
            { title: "Chi tiết hồ sơ" },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-[25px] font-bold">
            Chi tiết hồ sơ - {dossier?.code || "..."}
          </h2>
          {dossier && <Tag>{dossier.code}</Tag>}
        </div>
      </div>
      <Space wrap>
        <Link href="/dossiers">
          <Button icon={<ArrowLeftOutlined />}>Quay lại danh sách</Button>
        </Link>
        {dossier?.id && !isLocked && (
          <Link href={`/dossiers/${dossier.id}/edit-import`}>
            <Button
              icon={<EditOutlined />}
              className="border-emerald-600 text-emerald-800 hover:text-emerald-900 font-semibold"
            >
              Sửa dự toán
            </Button>
          </Link>
        )}
        <Button
          icon={<DownloadOutlined />}
          onClick={() =>
            message.info("Đang chuẩn bị file Excel dự toán gốc để tải xuống...")
          }
          title="Tải file Excel dự toán gốc đính kèm"
        >
          Tải file gốc
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          disabled
          title="Chưa có API xuất PDF"
        >
          Xuất PDF
        </Button>

        {dossier?.id && (
          canDeleteThisDossier ? (
            isApprovedOrCompleted ? (
              <Tooltip title="Xóa hồ sơ đã duyệt/hoàn tất (Cần xác nhận 2 lớp)">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={isDeleting}
                  onClick={() => setDangerModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 hover:border-rose-400 font-semibold"
                  aria-label={`Xóa hồ sơ ${dossier.code || ""}`}
                >
                  Xóa hồ sơ
                </Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title="Xác nhận xóa hồ sơ"
                description="Bạn có chắc chắn muốn xóa hồ sơ này? Dự toán kèm theo sẽ bị xóa tạm thời."
                onConfirm={() => handleDelete()}
                okText="Xóa hồ sơ"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: isDeleting }}
              >
                <Tooltip title="Xóa hồ sơ">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={isDeleting}
                    className="text-rose-600 hover:text-rose-700 hover:border-rose-400 font-semibold"
                    aria-label={`Xóa hồ sơ ${dossier.code || ""}`}
                  >
                    Xóa hồ sơ
                  </Button>
                </Tooltip>
              </Popconfirm>
            )
          ) : (
            <Tooltip title={disableReason || "Không thể xóa hồ sơ này"}>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled
                className="opacity-50 font-semibold"
                aria-label={`Xóa hồ sơ ${dossier.code || ""} (vô hiệu)`}
              >
                Xóa hồ sơ
              </Button>
            </Tooltip>
          )
        )}
      </Space>

      <DossierDangerDeleteModal
        open={dangerModalOpen}
        dossier={dossier}
        onClose={() => setDangerModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default DossierHeader;
