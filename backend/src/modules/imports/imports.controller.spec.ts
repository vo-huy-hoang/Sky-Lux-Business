import { Test, TestingModule } from '@nestjs/testing';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

describe('ImportsController', () => {
  let controller: ImportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        {
          provide: ImportsService,
          useValue: {
            upload: jest.fn(),
            findOne: jest.fn(),
            preview: jest.fn(),
            errors: jest.fn(),
            updateRowStaging: jest.fn(),
            validateSession: jest.fn(),
            confirm: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ImportsController>(ImportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
