import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter (Ticket 04 Production Redaction)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { method: 'GET', url: '/api/dossiers' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it('redacts raw SQL/ORM error messages for uncaught exceptions in production', () => {
    process.env.NODE_ENV = 'production';
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new Error(
        'QueryFailedError: syntax error at or near "SELECT * FROM users"',
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('preserves explicit HttpException validation messages in production', () => {
    process.env.NODE_ENV = 'production';
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException('Dữ liệu đầu vào không hợp lệ', HttpStatus.BAD_REQUEST),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Dữ liệu đầu vào không hợp lệ',
      }),
    );
  });

  it('maps OptimisticLockVersionMismatchError to 409 Conflict', () => {
    process.env.NODE_ENV = 'production';
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new OptimisticLockVersionMismatchError('Dossier', 1, 2), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
      }),
    );
  });

  it('preserves structured code such as PASSWORD_CHANGE_REQUIRED on HttpException', () => {
    process.env.NODE_ENV = 'production';
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        {
          statusCode: 403,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message:
            'Bạn cần đổi mật khẩu khởi tạo trước khi tiếp tục sử dụng hệ thống',
        },
        HttpStatus.FORBIDDEN,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message:
          'Bạn cần đổi mật khẩu khởi tạo trước khi tiếp tục sử dụng hệ thống',
      }),
    );
  });
});
