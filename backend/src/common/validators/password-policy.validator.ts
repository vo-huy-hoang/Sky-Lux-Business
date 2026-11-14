import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import * as crypto from 'crypto';

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const STRONG_PASSWORD_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số';

export function isStrongPassword(value: unknown): boolean {
  return typeof value === 'string' && STRONG_PASSWORD_REGEX.test(value);
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          return isStrongPassword(value);
        },
        defaultMessage(): string {
          return STRONG_PASSWORD_MESSAGE;
        },
      },
    });
  };
}

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const DIGIT_CHARS = '23456789';
const SYMBOL_CHARS = '@#$!';
const ALL_TEMP_PASSWORD_CHARS =
  UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

export function generateTemporaryPassword(length = 14): string {
  const effectiveLength = Math.max(length, 10);
  const chars: string[] = [
    UPPERCASE_CHARS[crypto.randomInt(UPPERCASE_CHARS.length)],
    LOWERCASE_CHARS[crypto.randomInt(LOWERCASE_CHARS.length)],
    DIGIT_CHARS[crypto.randomInt(DIGIT_CHARS.length)],
    SYMBOL_CHARS[crypto.randomInt(SYMBOL_CHARS.length)],
  ];

  for (let i = chars.length; i < effectiveLength; i += 1) {
    chars.push(
      ALL_TEMP_PASSWORD_CHARS[crypto.randomInt(ALL_TEMP_PASSWORD_CHARS.length)],
    );
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}
