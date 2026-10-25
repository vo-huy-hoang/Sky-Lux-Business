import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerActivitiesService } from './customer-activities.service';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryDossierDto } from '../dossiers/dto/query-dossier.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { QueryCustomerActivityDto } from './dto/query-customer-activity.dto';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
@RequirePermissions('customer.manage')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerActivitiesService: CustomerActivitiesService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách khách hàng phân trang và tìm kiếm (API-CUSTOMER-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() queryDto: QueryCustomerDto,
  ) {
    return this.customersService.findAll(organizationId, queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết khách hàng theo ID (API-CUSTOMER-002)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.findOne(organizationId, id, actorUserId)
      : this.customersService.findOne(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng mới (API-CUSTOMER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.create(
          organizationId,
          createCustomerDto,
          actorUserId,
        )
      : this.customersService.create(organizationId, createCustomerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng (API-CUSTOMER-004)' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.update(
          organizationId,
          id,
          updateCustomerDto,
          actorUserId,
        )
      : this.customersService.update(organizationId, id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('OPERATOR', 'CEO_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Xóa khách hàng (API-CUSTOMER-005)' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.remove(organizationId, id, actorUserId)
      : this.customersService.remove(organizationId, id);
  }

  @Post(':id/contacts')
  @ApiOperation({
    summary: 'Tạo liên hệ mới cho khách hàng (API-CONTACT-002)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 201, description: 'Tạo liên hệ thành công' })
  createContact(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createContactDto: CreateContactDto,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.createContact(
          organizationId,
          id,
          createContactDto,
          actorUserId,
        )
      : this.customersService.createContact(
          organizationId,
          id,
          createContactDto,
        );
  }

  @Patch(':id/contacts/:contactId')
  @ApiOperation({
    summary: 'Cập nhật thông tin người liên hệ (API-CONTACT-003)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiParam({ name: 'contactId', description: 'Contact UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật liên hệ thành công' })
  updateContact(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() updateContactDto: UpdateContactDto,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.updateContact(
          organizationId,
          id,
          contactId,
          updateContactDto,
          actorUserId,
        )
      : this.customersService.updateContact(
          organizationId,
          id,
          contactId,
          updateContactDto,
        );
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({
    summary: 'Xóa người liên hệ của khách hàng (API-CONTACT-004)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiParam({ name: 'contactId', description: 'Contact UUID' })
  @ApiResponse({ status: 200, description: 'Xóa liên hệ thành công' })
  removeContact(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.customersService.removeContact(
          organizationId,
          id,
          contactId,
          actorUserId,
        )
      : this.customersService.removeContact(organizationId, id, contactId);
  }

  @Get(':id/dossiers')
  @ApiOperation({
    summary:
      'Lấy danh sách hồ sơ tour (Dossiers) liên quan đến khách hàng (API-CONTACT-005)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hồ sơ tour thành công',
  })
  findCustomerDossiers(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryDossierDto,
  ) {
    return this.customersService.findCustomerDossiers(
      organizationId,
      id,
      queryDto,
    );
  }

  @Get(':id/activities')
  @ApiOperation({
    summary: 'Lấy lịch sử hoạt động của khách hàng (API-CUSTOMER-006)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử hoạt động của khách hàng thành công',
  })
  findCustomerActivities(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryCustomerActivityDto,
  ) {
    return this.customerActivitiesService.findByCustomer(
      organizationId,
      id,
      queryDto,
    );
  }
}
