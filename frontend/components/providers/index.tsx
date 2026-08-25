'use client';

import React from 'react';
import { AntdProvider } from './antd-provider';
import { QueryProvider } from './query-provider';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdProvider>
      <QueryProvider>{children}</QueryProvider>
    </AntdProvider>
  );
}
