import * as readline from 'node:readline';
import dataSource from '../data-source';
import {
  runProductionAdminBootstrap,
  validateProductionDatabaseEnvironment,
} from './production-admin-bootstrap';
import { collectBootstrapInput } from './cli-input';

function parseFlags(argv: string[]): Set<string> {
  const allowed = new Set([
    '--apply',
    '--dry-run',
    '--confirm-production',
    '--confirm-backup',
    '--help',
  ]);
  const flags = new Set(argv);
  for (const flag of flags)
    if (!allowed.has(flag))
      throw new Error(`Tham số không được hỗ trợ: ${flag}`);
  if (flags.has('--apply') && flags.has('--dry-run'))
    throw new Error('Chỉ chọn một trong --dry-run hoặc --apply.');
  return flags;
}

function ask(question: string): Promise<string> {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    terminal.question(question, (answer) => {
      terminal.close();
      resolve(answer);
    });
  });
}

function askSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(
      new Error(
        'Cần TTY tương tác để nhập mật khẩu an toàn; CLI từ chối chế độ nhập thay thế.',
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    const onKeypress = (_chunk: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Đã hủy nhập mật khẩu.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        process.stdout.write('\n');
        cleanup();
        resolve(value);
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (key.sequence && !key.ctrl && !key.meta) {
        value += key.sequence;
      }
    };
    const cleanup = () => {
      stdin.removeListener('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    };
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', onKeypress);
    process.stdout.write(question);
  });
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.has('--help')) {
    process.stdout.write(
      'Dùng: node dist/database/bootstrap/cli.js [--dry-run | --apply --confirm-production --confirm-backup]\n',
    );
    return;
  }
  const apply = flags.has('--apply');
  validateProductionDatabaseEnvironment(process.env);
  if (apply) {
    if (!flags.has('--confirm-production') || !flags.has('--confirm-backup')) {
      throw new Error('--apply cần --confirm-production và --confirm-backup.');
    }
    if (!process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error('--apply chỉ chạy trong TTY tương tác.');
    if (
      (
        await ask('Nhập PRODUCTION để xác nhận đúng database Production: ')
      ).trim() !== 'PRODUCTION'
    ) {
      throw new Error('Xác nhận Production không khớp.');
    }
    if (
      (
        await ask('Nhập BACKUP VERIFIED sau khi xác minh backup PostgreSQL: ')
      ).trim() !== 'BACKUP VERIFIED'
    ) {
      throw new Error('Chưa xác nhận backup hợp lệ.');
    }
  }
  const input = await collectBootstrapInput(apply, ask, askSecret);
  await dataSource.initialize();
  const result = await runProductionAdminBootstrap(dataSource, input, {
    apply,
  });
  if (result.status === 'planned') {
    process.stdout.write(
      `DRY-RUN: ${result.email} / ${result.employeeCode}; tạo organization SKYLUX nếu cần, ${result.permissionsToCreate} permission, SUPER_ADMIN và ${result.rolePermissionsToCreate} role_permission.\n`,
    );
  } else if (result.status === 'created') {
    process.stdout.write(
      `Đã khởi tạo admin ${result.email} (${result.employeeCode}) trong transaction.\n`,
    );
  } else {
    process.stdout.write(
      `Đã bootstrap trước đó; không có thay đổi. Admin: ${result.email} (${result.employeeCode}).\n`,
    );
  }
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định.';
    process.stderr.write(`Bootstrap thất bại: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
