import { BadRequestException } from '@nestjs/common';
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
import { WorkflowHistory } from './entities/workflow-history.entity';
import { DossierWorkflowService } from './dossier-workflow.service';
import { DossiersService } from '../dossiers/dossiers.service';

describe('Pillar 2: Dossier Lifecycle & State Machine Integration (Ticket 05)', () => {
  const orgId = 'org-lifecycle-test';
  const salesUser: CurrentUserPayload = {
    id: 'user-sales-1',
    organizationId: orgId,
    employeeCode: 'SL-001',
    fullName: 'Sales Lead',
    email: 'sales@skylux.com',
    roles: ['SALES'],
    permissions: ['dossier.update', 'dossier.view.own', 'estimate.update'],
  };

  const operatorUser: CurrentUserPayload = {
    id: 'user-op-1',
    organizationId: orgId,
    employeeCode: 'OP-001',
    fullName: 'Operator One',
    email: 'operator@skylux.com',
    roles: ['OPERATOR'],
    permissions: ['dossier.update', 'dossier.view.all', 'estimate.update'],
  };

  const adminUser: CurrentUserPayload = {
    id: 'user-admin-1',
    organizationId: orgId,
    employeeCode: 'ADM-001',
    fullName: 'CEO Admin',
    email: 'ceo@skylux.com',
    roles: ['CEO_ADMIN'],
    permissions: ['*'],
  };

  let workflowService: DossierWorkflowService;
  let auditLogsService: { record: jest.Mock };
  let redisService: { delByPattern: jest.Mock };
  let savedEntities: any[];

  beforeEach(() => {
    savedEntities = [];
    auditLogsService = { record: jest.fn().mockResolvedValue(undefined) };
    redisService = { delByPattern: jest.fn().mockResolvedValue(undefined) };

    const mockDataSource = {
      transaction: jest.fn(async (cb) => {
        return cb(mockManager);
      }),
      getRepository: jest.fn(),
    } as unknown as DataSource;

    const mockManager = {
      getRepository: jest.fn((entityClass) => {
        return {
          create: jest.fn((val) => val),
          save: jest.fn(async (val) => {
            savedEntities.push(val);
            return val;
          }),
          findOne: jest.fn(),
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          })),
        };
      }),
    } as unknown as EntityManager;

    workflowService = new DossierWorkflowService(
      mockDataSource,
      auditLogsService as any,
      undefined,
      redisService as any,
    );
  });

  describe('1. Atomic Dossier Revision inside Database Transaction (reviseApprovedEstimateInTx)', () => {
    it('executes APPROVED -> EDITING -> RESUBMITTED atomically and writes complete workflow history', async () => {
      const mockDossier = {
        id: 'dossier-approved-1',
        organizationId: orgId,
        code: 'HS-APP-01',
        status: DossierStatus.APPROVED,
        salesUserId: salesUser.id,
      } as Dossier;

      const mockEstimate = {
        id: 'est-approved-1',
        dossierId: mockDossier.id,
        organizationId: orgId,
        versionNo: 1,
        status: EstimateStatus.APPROVED,
      } as Estimate;

      const historySaved: WorkflowHistory[] = [];
      const approvalSaved: ApprovalRequest[] = [];
      let dossierSaved: Dossier | undefined;

      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier) {
            return {
              save: jest.fn(async (d) => {
                dossierSaved = d;
                return d;
              }),
            };
          }
          if (entity === WorkflowHistory) {
            return {
              create: jest.fn((val) => val),
              save: jest.fn(async (h) => {
                historySaved.push(h);
                return h;
              }),
            };
          }
          if (entity === ApprovalRequest) {
            return {
              create: jest.fn((val) => val),
              save: jest.fn(async (a) => {
                approvalSaved.push(a);
                return a;
              }),
              findOne: jest.fn().mockResolvedValue(null),
            };
          }
          return { save: jest.fn(async (x) => x), create: jest.fn((x) => x) };
        }),
      } as unknown as EntityManager;

      const result = await workflowService.reviseApprovedEstimateInTx(manager, {
        user: salesUser,
        dossier: mockDossier,
        estimate: mockEstimate,
        wasApproved: true,
        targetEstimateStatus: EstimateStatus.SUBMITTED,
      });

      expect(result.targetDossierStatus).toBe(DossierStatus.RESUBMITTED);
      expect(dossierSaved?.status).toBe(DossierStatus.RESUBMITTED);
      // Intermediate EDITING + Final RESUBMITTED history records
      expect(historySaved).toHaveLength(2);
      expect(historySaved[0].fromStatus).toBe(DossierStatus.APPROVED);
      expect(historySaved[0].toStatus).toBe(DossierStatus.EDITING);
      expect(historySaved[0].action).toBe('REVISE');
      expect(historySaved[1].fromStatus).toBe(DossierStatus.EDITING);
      expect(historySaved[1].toStatus).toBe(DossierStatus.RESUBMITTED);
      expect(historySaved[1].action).toBe('RESUBMIT');
      expect(approvalSaved).toHaveLength(1);
      expect(approvalSaved[0].status).toBe(ApprovalStatus.PENDING);
    });

    it('rolls back atomic unit of work when mid-revision workflow history or approval persistence fails', async () => {
      const mockDossier = {
        id: 'dossier-approved-2',
        organizationId: orgId,
        status: DossierStatus.APPROVED,
      } as Dossier;

      const mockEstimate = {
        id: 'est-approved-2',
        dossierId: mockDossier.id,
        organizationId: orgId,
        status: EstimateStatus.APPROVED,
      } as Estimate;

      const failingManager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier) {
            return { save: jest.fn(async (d) => d) };
          }
          if (entity === WorkflowHistory) {
            return {
              create: jest.fn((val) => val),
              save: jest.fn().mockRejectedValue(new Error('DB connection dropped during workflow history audit')),
            };
          }
          return { save: jest.fn(async (x) => x), create: jest.fn((x) => x) };
        }),
      } as unknown as EntityManager;

      await expect(
        workflowService.reviseApprovedEstimateInTx(failingManager, {
          user: salesUser,
          dossier: mockDossier,
          estimate: mockEstimate,
          wasApproved: true,
          targetEstimateStatus: EstimateStatus.SUBMITTED,
        }),
      ).rejects.toThrow('DB connection dropped during workflow history audit');
    });
  });

  describe('2. Import Initial Status Determination & Initial Workflow History (initializeImportedDossierInTx)', () => {
    it('initializes OPERATOR import as SUBMITTED with initial WorkflowHistory and ApprovalRequest', async () => {
      const mockDossier = {
        id: 'imported-dossier-1',
        organizationId: orgId,
        status: DossierStatus.DRAFT,
      } as Dossier;

      const mockEstimate = {
        id: 'imported-est-1',
        dossierId: mockDossier.id,
        organizationId: orgId,
        status: EstimateStatus.DRAFT,
      } as Estimate;

      let savedDossier: Dossier | undefined;
      let savedEstimate: Estimate | undefined;
      let savedHistory: WorkflowHistory | undefined;
      let savedApproval: ApprovalRequest | undefined;

      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier) {
            return {
              save: jest.fn(async (d) => {
                savedDossier = d;
                return d;
              }),
            };
          }
          if (entity === Estimate) {
            return {
              save: jest.fn(async (e) => {
                savedEstimate = e;
                return e;
              }),
            };
          }
          if (entity === WorkflowHistory) {
            return {
              create: jest.fn((v) => v),
              save: jest.fn(async (h) => {
                savedHistory = h;
                return h;
              }),
            };
          }
          if (entity === ApprovalRequest) {
            return {
              create: jest.fn((v) => v),
              save: jest.fn(async (a) => {
                savedApproval = a;
                return a;
              }),
            };
          }
          return { save: jest.fn(async (x) => x), create: jest.fn((x) => x) };
        }),
      } as unknown as EntityManager;

      const result = await workflowService.initializeImportedDossierInTx(manager, {
        user: operatorUser,
        dossier: mockDossier,
        estimate: mockEstimate,
      });

      expect(result.initialStatus).toBe(DossierStatus.SUBMITTED);
      expect(savedDossier?.status).toBe(DossierStatus.SUBMITTED);
      expect(savedEstimate?.status).toBe(EstimateStatus.SUBMITTED);
      expect(savedHistory?.fromStatus).toBe(DossierStatus.DRAFT);
      expect(savedHistory?.toStatus).toBe(DossierStatus.SUBMITTED);
      expect(savedHistory?.action).toBe('SUBMIT');
      expect(savedApproval?.stepCode).toBe('OPERATOR_REVIEW');
      expect(savedApproval?.status).toBe(ApprovalStatus.PENDING);
    });

    it('initializes CEO/Admin import as IN_REVIEW with EXECUTIVE_REVIEW approval request', async () => {
      const mockDossier = {
        id: 'imported-dossier-2',
        organizationId: orgId,
        status: DossierStatus.DRAFT,
      } as Dossier;

      const mockEstimate = {
        id: 'imported-est-2',
        dossierId: mockDossier.id,
        organizationId: orgId,
        status: EstimateStatus.DRAFT,
      } as Estimate;

      let savedApproval: ApprovalRequest | undefined;

      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier || entity === Estimate) {
            return { save: jest.fn(async (x) => x) };
          }
          if (entity === WorkflowHistory) {
            return { create: jest.fn((v) => v), save: jest.fn(async (h) => h) };
          }
          if (entity === ApprovalRequest) {
            return {
              create: jest.fn((v) => v),
              save: jest.fn(async (a) => {
                savedApproval = a;
                return a;
              }),
            };
          }
          return { save: jest.fn(async (x) => x), create: jest.fn((x) => x) };
        }),
      } as unknown as EntityManager;

      const result = await workflowService.initializeImportedDossierInTx(manager, {
        user: adminUser,
        dossier: mockDossier,
        estimate: mockEstimate,
      });

      expect(result.initialStatus).toBe(DossierStatus.IN_REVIEW);
      expect(savedApproval?.stepCode).toBe('EXECUTIVE_REVIEW');
    });

    it('initializes SALES import as DRAFT without creating pending approval request', async () => {
      const mockDossier = {
        id: 'imported-dossier-3',
        organizationId: orgId,
        status: DossierStatus.DRAFT,
      } as Dossier;

      const mockEstimate = {
        id: 'imported-est-3',
        dossierId: mockDossier.id,
        organizationId: orgId,
        status: EstimateStatus.DRAFT,
      } as Estimate;

      const approvalSaveSpy = jest.fn();

      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier || entity === Estimate) {
            return { save: jest.fn(async (x) => x) };
          }
          if (entity === WorkflowHistory) {
            return { create: jest.fn((v) => v), save: jest.fn(async (h) => h) };
          }
          if (entity === ApprovalRequest) {
            return { create: jest.fn((v) => v), save: approvalSaveSpy };
          }
          return { save: jest.fn(async (x) => x), create: jest.fn((x) => x) };
        }),
      } as unknown as EntityManager;

      const result = await workflowService.initializeImportedDossierInTx(manager, {
        user: salesUser,
        dossier: mockDossier,
        estimate: mockEstimate,
      });

      expect(result.initialStatus).toBe(DossierStatus.DRAFT);
      expect(result.approvalRequest).toBeUndefined();
      expect(approvalSaveSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Generic PATCH Rejection of Direct Status Mutation', () => {
    it('throws BadRequestException when update attempts to change status directly outside lifecycle state machine', async () => {
      const mockDossier = {
        id: 'dossier-patch-1',
        organizationId: orgId,
        code: 'HS-001',
        status: DossierStatus.DRAFT,
        salesUserId: salesUser.id,
        version: 1,
      } as Dossier;

      const mockRepo = {
        findOne: jest.fn().mockResolvedValue(mockDossier),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDossier),
        })),
      };

      const mockDataSource = {
        transaction: jest.fn(async (cb) => {
          return cb({
            getRepository: jest.fn(() => mockRepo),
          });
        }),
      };

      const mockAccessPolicy = {
        assertCanViewDossierEntity: jest.fn(),
        assertCanMutate: jest.fn(),
        assertCanMutateDossierEntity: jest.fn(),
      };

      const dossiersService = new DossiersService(
        mockRepo as any, // dossierRepository
        {} as any, // commentRepository
        {} as any, // customerRepository
        {} as any, // userRepository
        { record: jest.fn() } as any, // auditLogsService
        mockAccessPolicy as any, // dossierAccessPolicy
        mockDataSource as any, // dataSource
      );

      await expect(
        dossiersService.update(salesUser, mockDossier.id, {
          status: DossierStatus.SUBMITTED,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        dossiersService.update(salesUser, mockDossier.id, {
          status: DossierStatus.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify that save was never called
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
