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
  ForbiddenException,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DossiersService } from './dossiers.service';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DossierWorkflowService } from '../approvals/dossier-workflow.service';
import { WorkflowActionDto } from '../approvals/dto/workflow-action.dto';
import { WorkflowListQueryDto } from '../approvals/dto/workflow-list-query.dto';
import { DocumentsService } from '../documents/documents.service';
import { QueryDocumentDto } from '../documents/dto/query-document.dto';
import { CreateDocumentDto } from '../documents/dto/create-document.dto';
import { RespondChangeRequestDto } from '../approvals/dto/respond-change-request.dto';

@ApiTags('Dossiers')
@ApiBearerAuth('JWT-auth')
@Controller('dossiers')
export class DossiersController {
  constructor(
    private readonly dossiersService: DossiersService,
    private readonly dossierWorkflowService: DossierWorkflowService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách hồ sơ phân trang và tìm kiếm (API-DOSSIER-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QueryDossierDto,
  ) {
    this.checkViewPermission(user);
    return this.dossiersService.findAll(user, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ theo ID (API-DOSSIER-002)' })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.checkViewPermission(user);
    return this.dossiersService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('dossier.create')
  @ApiOperation({ summary: 'Tạo hồ sơ mới (API-DOSSIER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createDossierDto: CreateDossierDto,
  ) {
    return this.dossiersService.create(user, createDossierDto);
  }

  @Patch(':id')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ (API-DOSSIER-004)' })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDossierDto: UpdateDossierDto,
  ) {
    return this.dossiersService.update(user, id, updateDossierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('dossier.update')
  @Roles('OPERATOR', 'CEO_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Xóa hồ sơ (API-DOSSIER-005)' })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossiersService.remove(user, id);
  }

  @Post(':id/submit')
  @RequirePermissions('dossier.update')
  @ApiOperation({
    summary: 'Submit hồ sơ để Điều hành xem xét (API-WORKFLOW-001)',
  })
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.submit(user, id, dto);
  }

  @Post(':id/start-review')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Bắt đầu review hồ sơ (API-WORKFLOW-002)' })
  startReview(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.startReview(user, id, dto);
  }

  @Post(':id/return-to-operations')
  @RequirePermissions('dossier.update')
  @Roles('CEO_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Chuyển hồ sơ đang xem xét về hàng chờ Điều hành' })
  returnToOperations(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.returnToOperations(user, id, dto);
  }

  @Post(':id/request-changes')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Yêu cầu Sales bổ sung hồ sơ (API-WORKFLOW-003)' })
  requestChanges(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.requestChanges(user, id, dto);
  }

  @Post(':id/resubmit')
  @RequirePermissions('dossier.update')
  @ApiOperation({
    summary: 'Sales submit lại hồ sơ đã bổ sung (API-WORKFLOW-004)',
  })
  resubmit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.resubmit(user, id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('dossier.approve')
  @ApiOperation({ summary: 'Phê duyệt hồ sơ (API-WORKFLOW-005)' })
  approve(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.approve(user, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Hoàn tất hồ sơ đã duyệt (API-WORKFLOW-006)' })
  complete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.complete(user, id, dto);
  }

  @Post(':id/lock')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Khóa hồ sơ đã duyệt/hoàn tất (API-WORKFLOW-007)' })
  lock(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
  ) {
    return this.dossierWorkflowService.lock(user, id, dto);
  }

  @Get(':id/workflow-history')
  @ApiOperation({ summary: 'Lấy lịch sử workflow (API-WORKFLOW-008)' })
  findWorkflowHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: WorkflowListQueryDto,
  ) {
    this.checkViewPermission(user);
    return this.dossierWorkflowService.findHistory(user, id, query);
  }

  @Get(':id/approvals')
  @ApiOperation({
    summary: 'Lấy danh sách approval của hồ sơ (API-WORKFLOW-009)',
  })
  findApprovals(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: WorkflowListQueryDto,
  ) {
    this.checkViewPermission(user);
    return this.dossierWorkflowService.findApprovals(user, id, query);
  }

  @Get(':id/change-requests')
  @ApiOperation({ summary: 'Lấy các yêu cầu bổ sung của hồ sơ' })
  findChangeRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.checkViewPermission(user);
    return this.dossierWorkflowService.findChangeRequests(user, id);
  }

  @Post(':id/change-requests/:requestId/respond')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Sales trả lời một yêu cầu bổ sung cụ thể' })
  respondToChangeRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondChangeRequestDto,
  ) {
    return this.dossierWorkflowService.respondToChangeRequest(
      user,
      id,
      requestId,
      dto,
    );
  }

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Lấy danh sách bình luận của hồ sơ tour (API-COMMENT-001)',
  })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bình luận thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập hồ sơ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ' })
  findComments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryCommentDto,
  ) {
    this.checkViewPermission(user);
    return this.dossiersService.findComments(user, id, queryDto);
  }

  @Post(':id/comments')
  @RequirePermissions('dossier.update')
  @ApiOperation({
    summary: 'Tạo bình luận cho hồ sơ tour (API-COMMENT-002)',
  })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({
    status: 201,
    description: 'Tạo bình luận thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc hồ sơ đã bị khóa',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật hồ sơ' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hồ sơ hoặc bình luận gốc',
  })
  createComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.dossiersService.createComment(user, id, createCommentDto);
  }

  @Get(':id/documents')
  @ApiOperation({
    summary: 'Lấy danh sách tài liệu của hồ sơ (API-DOCUMENT-001)',
  })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tài liệu thành công',
  })
  findDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryDocumentDto,
  ) {
    this.checkViewPermission(user);
    return this.documentsService.findByDossier(user, id, queryDto);
  }

  @Post(':id/documents')
  @RequirePermissions('dossier.update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tải lên tài liệu cho hồ sơ (API-DOCUMENT-002)',
  })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentTypeId: { type: 'string', format: 'uuid' },
        estimateId: { type: 'string', format: 'uuid' },
        changeNote: { type: 'string', example: 'Hợp đồng tour ký kết' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Tải lên tài liệu thành công' })
  uploadDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.uploadForDossier(
      user,
      id,
      file,
      createDocumentDto,
    );
  }

  private checkViewPermission(user: CurrentUserPayload) {
    const hasViewPerm =
      user.permissions.includes('dossier.view.own') ||
      user.permissions.includes('dossier.view.team') ||
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (!hasViewPerm) {
      throw new ForbiddenException(
        'Access denied: Yêu cầu quyền xem hồ sơ (dossier.view.own, dossier.view.team hoặc dossier.view.all)',
      );
    }
  }
}
