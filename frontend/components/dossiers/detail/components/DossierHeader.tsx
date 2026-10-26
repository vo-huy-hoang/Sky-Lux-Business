"use client";

import React from "react";
import Link from "next/link";
import { Breadcrumb, Button, Space, Tag, message } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  EditOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

export interface DossierHeaderProps {
  dossier: any;
  isDrawer?: boolean;
  isOperator?: boolean;
  isCeoAdmin?: boolean;
}

export function DossierHeader({
  dossier,
  isDrawer = false,
  isOperator = false,
  isCeoAdmin = false,
}: DossierHeaderProps) {
  const isLocked = dossier?.status === "LOCKED";

  if (isDrawer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-bold text-slate-900">
            {dossier?.name || "Chi tiết hồ sơ tour"}
          </h3>
          {dossier && <Tag color="blue">{dossier.code}</Tag>}
        </div>

        {dossier?.id && !isLocked && (
          <Space size="small">
            <Link href={`/dossiers/${dossier.id}/edit-import`}>
              <Button size="small" icon={<EditOutlined />}>
                Sửa dự toán
              </Button>
            </Link>
          </Space>
        )}
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
      </Space>
    </div>
  );
}

export default DossierHeader;
