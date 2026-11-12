import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dossier } from './entities/dossier.entity';
import { DossierAccessPolicyService } from './dossier-access-policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dossier])],
  providers: [DossierAccessPolicyService],
  exports: [DossierAccessPolicyService],
})
export class DossierAccessModule {}

