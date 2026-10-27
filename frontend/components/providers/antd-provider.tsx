'use client';

import React from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type Entity from '@ant-design/cssinjs/es/Cache';
import { useServerInsertedHTML } from 'next/navigation';
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { antThemeConfig } from '@/lib/theme/tokens.config';

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
          ...antThemeConfig,
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}

