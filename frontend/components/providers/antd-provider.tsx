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
            colorPrimary: '#08664D',
            colorInfo: '#3487C8',
            colorSuccess: '#0B7A5B',
            colorWarning: '#E2A800',
            colorError: '#D94A4A',
            colorText: '#171A19',
            colorTextSecondary: '#66706C',
            colorBorder: '#E5E8E6',
            colorBgLayout: '#F8F9F8',
            colorBgContainer: '#FFFFFF',
            borderRadius: 8,
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          components: {
            Button: {
              controlHeight: 42,
              borderRadius: 8,
              fontWeight: 600,
              primaryShadow: 'none',
            },
            Input: {
              controlHeight: 42,
              borderRadius: 8,
              activeBorderColor: '#08664D',
              hoverBorderColor: '#9CC1B2',
              activeShadow: '0 0 0 3px rgb(8 102 77 / 0.10)',
            },
            Select: {
              controlHeight: 42,
              borderRadius: 8,
              optionSelectedBg: '#E8F3EE',
            },
            Card: {
              borderRadiusLG: 10,
              headerBg: '#FFFFFF',
              boxShadowTertiary:
                '0 1px 2px rgb(16 24 20 / 0.04)',
            },
            Table: {
              borderRadiusLG: 8,
              headerBg: '#FAFBFA',
              headerColor: '#303733',
              rowHoverBg: '#FAFBFA',
            },
            Tag: {
              borderRadiusSM: 6,
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
