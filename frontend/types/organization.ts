export interface OrganizationItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettingItem {
  id: string;
  organizationId: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationSettings = Record<string, any>;
