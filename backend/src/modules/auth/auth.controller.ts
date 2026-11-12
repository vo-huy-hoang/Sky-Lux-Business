import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenClearOptions,
  getAccessTokenCookieOptions,
  getCsrfTokenClearOptions,
  getCsrfTokenCookieOptions,
  getRefreshTokenClearOptions,
  getRefreshTokenCookieOptions,
  parseCookieHeader,
} from '../../common/utils/cookie.util';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private issueSessionCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions());
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      getRefreshTokenCookieOptions(),
    );
    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, getCsrfTokenCookieOptions());
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, getAccessTokenClearOptions('/api'));
    res.clearCookie(ACCESS_TOKEN_COOKIE, getAccessTokenClearOptions('/'));
    res.clearCookie(
      REFRESH_TOKEN_COOKIE,
      getRefreshTokenClearOptions('/api/auth/refresh'),
    );
    res.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshTokenClearOptions('/'));
    res.clearCookie(CSRF_TOKEN_COOKIE, getCsrfTokenClearOptions());
  }

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống (API-AUTH-001)' })
  @ApiResponse({
    status: 200,
    description:
      'Đăng nhập thành công, thiết lập HttpOnly session cookies và trả về user info',
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc mật khẩu không chính xác',
  })
  @ApiResponse({
    status: 429,
    description: 'Đăng nhập thất bại quá nhiều lần, tạm thời bị giới hạn',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(loginDto, ipAddress, userAgent);
    this.issueSessionCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống (API-AUTH-002)' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const cookies = parseCookieHeader(req?.headers?.cookie);
    const effectiveRefreshToken =
      cookies[REFRESH_TOKEN_COOKIE] || refreshToken;
    const sessionFamilyId = (req as { user?: { familyId?: string } } | undefined)
      ?.user?.familyId;
    if (res) {
      this.clearSessionCookies(res);
    }
    return this.authService.logout(
      userId,
      effectiveRefreshToken,
      sessionFamilyId,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token (API-AUTH-003)' })
  @ApiResponse({ status: 200, description: 'Cấp token mới thành công' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc hết hạn',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const cookies = parseCookieHeader(req?.headers?.cookie);
    const rawRefreshToken =
      cookies[REFRESH_TOKEN_COOKIE] || refreshTokenDto?.refreshToken;

    const result = await this.authService.refreshToken(
      { refreshToken: rawRefreshToken },
      ipAddress,
      userAgent,
    );
    this.issueSessionCookies(res, result.accessToken, result.refreshToken);
    return { refreshed: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy thông tin tài khoản hiện tại kèm quyền & vai trò (API-AUTH-004)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản hiện tại' })
  getMe(
    @CurrentUser('id') userId: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (res) {
      const cookies = parseCookieHeader(req?.headers?.cookie);
      if (!cookies[CSRF_TOKEN_COOKIE]) {
        const csrfToken = crypto.randomBytes(24).toString('hex');
        res.cookie(CSRF_TOKEN_COOKIE, csrfToken, getCsrfTokenCookieOptions());
      }
    }
    return this.authService.getMe(userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật hồ sơ cá nhân của tài khoản hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật hồ sơ cá nhân thành công',
  })
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateMyProfile(userId, updateProfileDto);
  }

  @Patch('me/settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật cài đặt cá nhân của tài khoản hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cài đặt cá nhân thành công',
  })
  updateMySettings(
    @CurrentUser('id') userId: string,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.authService.updateMySettings(userId, updateUserSettingsDto);
  }

  @Get('stream-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cấp token ngắn hạn cho kết nối SSE' })
  @ApiResponse({ status: 200, description: 'Cấp stream token thành công' })
  createStreamToken(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.createStreamToken(user);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu người dùng (API-AUTH-005)' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mật khẩu hiện tại không đúng' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
