import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (HttpOnly Cookie Session - Ticket 04)', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      logout: jest.fn().mockResolvedValue({ message: 'Đăng xuất thành công' }),
      refreshToken: jest.fn(),
      getMe: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login sets HttpOnly access_token (Path=/api), refresh_token (Path=/api/auth/refresh), and csrf_token cookies without exposing JWTs in JSON response', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: 'jwt-access-secret',
      refreshToken: 'jwt-refresh-secret',
      user: { id: 'u1', email: 'a@skylux.vn' },
    });
    const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;

    const body = await (controller.login as any)(
      { email: 'a@skylux.vn', password: 'Password123!' },
      req,
      res,
    );

    expect(body).toEqual({ user: { id: 'u1', email: 'a@skylux.vn' } });
    expect((body as any).accessToken).toBeUndefined();
    expect((body as any).refreshToken).toBeUndefined();

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-access-secret',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'jwt-refresh-secret',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth/refresh',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('refresh reads refresh_token from HttpOnly cookie and sets rotated cookies', async () => {
    mockAuthService.refreshToken.mockResolvedValue({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
    });
    const res = { cookie: jest.fn() } as any;
    const req = {
      ip: '127.0.0.1',
      headers: {
        cookie: 'refresh_token=cookie-refresh-token; other=1',
      },
    } as any;

    const body = await (controller.refreshToken as any)({}, req, res);

    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
      { refreshToken: 'cookie-refresh-token' },
      '127.0.0.1',
      undefined,
    );
    expect((body as any).accessToken).toBeUndefined();
    expect((body as any).refreshToken).toBeUndefined();
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'rotated-access',
      expect.objectContaining({ httpOnly: true, path: '/api' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'rotated-refresh',
      expect.objectContaining({ httpOnly: true, path: '/api/auth/refresh' }),
    );
  });

  it('logout clears session cookies', async () => {
    const res = { clearCookie: jest.fn() } as any;
    const req = { headers: { cookie: '' } } as any;

    await (controller.logout as any)('u1', undefined, req, res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ path: '/api' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/auth/refresh' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.objectContaining({ path: '/' }),
    );
  });
});
