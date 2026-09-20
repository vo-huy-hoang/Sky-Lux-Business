import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('dossiers/:id/payments')
  @ApiOperation({ summary: 'Danh sách thanh toán của hồ sơ (API-PAYMENT-001)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getPaymentsByDossier(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') dossierId: string,
  ) {
    this.checkDossierViewPermission(user);
    return this.paymentsService.getPaymentsByDossier(user, dossierId);
  }

  @Post('dossiers/:id/payments')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Tạo khoản thanh toán (API-PAYMENT-002)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  createPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') dossierId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user, dossierId, dto);
  }

  @Get('payments/:id')
  @RequirePermissions('finance.view')
  @ApiOperation({ summary: 'Chi tiết khoản thanh toán (API-PAYMENT-003)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  getPaymentDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.paymentsService.getPaymentDetail(user, id);
  }

  @Patch('payments/:id')
  @RequirePermissions('finance.manage')
  @ApiOperation({ summary: 'Cập nhật khoản thanh toán (API-PAYMENT-004)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.updatePayment(user, id, dto);
  }

  @Get('dossiers/:id/finance-summary')
  @ApiOperation({ summary: 'Tổng hợp tài chính hồ sơ (API-PAYMENT-005)' })
  @ApiResponse({ status: 200, description: 'Tính toán thành công' })
  getFinanceSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') dossierId: string,
  ) {
    this.checkDossierViewPermission(user);
    return this.paymentsService.getFinanceSummary(user, dossierId);
  }

  private checkDossierViewPermission(user: CurrentUserPayload) {
    const canView =
      user.permissions.includes('dossier.view.own') ||
      user.permissions.includes('dossier.view.team') ||
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (!canView) {
      throw new ForbiddenException(
        'Access denied: Yêu cầu quyền xem hồ sơ (dossier.view.own, dossier.view.team hoặc dossier.view.all)',
      );
    }
  }
}
