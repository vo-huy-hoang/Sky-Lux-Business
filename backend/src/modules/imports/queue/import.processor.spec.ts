import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ImportProcessor } from './import.processor';
import { ImportSession } from '../entities/import-session.entity';
import { ImportRow } from '../entities/import-row.entity';
import { ImportError } from '../entities/import-error.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { CUSTOMER_BUDGET_FORMAT } from '../customer-budget.parser';

describe('ImportProcessor', () => {
  let processor: ImportProcessor;
  let sessionRepository: any;
  let rowRepository: any;
  let errorRepository: any;
  let customerRepository: any;
  let dossierRepository: any;

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
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'auto-cust-uuid', ...entity }),
      ),
    };

    dossierRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
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
        {
          provide: getRepositoryToken(Dossier),
          useValue: dossierRepository,
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
            Email: 'vanb@example.com',
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
            Email: 'invalid-email',
            'Ngày sinh nhật': '2099-01-01',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.code === 'KH002')
          return Promise.resolve({ id: 'cust-uuid-2' });
        if (where.code === 'KH003')
          return Promise.resolve({ id: 'cust-uuid-3' });
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

    it('should auto-create customer when customer code does not exist in CRM', async () => {
      const mockSession = {
        id: 'session-autocreate',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-new-cust',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'TOUR-NEW-01',
            'Tên hồ sơ': 'Tour Phu Quoc 3N2D',
            'Mã khách hàng': 'KH-BRAND-NEW',
            'Tên khách hàng': 'Le Thi C',
            'Số điện thoại': '0933445566',
            Email: 'lethic@gmail.com',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue(null); // Not found

      await (processor as any).handleValidateRows('session-autocreate');

      expect(customerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'KH-BRAND-NEW',
          displayName: 'Le Thi C',
          phone: '0933445566',
          email: 'lethic@gmail.com',
        }),
      );
      expect(customerRepository.save).toHaveBeenCalled();

      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('VALID');
      expect(savedRow.normalizedData.customerId).toBe('auto-cust-uuid');
    });

    it('should detect in-file duplicate dossier codes and flag error', async () => {
      const mockSession = {
        id: 'session-dup',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-dup-1',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'TOUR-DUPLICATE',
            'Tên hồ sơ': 'Tour 1',
            'Mã khách hàng': 'KH001',
          },
          status: 'PENDING',
        },
        {
          id: 'row-dup-2',
          rowNumber: 3,
          rawData: {
            'Mã hồ sơ': 'TOUR-DUPLICATE',
            'Tên hồ sơ': 'Tour 2',
            'Mã khách hàng': 'KH001',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue({ id: 'cust-uuid' });

      await (processor as any).handleValidateRows('session-dup');

      expect(errorRepository.save).toHaveBeenCalled();
      const savedErrors = errorRepository.save.mock.calls[0][0];
      expect(
        savedErrors.some((e: any) => e.errorMessage.includes('bị trùng lặp')),
      ).toBe(true);
    });

    it('should reject invalid date range when endDate is before startDate', async () => {
      const mockSession = {
        id: 'session-invalid-dates',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-date-error',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'TOUR-DATE-ERR',
            'Tên hồ sơ': 'Tour Logic Error',
            'Mã khách hàng': 'KH001',
            'Ngày bắt đầu': '2026-10-10',
            'Ngày kết thúc': '2026-10-05',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue({ id: 'cust-uuid' });

      await (processor as any).handleValidateRows('session-invalid-dates');

      expect(errorRepository.save).toHaveBeenCalled();
      const savedErrors = errorRepository.save.mock.calls[0][0];
      expect(
        savedErrors.some((e: any) =>
          e.errorMessage.includes('không thể trước'),
        ),
      ).toBe(true);
    });

    it('should sanitize formula injection values starting with =, +, -, @', async () => {
      const mockSession = {
        id: 'session-sanitize',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-formula',
          rowNumber: 2,
          rawData: {
            'Mã hồ sơ': 'TOUR-SAFE',
            'Tên hồ sơ': '=cmd|/c calc!A1',
            'Mã khách hàng': 'KH001',
            'Tuyến đường': '+SUM(1,2)',
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockResolvedValue({ id: 'cust-uuid' });

      await (processor as any).handleValidateRows('session-sanitize');

      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('VALID');
      expect(savedRow.normalizedData.name).toBe("'=cmd|/c calc!A1");
      expect(savedRow.normalizedData.route).toBe("'+SUM(1,2)");
    });

    it('should reject a customer import when the phone belongs to another email', async () => {
      const mockSession = {
        id: 'session-customer-conflict',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-customer-conflict',
          rowNumber: 1,
          rawData: {
            'Mã hồ sơ': 'IMP-CONFLICT-01',
            'Tên hồ sơ': 'Tour Conflict',
            'Tên khách hàng': 'Nguyễn Văn B',
            Email: 'nguyenvanb@gmail.com',
            'Số điện thoại': '0974231555',
            __importFormat: CUSTOMER_BUDGET_FORMAT,
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.phone === '0974231555') {
          return Promise.resolve({
            id: 'existing-customer',
            displayName: 'Nguyễn Văn D',
            email: 'nguyenvand@gmail.com',
            phone: '0974231555',
          });
        }
        return Promise.resolve(null);
      });

      await (processor as any).handleValidateRows('session-customer-conflict');

      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('ERROR');
      const savedErrors = errorRepository.save.mock.calls[0][0];
      expect(
        savedErrors.some((error: any) =>
          error.errorMessage.includes('đã tồn tại trong danh sách khách hàng'),
        ),
      ).toBe(true);
    });

    it('should allow overlapping dates when the company name is different', async () => {
      const mockSession = {
        id: 'session-overlap-different-company',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      dossierRepository.find.mockResolvedValue([
        {
          name: 'TOUR CÔNG TY ABC',
          startDate: '2026-09-30',
          endDate: '2026-10-02',
        },
      ]);

      const mockRows = [
        {
          id: 'row-overlap-different-company',
          rowNumber: 1,
          rawData: {
            'Mã hồ sơ': 'IMP-300926-TOUR-CONG-TY-XYZ',
            'Tên hồ sơ': 'TOUR CÔNG TY XYZ',
            'Tên khách hàng': 'Nguyễn Văn XYZ',
            'Ngày bắt đầu': '2026-09-30',
            'Ngày kết thúc': '2026-10-02',
            __importFormat: CUSTOMER_BUDGET_FORMAT,
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);

      await (processor as any).handleValidateRows(
        'session-overlap-different-company',
      );

      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('VALID');
      expect(errorRepository.save).not.toHaveBeenCalled();
    });

    it('should reject overlapping dates when the company name is the same', async () => {
      const mockSession = {
        id: 'session-overlap-same-company',
        organizationId: 'org-id',
        template: null,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      dossierRepository.find.mockResolvedValue([
        {
          name: 'TOUR CÔNG TY ABC',
          startDate: '2026-09-30',
          endDate: '2026-10-02',
        },
      ]);

      const mockRows = [
        {
          id: 'row-overlap-same-company',
          rowNumber: 1,
          rawData: {
            'Mã hồ sơ': 'IMP-011026-TOUR-CONG-TY-ABC',
            'Tên hồ sơ': 'tour cong ty abc',
            'Tên khách hàng': 'Nguyễn Văn ABC',
            'Ngày bắt đầu': '2026-09-30',
            'Ngày kết thúc': '2026-10-02',
            __importFormat: CUSTOMER_BUDGET_FORMAT,
          },
          status: 'PENDING',
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);

      await (processor as any).handleValidateRows(
        'session-overlap-same-company',
      );

      const savedRow = rowRepository.save.mock.calls[0][0];
      expect(savedRow.status).toBe('ERROR');
      const savedErrors = errorRepository.save.mock.calls[0][0];
      expect(
        savedErrors.some((error: any) =>
          error.errorMessage.includes('trong khoảng thời gian'),
        ),
      ).toBe(true);
    });
  });
});
