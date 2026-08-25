import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';
import { BusinessLine } from './entities/business-line.entity';
import { MarketType } from './entities/market-type.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { PassengerType } from './entities/passenger-type.entity';
import { Unit } from './entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessLine,
      MarketType,
      ServiceCategory,
      PassengerType,
      Unit,
    ]),
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService, TypeOrmModule],
})
export class MasterDataModule {}
