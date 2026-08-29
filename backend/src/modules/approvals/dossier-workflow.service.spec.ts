import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  ApprovalStatus,
  DossierStatus,
  EstimateStatus,
} from '../../common/enums';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { DossierWorkflowService } from './dossier-workflow.service';

describe('DossierWorkflowService', () => {
  const user = {
    id: 'sales-user',
    organizationId: 'organization-id',
    employeeCode: 'SL-001',
    fullName: 'Sales User',
    email: 'sales@example.com',
    roles: ['SALES'],
    permissions: ['dossier.update', 'dossier.view.own'],
  } satisfies CurrentUserPayload;

  const dossier = {
    id: 'dossier-id',
    organizationId: user.organizationId,
    code: 'HS-001',
    status: DossierStatus.DRAFT,
    salesUserId: user.id,
    createdBy: user.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Dossier;

  const estimate = {
    id: 'estimate-id',
    dossierId: dossier.id,
    organizationId: user.organizationId,
    versionNo: 1,
    status: EstimateStatus.DRAFT,
  } as Estimate;

  function createService() {
    const dossierRepository = { findOne: jest.fn(), save: jest.fn() };
    const estimateRepository = { findOne: jest.fn(), save: jest.fn() };
    const approvalRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const historyRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Dossier) return dossierRepository;
        if (entity === Estimate) return estimateRepository;
        if (entity === ApprovalRequest) return approvalRepository;
        return historyRepository;
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
      getRepository: jest.fn(),
    } as unknown as DataSource;
    return {
      service: new DossierWorkflowService(dataSource),
      dossierRepository,
      estimateRepository,
      approvalRepository,
      historyRepository,
    };
  }

  it('submits an owned draft dossier, estimate, approval request and history together', async () => {
    const context = createService();
    context.dossierRepository.findOne.mockResolvedValue({ ...dossier });
    context.dossierRepository.save.mockImplementation((value) => value);
    context.estimateRepository.findOne.mockResolvedValue({ ...estimate });
    context.estimateRepository.save.mockImplementation((value) => value);

    const result = await context.service.submit(user, dossier.id, {
      note: 'Sẵn sàng để Điều hành xem xét',
    });

    expect(result.data.status).toBe(DossierStatus.SUBMITTED);
    expect(context.estimateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EstimateStatus.SUBMITTED }),
    );
    expect(context.approvalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ApprovalStatus.PENDING }),
    );
    expect(context.historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMIT',
        toStatus: DossierStatus.SUBMITTED,
      }),
    );
  });

  it('rejects an approval that skips the required review state', async () => {
    const context = createService();
    context.dossierRepository.findOne.mockResolvedValue({ ...dossier });
    const operator = { ...user, roles: ['OPERATOR'] };

    await expect(
      context.service.approve(operator, dossier.id, {}),
    ).rejects.toThrow(ConflictException);
  });
});
