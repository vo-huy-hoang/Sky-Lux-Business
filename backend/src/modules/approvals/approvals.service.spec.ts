import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalRequest } from './entities/approval-request.entity';
import { DossierWorkflowService } from './dossier-workflow.service';

describe('ApprovalsService (folded into DossierLifecycle)', () => {
  let service: ApprovalsService;
  let mockWorkflowService: Partial<DossierWorkflowService>;

  beforeEach(async () => {
    mockWorkflowService = {
      findAllApprovals: jest.fn().mockResolvedValue({
        data: [{ id: 'appr-1' } as any],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
      findOneApproval: jest.fn().mockResolvedValue({ id: 'appr-1' } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: getRepositoryToken(ApprovalRequest), useValue: {} },
        { provide: DossierWorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('delegates findAll directly to DossierLifecycleService (DossierWorkflowService)', async () => {
    const result = await service.findAll('org-1', 'user-1', {
      page: 1,
      pageSize: 20,
    });
    expect(mockWorkflowService.findAllApprovals).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      { page: 1, pageSize: 20 },
    );
    expect(result.data).toHaveLength(1);
  });

  it('delegates findOne directly to DossierLifecycleService (DossierWorkflowService)', async () => {
    const result = await service.findOne('org-1', 'user-1', 'appr-1');
    expect(mockWorkflowService.findOneApproval).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'appr-1',
    );
    expect((result as any).id || (result as any).data?.id).toBe('appr-1');
  });
});
