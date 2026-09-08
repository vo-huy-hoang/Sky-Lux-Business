import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalRequest } from './entities/approval-request.entity';

describe('ApprovalsService', () => {
  let service: ApprovalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: getRepositoryToken(ApprovalRequest), useValue: {} },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
