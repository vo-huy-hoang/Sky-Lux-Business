import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ThrottlerLimitDetail,
  ThrottlerRequest,
} from '@nestjs/throttler/dist/throttler.guard.interface';
import { THROTTLER_LIMIT } from '@nestjs/throttler/dist/throttler.constants';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Phân tách phạm vi Throttler:
   * - Throttler 'auth' (limit: 5) chỉ được phép chạy trên các route có gắn @Throttle({ auth: ... })
   * - Các route nghiệp vụ thông thường (Dashboard, Dossiers, Tasks,...) tự động bỏ qua 'auth' và dùng 'default' (120 req/phút)
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;

    if (throttler.name === 'auth') {
      const handler = context.getHandler();
      const classRef = context.getClass();
      const authLimit = this.reflector.getAllAndOverride<number | undefined>(
        THROTTLER_LIMIT + throttler.name,
        [handler, classRef],
      );

      // Bỏ qua bộ đếm 'auth' nếu endpoint không yêu cầu bảo vệ auth đặc thù
      if (!authLimit) {
        return true;
      }
    }

    return super.handleRequest(requestProps);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const rawForwarded = req.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(rawForwarded)
      ? rawForwarded[0]
      : typeof rawForwarded === 'string'
        ? rawForwarded.split(',')[0].trim()
        : null;

    const ip =
      forwardedIp ||
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown-ip';

    // Nếu endpoint gửi body chứa email (vd đăng nhập), kết hợp IP + Email
    const email = req.body?.email
      ? String(req.body.email).toLowerCase().trim()
      : '';

    if (email) {
      return `${ip}:${email}`;
    }

    return ip;
  }

  protected async getErrorMessage(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<string> {
    const seconds = Math.max(1, Math.ceil(throttlerLimitDetail.timeToExpire / 1000));
    return `Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const seconds = Math.max(1, Math.ceil(throttlerLimitDetail.timeToExpire / 1000));
    const message = await this.getErrorMessage(context, throttlerLimitDetail);

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        lockoutSeconds: seconds,
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
