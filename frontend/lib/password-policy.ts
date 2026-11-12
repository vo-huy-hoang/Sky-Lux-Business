import type { Rule } from 'antd/es/form';

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số';

export function isStrongPassword(value: unknown): boolean {
  return typeof value === 'string' && STRONG_PASSWORD_REGEX.test(value);
}

export function getStrongPasswordFormRules(
  required: boolean,
  requiredMessage = 'Vui lòng nhập mật khẩu',
): Rule[] {
  return [
    ...(required ? [{ required: true, message: requiredMessage }] : []),
    {
      validator(_, value) {
        if (!value || isStrongPassword(value)) {
          return Promise.resolve();
        }
        return Promise.reject(new Error(STRONG_PASSWORD_MESSAGE));
      },
    },
  ];
}

