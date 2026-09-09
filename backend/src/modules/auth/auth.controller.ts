import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống (API-AUTH-001)' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về tokens và user info',
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc mật khẩu không chính xác',
  })
  @ApiResponse({
    status: 429,
    description: 'Đăng nhập thất bại quá nhiều lần, tạm thời bị giới hạn',
  })
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống (API-AUTH-002)' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.authService.logout(userId, refreshToken);
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
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(refreshTokenDto, ipAddress, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy thông tin tài khoản hiện tại kèm quyền & vai trò (API-AUTH-004)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản hiện tại' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
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
