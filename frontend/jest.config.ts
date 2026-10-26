import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Cung cấp đường dẫn đến ứng dụng Next.js để nạp cấu hình next.config và biến môi trường
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/app/main/(.*)$': '<rootDir>/app/(main)/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Ant Design 6 ships some ESM files in @ant-design/colors and related
  // packages. Allow Next/Jest's SWC transformer to compile those packages
  // instead of trying to execute `import` syntax in the jsdom runtime.
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@ant-design|antd|@rc-component|rc-)/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

const resolveJestConfig = createJestConfig(config);

export default async () => {
  const resolvedConfig = await resolveJestConfig();

  // next/jest appends its own ignore rules. Replace them here so the
  // @ant-design ESM packages are not caught by the earlier default rule.
  resolvedConfig.transformIgnorePatterns = [
    '/node_modules/(?!(?:geist|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib|@ant-design|antd|@rc-component|rc-)/)',
    '/node_modules[\\\\/]\\.pnpm[\\\\/](?!(?:geist|next\\+dist\\+client|next\\+dist\\+shared\\+lib|next\\+src\\+client|next\\+src\\+shared\\+lib|@ant-design|antd|@rc-component|rc-)@)(?!.*node_modules[\\\\/](?:geist|next[\\\\/]dist[\\\\/]client|next[\\\\/]dist[\\\\/]shared[\\\\/]lib|next[\\\\/]src[\\\\/]client|next[\\\\/]src[\\\\/]shared[\\\\/]lib|@ant-design|antd|@rc-component|rc-)[\\\\/])',
    '^.+\\\\.module\\\\.(css|sass|scss)$',
  ];

  return resolvedConfig;
};
