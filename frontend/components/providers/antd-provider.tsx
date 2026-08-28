'use client';

import React from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type Entity from '@ant-design/cssinjs/es/Cache';
import { useServerInsertedHTML } from 'next/navigation';
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

export function AntdProvider({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState<Entity>(() => createCache());

  useServerInsertedHTML(() => {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `</script>${extractStyle(cache)}<script>`,
        }}
      />
    );
  });

  return (
    <StyleProvider cache={cache}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#00543D',
            colorInfo: '#2F80ED',
            colorSuccess: '#007A55',
            colorWarning: '#F59E0B',
            colorError: '#D93737',
            colorText: '#111827',
            colorTextSecondary: '#6B7280',
            colorBorder: '#E8E8E8',
            colorBgLayout: '#F8F8F8',
            colorBgContainer: '#FFFFFF',
            borderRadius: 8,
            fontFamily:
              'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          components: {
            Button: {
              controlHeight: 42,
              borderRadius: 8,
              fontWeight: 600,
              primaryShadow: '0 10px 20px rgb(0 84 61 / 0.14)',
            },
            Input: {
              controlHeight: 42,
              borderRadius: 8,
              activeBorderColor: '#00543D',
              hoverBorderColor: '#B7D3C7',
              activeShadow: '0 0 0 3px rgb(0 84 61 / 0.10)',
            },
            Select: {
              controlHeight: 42,
              borderRadius: 8,
              optionSelectedBg: '#EAF5EF',
            },
            Card: {
              borderRadiusLG: 10,
              headerBg: '#FFFFFF',
              boxShadowTertiary:
                '0 1px 2px rgb(16 24 40 / 0.04), 0 8px 24px rgb(16 24 40 / 0.03)',
            },
            Table: {
              borderRadiusLG: 8,
              headerBg: '#F9FAFA',
              headerColor: '#374151',
              rowHoverBg: '#F9FAFA',
            },
            Tag: {
              borderRadiusSM: 999,
              fontSizeSM: 12,
            },
          },
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
