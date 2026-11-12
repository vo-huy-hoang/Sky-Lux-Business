import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ChangePasswordDto } from '../../modules/auth/dto/change-password.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../modules/users/dto/update-user.dto';
import { CreateCeoUserDto } from '../../modules/users/dto/create-ceo-user.dto';
import { UpdateCeoUserDto } from '../../modules/users/dto/update-ceo-user.dto';

describe('Password Policy DTO Validation (Ticket 05)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const weakPasswords = [
    'Short1A', // 7 chars (< 8)
    'alllowercase1', // missing uppercase
    'ALLUPPERCASE1', // missing lowercase
    'NoDigitsHere', // missing digit
    '12345678', // missing upper & lower
    '', // empty explicit password
  ];

  const strongPasswords = ['SkyLuxPass1', 'Str0ngPass!', 'Abcdefg1'];

  describe('ChangePasswordDto', () => {
    it.each(weakPasswords)(
      'rejects weak newPassword "%s"',
      async (weakPassword) => {
        await expect(
          pipe.transform(
            {
              currentPassword: 'oldpass',
              newPassword: weakPassword,
            },
            { type: 'body', metatype: ChangePasswordDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it.each(strongPasswords)(
      'accepts strong newPassword "%s" even when legacy currentPassword is short',
      async (strongPassword) => {
        const result = await pipe.transform(
          {
            currentPassword: 'old6ch',
            newPassword: strongPassword,
          },
          { type: 'body', metatype: ChangePasswordDto },
        );
        expect(result.newPassword).toBe(strongPassword);
      },
    );
  });

  describe('CreateUserDto / UpdateUserDto / CreateCeoUserDto / UpdateCeoUserDto', () => {
    it.each(weakPasswords)(
      'rejects weak password "%s" on user creation',
      async (weakPassword) => {
        await expect(
          pipe.transform(
            {
              fullName: 'Staff User',
              email: 'staff@skylux.vn',
              password: weakPassword,
            },
            { type: 'body', metatype: CreateUserDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it.each(weakPasswords)(
      'rejects weak password "%s" on user update (admin reset)',
      async (weakPassword) => {
        await expect(
          pipe.transform(
            { password: weakPassword },
            { type: 'body', metatype: UpdateUserDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('rejects weak password on CEO creation and update DTOs', async () => {
      await expect(
        pipe.transform(
          {
            organizationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            fullName: 'CEO User',
            email: 'ceo@skylux.vn',
            password: 'weak',
          },
          { type: 'body', metatype: CreateCeoUserDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          { password: 'onlylowercase1' },
          { type: 'body', metatype: UpdateCeoUserDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows omitting password on CreateUserDto for temporary credential generation', async () => {
      const dto = await pipe.transform(
        {
          fullName: 'Staff User',
          email: 'staff@skylux.vn',
        },
        { type: 'body', metatype: CreateUserDto },
      );
      expect(dto.password).toBeUndefined();
    });

    it('accepts strong password on CreateUserDto and UpdateUserDto', async () => {
      const created = await pipe.transform(
        {
          fullName: 'Staff User',
          email: 'staff@skylux.vn',
          password: 'ValidPassword1',
        },
        { type: 'body', metatype: CreateUserDto },
      );
      expect(created.password).toBe('ValidPassword1');

      const updated = await pipe.transform(
        { password: 'ValidPassword2' },
        { type: 'body', metatype: UpdateUserDto },
      );
      expect(updated.password).toBe('ValidPassword2');
    });
  });

  describe('LoginDto legacy compatibility', () => {
    it('continues accepting 6+ character passwords at login so legacy users can sign in and rotate', async () => {
      const login = await pipe.transform(
        { email: 'legacy@skylux.vn', password: 'old6ch' },
        { type: 'body', metatype: LoginDto },
      );
      expect(login.password).toBe('old6ch');
    });
  });
});
