import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ImportProcessor } from './import.processor';
import { ImportSession } from '../entities/import-session.entity';
import { ImportRow } from '../entities/import-row.entity';
import { ImportError } from '../entities/import-error.entity';
import { Customer } from '../../customers/entities/customer.entity';

describe('ImportProcessor', () => {
  let processor: ImportProcessor;
  let sessionRepository: any;
  let rowRepository: any;
  let errorRepository: any;
  let customerRepository: any;

  beforeEach(async () => {
    sessionRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    rowRepository = {
      delete: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
      find: jest.fn(),
    };

    errorRepository = {
      delete: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
    };

    customerRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportProcessor,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: sessionRepository,
        },
        {
          provide: getRepositoryToken(ImportRow),
          useValue: rowRepository,
        },
        {
          provide: getRepositoryToken(ImportError),
          useValue: errorRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: customerRepository,
        },
      ],
    }).compile();

    processor = module.get<ImportProcessor>(ImportProcessor);
  });

  describe('handleValidateRows with dynamic mappingConfig', () => {
    it('should validate using default Vietnamese column headers when no template exists', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-1',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'D-001',
            'Tên hồ sơ': 'My Dossier',
            'Mã khách hàng': 'KH001',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue({ id: 'cust-uuid' });

      // Run private method by casting to any
      await (processor as any).handleValidateRows('session-id');

      expect(rowRepository.save).toHaveBeenCalled();
      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('VALID');
      expect(savedRow.normalizedData).toEqual({
        code: 'D-001',
        name: 'My Dossier',
        customerId: 'cust-uuid',
        route: '',
        startDate: undefined,
        endDate: undefined,
        priority: 'MEDIUM',
      });
    });

    it('should validate using custom English column headers from template mappingConfig', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        template: {
          mappingConfig: {
            codeColumn: 'Dossier Code',
            nameColumn: 'Dossier Name',
            customerColumn: 'Cust ID',
          },
        },
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-1',
          rowNumber: 2,
          rawData: {
            'Dossier Code': 'D-ENG-99',
            'Dossier Name': 'English Dossier',
            'Cust ID': 'KH999',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue({ id: 'cust-uuid-99' });

      await (processor as any).handleValidateRows('session-id');

      expect(rowRepository.save).toHaveBeenCalled();
      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('VALID');
      expect(savedRow.normalizedData.code).toBe('D-ENG-99');
      expect(savedRow.normalizedData.name).toBe('English Dossier');
      expect(savedRow.normalizedData.customerId).toBe('cust-uuid-99');
    });

    it('should validate and normalize customer fields (name, phone, email, dateOfBirth) properly', async () => {
      const mockSession = {
        id: 'session-id-custom',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-valid',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'D-002',
            'Tên hồ sơ': 'Tour Da Nang',
            'Mã khách hàng': 'KH002',
            'Tên khách hàng': 'Tran Van B',
            'Số điện thoại': '0987654321',
            'Email': 'vanb@example.com',
            'Ngày sinh nhật': '1995-10-20',
          },
          status: 'PENDING',
        },
        {
          id: 'row-invalid-email-phone',
          rowNumber: 3,
          rawData: {
            'Mã hồ sơ': 'D-003',
            'Tên hồ sơ': 'Tour Nha Trang',
            'Mã khách hàng': 'KH003',
            'Số điện thoại': 'abc-not-phone',
            'Email': 'invalid-email',
            'Ngày sinh nhật': '2099-01-01',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.code === 'KH002') return Promise.resolve({ id: 'cust-uuid-2' });
        if (where.code === 'KH003') return Promise.resolve({ id: 'cust-uuid-3' });
        return Promise.resolve(null);
      });

      await (processor as any).handleValidateRows('session-id-custom');

      expect(rowRepository.save).toHaveBeenCalledTimes(2);

      // Row 1 should be valid with normalized customer data
      const validRow = rowRepository.save.mock.calls[0][0];
      expect(validRow.status).toBe('VALID');
      expect(validRow.normalizedData.customerName).toBe('Tran Van B');
      expect(validRow.normalizedData.phone).toBe('0987654321');
      expect(validRow.normalizedData.email).toBe('vanb@example.com');
      expect(validRow.normalizedData.dateOfBirth).toBe('1995-10-20');

      // Row 2 should have validation errors
      const errorRow = rowRepository.save.mock.calls[1][0];
      expect(errorRow.status).toBe('ERROR');
      expect(errorRepository.save).toHaveBeenCalled();
    });
  });
});
