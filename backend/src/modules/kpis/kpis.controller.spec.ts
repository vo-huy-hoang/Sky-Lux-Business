import { Test, TestingModule } from '@nestjs/testing';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

describe('KpisController', () => {
  let controller: KpisController;

  beforeEach(async () => {
    const mockKpisService = {
      findMyKpi: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpisController],
      providers: [
        {
          provide: KpisService,
          useValue: mockKpisService,
        },
      ],
    }).compile();

    controller = module.get<KpisController>(KpisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
