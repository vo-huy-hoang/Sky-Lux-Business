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
            colorPrimary: '#0A2540',
            colorInfo: '#1890FF',
            colorSuccess: '#52C41A',
            colorWarning: '#FAAD14',
            colorError: '#FF4D4F',
            borderRadius: 8,
            fontFamily:
              'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          components: {
            Button: {
              controlHeight: 38,
              borderRadius: 8,
              fontWeight: 500,
            },
            Input: {
              controlHeight: 38,
              borderRadius: 8,
            },
            Select: {
              controlHeight: 38,
              borderRadius: 8,
            },
            Card: {
              borderRadiusLG: 12,
            },
            Table: {
              borderRadiusLG: 8,
            },
          },
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
