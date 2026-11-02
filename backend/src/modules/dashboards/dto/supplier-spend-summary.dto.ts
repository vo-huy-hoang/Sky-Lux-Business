export interface SupplierSpendItemDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  amount: number;
  grossAmount: number;
  dossierCount: number;
  sharePercentage?: number;
}

export interface SupplierSpendSummaryDto {
  items: SupplierSpendItemDto[];
  totalSpend: number;
  otherSuppliersSpend: number;
  otherSuppliersCount: number;
  totalSupplierCount: number;
}

