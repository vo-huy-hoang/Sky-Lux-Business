import { BootstrapInput } from './production-admin-bootstrap';

export type Prompt = (question: string) => Promise<string>;

export async function collectBootstrapInput(
  apply: boolean,
  ask: Prompt,
  askSecret: Prompt,
): Promise<BootstrapInput> {
  const email = await ask('Email admin: ');
  const fullName = await ask('Họ tên admin: ');
  if (!apply) return { email, fullName };
  const password = await askSecret('Mật khẩu (không hiển thị): ');
  const passwordConfirmation = await askSecret('Nhập lại mật khẩu: ');
  return { email, fullName, password, passwordConfirmation };
}
