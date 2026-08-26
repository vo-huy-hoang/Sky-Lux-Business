import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If response already has custom format or is file stream
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        // If response contains pagination metadata (data and meta)
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            statusCode,
            message: (data as any).message || 'Operation successful',
            data: (data as any).data,
            meta: (data as any).meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode,
          message: data?.message || 'Operation successful',
          data: data?.message && Object.keys(data).length === 1 ? null : (data?.data !== undefined ? data.data : data),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
