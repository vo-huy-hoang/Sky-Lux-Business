import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationSetting } from '../../modules/organizations/entities/organization-setting.entity';
import { Department } from '../../modules/departments/entities/department.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { RolePermission } from '../../modules/permissions/entities/role-permission.entity';
import { PERMISSION_CATALOG } from '../bootstrap/permissions.catalog';
import { User } from '../../modules/users/entities/user.entity';
import { BusinessLine } from '../../modules/master-data/entities/business-line.entity';
import { MarketType } from '../../modules/master-data/entities/market-type.entity';
import { ServiceCategory } from '../../modules/master-data/entities/service-category.entity';
import { PassengerType } from '../../modules/master-data/entities/passenger-type.entity';
import { Unit } from '../../modules/master-data/entities/unit.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { SupplierType } from '../../modules/suppliers/entities/supplier-type.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { Dossier } from '../../modules/dossiers/entities/dossier.entity';
import { Estimate } from '../../modules/estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../../modules/estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../../modules/estimates/entities/estimate-cost-line.entity';
import {
  UserStatus,
  RoleScope,
  CustomerType,
  DossierStatus,
  EstimateStatus,
  PriorityLevel,
} from '../../common/enums';

export async function runInitialSeed(dataSource: DataSource) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo initial seed is disabled in production.');
  }
  const seedDefaultPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedDefaultPassword) {
    throw new Error(
      'SEED_DEFAULT_PASSWORD must be set explicitly before creating demo users.',
    );
  }

  console.log('🌱 Starting Initial Database Seed...');

  const orgRepo = dataSource.getRepository(Organization);
  const settingRepo = dataSource.getRepository(OrganizationSetting);
  const deptRepo = dataSource.getRepository(Department);
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const rpRepo = dataSource.getRepository(RolePermission);
  const userRepo = dataSource.getRepository(User);
  const blRepo = dataSource.getRepository(BusinessLine);
  const mtRepo = dataSource.getRepository(MarketType);
  const scRepo = dataSource.getRepository(ServiceCategory);
  const ptRepo = dataSource.getRepository(PassengerType);
  const unitRepo = dataSource.getRepository(Unit);
  const stRepo = dataSource.getRepository(SupplierType);

  // 1. Organization
  let org = await orgRepo.findOne({ where: { code: 'SKYLUX' } });
  if (!org) {
    org = orgRepo.create({
      code: 'SKYLUX',
      name: 'Sky-Lux Travel Corporation',
      slug: 'sky-lux-travel',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND',
      status: 'ACTIVE',
    });
    org = await orgRepo.save(org);
    console.log('  ✅ Created Organization:', org.name);
  }

  // 2. Organization Settings
  const defaultSettings = [
    { key: 'default_currency', value: { currency: 'VND' } },
    { key: 'default_timezone', value: { timezone: 'Asia/Ho_Chi_Minh' } },
    { key: 'dossier_code_prefix', value: { prefix: 'DOS' } },
    { key: 'finance.default_vat_rate', value: { vat_rate: 8 } },
    { key: 'excel.max_file_size_mb', value: { size: 30 } },
  ];

  for (const s of defaultSettings) {
    const exists = await settingRepo.findOne({
      where: { organizationId: org.id, key: s.key },
    });
    if (!exists) {
      await settingRepo.save(
        settingRepo.create({
          organizationId: org.id,
          key: s.key,
          value: s.value,
        }),
      );
    }
  }

  // 3. Departments
  const departmentsData = [
    { code: 'BOD', name: 'Ban Giám Đốc', description: 'Board of Directors' },
    {
      code: 'SALES',
      name: 'Phòng Kinh Doanh',
      description: 'Sales & Marketing',
    },
    { code: 'OPS', name: 'Phòng Điều Hành', description: 'Tour Operations' },
    {
      code: 'ACC',
      name: 'Phòng Kế Toán - Tài Chính',
      description: 'Accounting & Finance',
    },
  ];

  const deptMap: Record<string, Department> = {};
  for (const d of departmentsData) {
    let dept = await deptRepo.findOne({
      where: { organizationId: org.id, code: d.code },
    });
    if (!dept) {
      dept = await deptRepo.save(
        deptRepo.create({
          organizationId: org.id,
          code: d.code,
          name: d.name,
          description: d.description,
        }),
      );
    }
    deptMap[d.code] = dept;
  }

  // 4. Permissions
  const permissionsList = PERMISSION_CATALOG;

  const permMap: Record<string, Permission> = {};
  for (const p of permissionsList) {
    let perm = await permRepo.findOne({ where: { code: p.code } });
    if (!perm) {
      perm = await permRepo.save(permRepo.create(p));
    }
    permMap[p.code] = perm;
  }

  // 5. Roles
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Quản Trị Viên Hệ Thống', isSystem: true },
    { code: 'CEO_ADMIN', name: 'Ban Giám Đốc (CEO)', isSystem: true },
    { code: 'SALES', name: 'Chuyên Viên Kinh Doanh', isSystem: false },
    { code: 'OPERATOR', name: 'Chuyên Viên Điều Hành', isSystem: false },
    { code: 'ACCOUNTANT', name: 'Kế Toán Doanh Nghiệp', isSystem: false },
  ];

  const roleMap: Record<string, Role> = {};
  for (const r of rolesData) {
    let role = await roleRepo.findOne({
      where: { organizationId: org.id, code: r.code },
    });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          organizationId: org.id,
          code: r.code,
          name: r.name,
          isSystem: r.isSystem,
        }),
      );
    }
    roleMap[r.code] = role;
  }

  // Assign All Permissions to SUPER_ADMIN & CEO_ADMIN
  for (const perm of Object.values(permMap)) {
    for (const rCode of ['SUPER_ADMIN', 'CEO_ADMIN']) {
      const targetRole = roleMap[rCode];
      const exists = await rpRepo.findOne({
        where: { roleId: targetRole.id, permissionId: perm.id },
      });
      if (!exists) {
        await rpRepo.save(
          rpRepo.create({
            roleId: targetRole.id,
            permissionId: perm.id,
            scope: RoleScope.ALL,
          }),
        );
      }
    }
  }

  // Assign specific permissions to SALES, OPERATOR, ACCOUNTANT
  const roleSpecificPerms: Record<
    string,
    { codes: string[]; scope: RoleScope }
  > = {
    SALES: {
      codes: [
        'dashboard.sales',
        'dossier.view.own',
        'dossier.view.team',
        'dossier.create',
        'dossier.update',
        'dossier.submit',
        'estimate.create',
        'estimate.update',
        'estimate.view',
        'import.manage',
        'customer.manage',
        'supplier.manage',
        'task.view',
        'task.manage',
        'user.view',
        'chat.access',
        'master_data.view',
        'kpi.manage',
        'kpi.view',
        'document.view',
        'approval.view',
        'department.view',
        'report.view',
      ],
      scope: RoleScope.ALL,
    },
    OPERATOR: {
      codes: [
        'dashboard.operator',
        'dossier.view.all',
        'dossier.view.team',
        'dossier.update',
        'dossier.approve',
        'customer.manage',
        'estimate.view',
        'estimate.update',
        'import.manage',
        'supplier.manage',
        'task.view',
        'task.manage',
        'user.view',
        'chat.access',
        'master_data.view',
        'kpi.view',
        'kpi.view.team',
        'document.view',
        'approval.view',
        'department.view',
        'department.manage',
        'report.view',
      ],
      scope: RoleScope.ALL,
    },
    ACCOUNTANT: {
      codes: [
        'dossier.view.all',
        'estimate.view',
        'finance.view',
        'finance.manage',
        'report.view',
        'report.manage',
        'report.export',
        'approval.view',
        'department.view',
        'task.view',
        'task.manage',
        'user.view',
        'chat.access',
        'master_data.view',
      ],
      scope: RoleScope.ALL,
    },
  };

  for (const [rCode, config] of Object.entries(roleSpecificPerms)) {
    const targetRole = roleMap[rCode];
    if (!targetRole) continue;
    for (const code of config.codes) {
      const perm = permMap[code];
      if (!perm) continue;
      const exists = await rpRepo.findOne({
        where: { roleId: targetRole.id, permissionId: perm.id },
      });
      if (!exists) {
        await rpRepo.save(
          rpRepo.create({
            roleId: targetRole.id,
            permissionId: perm.id,
            scope: config.scope,
          }),
        );
      }
    }
  }

  // 6. Default users for local development and initial access
  const defaultUsers = [
    {
      employeeCode: 'EMP001',
      fullName: 'Super Administrator',
      email: 'admin@skylux.vn',
      phone: '0901234567',
      password: seedDefaultPassword,
      departmentCode: 'BOD',
      roleCodes: ['SUPER_ADMIN', 'CEO_ADMIN'],
    },
    {
      employeeCode: 'EMP002',
      fullName: 'Nguyễn Thu Hà',
      email: 'sales@skylux.vn',
      phone: '0901234568',
      password: seedDefaultPassword,
      departmentCode: 'SALES',
      roleCodes: ['SALES'],
    },
    {
      employeeCode: 'EMP005',
      fullName: 'Nguyễn Văn Minh',
      email: 'ceo@skylux.vn',
      phone: '0901234571',
      password: seedDefaultPassword,
      departmentCode: 'BOD',
      roleCodes: ['CEO_ADMIN'],
    },
    {
      employeeCode: 'EMP003',
      fullName: 'Phạm Minh Quân',
      email: 'operator@skylux.vn',
      phone: '0901234569',
      password: seedDefaultPassword,
      departmentCode: 'OPS',
      roleCodes: ['OPERATOR'],
    },
    {
      employeeCode: 'EMP004',
      fullName: 'Trần Minh Ngọc',
      email: 'accountant@skylux.vn',
      phone: '0901234570',
      password: seedDefaultPassword,
      departmentCode: 'ACC',
      roleCodes: ['ACCOUNTANT'],
    },
    {
      employeeCode: 'EMP006',
      fullName: 'Lê Hoàng Nam',
      email: 'sales2@skylux.vn',
      phone: '0901234572',
      password: seedDefaultPassword,
      departmentCode: 'SALES',
      roleCodes: ['SALES'],
    },
    {
      employeeCode: 'EMP007',
      fullName: 'Trần Thùy Linh',
      email: 'sales3@skylux.vn',
      phone: '0901234573',
      password: seedDefaultPassword,
      departmentCode: 'SALES',
      roleCodes: ['SALES'],
    },
  ];

  for (const userData of defaultUsers) {
    let user = await userRepo.findOne({
      where: { email: userData.email },
      relations: { roles: true },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      user = await userRepo.save(
        userRepo.create({
          organizationId: org.id,
          departmentId: deptMap[userData.departmentCode].id,
          employeeCode: userData.employeeCode,
          fullName: userData.fullName,
          email: userData.email,
          phone: userData.phone,
          passwordHash,
          status: UserStatus.ACTIVE,
          roles: userData.roleCodes.map((roleCode) => roleMap[roleCode]),
        }),
      );

      console.log(
        `  ✅ Created ${userData.roleCodes.join('/')} user: ${userData.email}`,
      );
    }
  }

  // 7. Master Data Seed
  const businessLines = [
    {
      code: 'TOUR_INBOUND',
      name: 'Tour Inbound (Quốc tế vào VN)',
      sortOrder: 1,
    },
    {
      code: 'TOUR_OUTBOUND',
      name: 'Tour Outbound (VN ra nước ngoài)',
      sortOrder: 2,
    },
    { code: 'TOUR_DOMESTIC', name: 'Tour Nội Địa', sortOrder: 3 },
    { code: 'MICE', name: 'Du lịch Sự kiện MICE & Teambuilding', sortOrder: 4 },
    { code: 'TICKET_VISA', name: 'Vé máy bay & Dịch vụ Visa', sortOrder: 5 },
  ];
  for (const b of businessLines) {
    const exists = await blRepo.findOne({ where: { code: b.code } });
    if (!exists) await blRepo.save(blRepo.create(b));
  }

  const marketTypes = [
    { code: 'DOMESTIC', name: 'Nội địa', sortOrder: 1 },
    { code: 'INBOUND_EU', name: 'Châu Âu (EU)', sortOrder: 2 },
    { code: 'INBOUND_US', name: 'Bắc Mỹ (US/Canada)', sortOrder: 3 },
    { code: 'INBOUND_ASIA', name: 'Châu Á', sortOrder: 4 },
    { code: 'OUTBOUND', name: 'Thị trường Quốc Tế', sortOrder: 5 },
  ];
  for (const m of marketTypes) {
    const exists = await mtRepo.findOne({ where: { code: m.code } });
    if (!exists) await mtRepo.save(mtRepo.create(m));
  }

  const serviceCategories = [
    { code: 'HOTEL', name: 'Khách sạn / Lưu trú', sortOrder: 1 },
    { code: 'RESTAURANT', name: 'Nhà hàng / Ẩm thực', sortOrder: 2 },
    { code: 'TRANSPORT', name: 'Vận chuyển xe du lịch', sortOrder: 3 },
    { code: 'FLIGHT', name: 'Vé máy bay', sortOrder: 4 },
    { code: 'GUIDE', name: 'Hướng dẫn viên', sortOrder: 5 },
    { code: 'ENTRANCE_FEE', name: 'Vé tham quan', sortOrder: 6 },
    { code: 'VISA_INSURANCE', name: 'Visa & Bảo hiểm', sortOrder: 7 },
    { code: 'OTHER', name: 'Chi phí khác', sortOrder: 8 },
  ];
  for (const s of serviceCategories) {
    const exists = await scRepo.findOne({ where: { code: s.code } });
    if (!exists) await scRepo.save(scRepo.create(s));
  }

  const passengerTypes = [
    { code: 'ADULT', name: 'Người lớn (Adult)', sortOrder: 1 },
    { code: 'CHILD', name: 'Trẻ em (Child)', sortOrder: 2 },
    { code: 'INFANT', name: 'Em bé (Infant)', sortOrder: 3 },
    { code: 'SINGLE_SUPP', name: 'Phụ thu phòng đơn', sortOrder: 4 },
  ];
  for (const p of passengerTypes) {
    const exists = await ptRepo.findOne({ where: { code: p.code } });
    if (!exists) await ptRepo.save(ptRepo.create(p));
  }

  const units = [
    { code: 'PAX', name: 'Khách', symbol: 'Pax' },
    { code: 'ROOM_NIGHT', name: 'Phòng / Đêm', symbol: 'R/N' },
    { code: 'MEAL', name: 'Suất ăn', symbol: 'Suất' },
    { code: 'TICKET', name: 'Vé', symbol: 'Vé' },
    { code: 'BUS_DAY', name: 'Xe / Ngày', symbol: 'Ngày' },
    { code: 'PACKAGE', name: 'Gói trọn gói', symbol: 'Gói' },
  ];
  for (const u of units) {
    const exists = await unitRepo.findOne({ where: { code: u.code } });
    if (!exists) await unitRepo.save(unitRepo.create(u));
  }

  const supplierTypes = [
    { code: 'HOTEL', name: 'Khách sạn / Resort', sortOrder: 1 },
    { code: 'RESTAURANT', name: 'Nhà hàng', sortOrder: 2 },
    { code: 'TRANSPORT', name: 'Đơn vị xe du lịch', sortOrder: 3 },
    { code: 'AIRLINE', name: 'Hãng hàng không', sortOrder: 4 },
    { code: 'LAND_TOUR', name: 'Land Tour đối tác', sortOrder: 5 },
  ];
  for (const st of supplierTypes) {
    const exists = await stRepo.findOne({ where: { code: st.code } });
    if (!exists) await stRepo.save(stRepo.create({ ...st, isSystem: true }));
  }

  // 8. Sample Suppliers Seed
  const suppRepo = dataSource.getRepository(Supplier);
  const sampleSuppliers = [
    {
      code: 'NCC-KS-001',
      name: 'Khách sạn Mường Thanh Luxury Đà Nẵng',
      typeCode: 'HOTEL',
      contactName: 'Nguyễn Văn Quản Lý',
      phone: '0988776655',
      email: 'booking@muongthanhdanang.vn',
      address: '270 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng',
      taxCode: '0102030405',
    },
    {
      code: 'NCC-KS-002',
      name: 'Novotel Danang Premier Han River',
      typeCode: 'HOTEL',
      contactName: 'Trần Thị Thu Hà',
      phone: '0912345678',
      email: 'reservation@novoteldanang.com',
      address: '36 Bạch Đằng, Hải Châu, Đà Nẵng',
      taxCode: '0102030406',
    },
    {
      code: 'NCC-XE-001',
      name: 'Công ty TNHH Vận tải Du lịch Tuấn Cường',
      typeCode: 'TRANSPORT',
      contactName: 'Phạm Tuấn Cường',
      phone: '0905123456',
      email: 'vantai.tuancuong@gmail.com',
      address: '15 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng',
      taxCode: '0401234567',
    },
    {
      code: 'NCC-NH-001',
      name: 'Nhà hàng Cơm Niêu Nhà Đỏ Đà Nẵng',
      typeCode: 'RESTAURANT',
      contactName: 'Lê Văn Bếp',
      phone: '0935123456',
      email: 'comnieunhado@gmail.com',
      address: '176 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng',
      taxCode: '0409876543',
    },
    {
      code: 'NCC-HK-001',
      name: 'Tổng công ty Hàng không Việt Nam (Vietnam Airlines)',
      typeCode: 'AIRLINE',
      contactName: 'Phòng Vé Đại Lý',
      phone: '19001100',
      email: 'telesales@vietnamairlines.com',
      address: '200 Nguyễn Sơn, Long Biên, Hà Nội',
      taxCode: '0100107518',
    },
  ];

  for (const s of sampleSuppliers) {
    const exists = await suppRepo.findOne({
      where: { code: s.code, organizationId: org.id },
    });
    if (!exists) {
      const sType = await stRepo.findOne({ where: { code: s.typeCode } });
      await suppRepo.save(
        suppRepo.create({
          organizationId: org.id,
          supplierTypeId: sType?.id,
          code: s.code,
          name: s.name,
          contactName: s.contactName,
          phone: s.phone,
          email: s.email,
          address: s.address,
          taxCode: s.taxCode,
          status: 'ACTIVE',
        }),
      );
    }
  }

  // 9. Sample Customers
  const custRepo = dataSource.getRepository(Customer);
  const sampleCustomers = [
    {
      code: 'KH-DOANH-001',
      displayName: 'Công ty Cổ phần Công nghệ FPT',
      customerType: CustomerType.COMPANY,
      phone: '02473007300',
      email: 'contact@fpt.com.vn',
      taxCode: '0101248141',
      address: 'Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội',
    },
    {
      code: 'KH-DOANH-002',
      displayName: 'Tập đoàn Vingroup - CTCP',
      customerType: CustomerType.COMPANY,
      phone: '02439749999',
      email: 'info@vingroup.net',
      taxCode: '0101245486',
      address:
        'Số 7 Đường Bằng Lăng 1, KĐT Vinhomes Riverside, Long Biên, Hà Nội',
    },
    {
      code: 'KH-LE-001',
      displayName: 'Trương Gia Bình',
      customerType: CustomerType.INDIVIDUAL,
      phone: '0903456789',
      email: 'binhtg@fpt.com.vn',
      address: 'Ba Đình, Hà Nội',
    },
    {
      code: 'KH-LE-002',
      displayName: 'Nguyễn Thị Mai',
      customerType: CustomerType.INDIVIDUAL,
      phone: '0912345679',
      email: 'main@gmail.com',
      address: 'Hải Châu, Đà Nẵng',
    },
  ];

  const customerMap: Record<string, Customer> = {};
  for (const c of sampleCustomers) {
    let cust = await custRepo.findOne({
      where: { code: c.code, organizationId: org.id },
    });
    if (!cust) {
      cust = await custRepo.save(
        custRepo.create({
          organizationId: org.id,
          code: c.code,
          displayName: c.displayName,
          customerType: c.customerType,
          phone: c.phone,
          email: c.email,
          taxCode: c.taxCode,
          address: c.address,
        }),
      );
      console.log(`  ✅ Created Customer: ${c.displayName} (${c.code})`);
    }
    customerMap[c.code] = cust;
  }

  // 10. Sample Dossiers with Approved Estimates (For Sales & Operator Dashboards)
  const dossierRepo = dataSource.getRepository(Dossier);
  const estimateRepo = dataSource.getRepository(Estimate);
  const revLineRepo = dataSource.getRepository(EstimateRevenueLine);
  const costLineRepo = dataSource.getRepository(EstimateCostLine);

  const sales1 = await userRepo.findOne({
    where: { email: 'sales@skylux.vn' },
  });
  const sales2 = await userRepo.findOne({
    where: { email: 'sales2@skylux.vn' },
  });
  const sales3 = await userRepo.findOne({
    where: { email: 'sales3@skylux.vn' },
  });
  const operatorUser = await userRepo.findOne({
    where: { email: 'operator@skylux.vn' },
  });

  const inboundBL = await blRepo.findOne({ where: { code: 'TOUR_INBOUND' } });
  const domesticBL = await blRepo.findOne({ where: { code: 'TOUR_DOMESTIC' } });
  const domesticMT = await mtRepo.findOne({ where: { code: 'DOMESTIC' } });

  const sampleDossiers = [
    {
      code: 'DOS-2026-001',
      name: 'Tour Khám Phá Di Sản Miền Trung 4N3Đ (FPT)',
      customerCode: 'KH-DOANH-001',
      salesUser: sales1,
      operatorUser,
      businessLine: domesticBL,
      marketType: domesticMT,
      status: DossierStatus.APPROVED,
      priority: PriorityLevel.HIGH,
      route: 'Đà Nẵng - Hội An - Huế',
      startDate: '2026-04-10',
      endDate: '2026-04-14',
      revenue: 292500000,
      cost: 216000000,
      revDesc: 'Gói dịch vụ tour Di Sản Miền Trung trọn gói (45 khách)',
      costDesc: 'Lưu trú Khách sạn Mường Thanh + Xe du lịch + Vé tham quan',
      qty: 45,
    },
    {
      code: 'DOS-2026-002',
      name: 'Team Building & Gala Dinner Nha Trang 3N2Đ (Vingroup)',
      customerCode: 'KH-DOANH-002',
      salesUser: sales1,
      operatorUser,
      businessLine: domesticBL,
      marketType: domesticMT,
      status: DossierStatus.COMPLETED,
      priority: PriorityLevel.URGENT,
      route: 'TP.HCM - Cam Ranh - Nha Trang',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      revenue: 464000000,
      cost: 336000000,
      revDesc: 'Gói Team Building & Sự kiện Gala trọn gói (80 khách)',
      costDesc: 'Chi phí resort Vinpearl + Gala Dinner + Âm thanh ánh sáng',
      qty: 80,
    },
    {
      code: 'DOS-2026-003',
      name: 'Nghỉ Dưỡng Thượng Lưu Nam Đảo Phú Quốc 3N2Đ',
      customerCode: 'KH-LE-001',
      salesUser: sales1,
      operatorUser,
      businessLine: domesticBL,
      marketType: domesticMT,
      status: DossierStatus.SUBMITTED,
      priority: PriorityLevel.MEDIUM,
      route: 'Hà Nội - Phú Quốc',
      startDate: '2026-05-10',
      endDate: '2026-05-13',
      revenue: 65000000,
      cost: 48000000,
      revDesc: 'Gói Villa biển cao cấp cho gia đình (6 khách)',
      costDesc: 'Villa 3 phòng ngủ + Vé máy bay khứ hồi',
      qty: 6,
    },
    {
      code: 'DOS-2026-004',
      name: 'Tour Golf & Nghỉ Dưỡng Đà Lạt Mùa Hoa 4N3Đ',
      customerCode: 'KH-LE-002',
      salesUser: sales2,
      operatorUser,
      businessLine: domesticBL,
      marketType: domesticMT,
      status: DossierStatus.APPROVED,
      priority: PriorityLevel.HIGH,
      route: 'Hà Nội - Đà Lạt',
      startDate: '2026-05-02',
      endDate: '2026-05-05',
      revenue: 190000000,
      cost: 136000000,
      revDesc: 'Gói Tour Golf & Khách sạn DaLat Palace (20 golfer)',
      costDesc: 'Green fee 3 sân + Caddy + Khách sạn 5 sao',
      qty: 20,
    },
    {
      code: 'DOS-2026-005',
      name: 'Khám Phá Sông Nước Miền Tây & Chợ Nổi Cái Răng 2N1Đ',
      customerCode: 'KH-DOANH-001',
      salesUser: sales2,
      operatorUser,
      businessLine: domesticBL,
      marketType: domesticMT,
      status: DossierStatus.COMPLETED,
      priority: PriorityLevel.LOW,
      route: 'TP.HCM - Tiền Giang - Cần Thơ',
      startDate: '2026-02-15',
      endDate: '2026-02-17',
      revenue: 96000000,
      cost: 69000000,
      revDesc: 'Tour Trải nghiệm sông nước miền Tây (30 khách)',
      costDesc: 'Tàu du lịch + Khách sạn Cần Thơ + Ẩm thực Nam Bộ',
      qty: 30,
    },
    {
      code: 'DOS-2026-006',
      name: 'Hành Trình Chinh Phục Cực Bắc Hà Giang 4N3Đ',
      customerCode: 'KH-DOANH-002',
      salesUser: sales3,
      operatorUser,
      businessLine: inboundBL || domesticBL,
      marketType: domesticMT,
      status: DossierStatus.APPROVED,
      priority: PriorityLevel.HIGH,
      route: 'Hà Nội - Đồng Văn - Mã Pí Lèng - Mèo Vạc',
      startDate: '2026-04-20',
      endDate: '2026-04-24',
      revenue: 130000000,
      cost: 95000000,
      revDesc: 'Tour Chinh phục Hà Giang xe Limousine (25 khách)',
      costDesc: 'Xe Limousine + Homestay cao cấp + Ăn uống 4 ngày',
      qty: 25,
    },
  ];

  for (const d of sampleDossiers) {
    if (!d.salesUser) continue;
    const existingDossier = await dossierRepo.findOne({
      where: { code: d.code, organizationId: org.id },
    });

    if (!existingDossier) {
      const cust = customerMap[d.customerCode];
      if (!cust) continue;

      const newDossier = await dossierRepo.save(
        dossierRepo.create({
          organizationId: org.id,
          code: d.code,
          name: d.name,
          customerId: cust.id,
          salesUserId: d.salesUser.id,
          operatorUserId: d.operatorUser?.id,
          businessLineId: d.businessLine?.id,
          marketTypeId: d.marketType?.id,
          route: d.route,
          startDate: d.startDate,
          endDate: d.endDate,
          revenueRecognitionDate: d.endDate || d.startDate,
          status: d.status,
          priority: d.priority,
          createdBy: d.salesUser.id,
        }),
      );

      // Create an Approved/Submitted Estimate for this dossier
      const newEstimate = await estimateRepo.save(
        estimateRepo.create({
          organizationId: org.id,
          dossierId: newDossier.id,
          versionNo: 1,
          status:
            d.status === DossierStatus.SUBMITTED
              ? EstimateStatus.SUBMITTED
              : EstimateStatus.APPROVED,
          currency: 'VND',
          createdBy: d.salesUser.id,
          approvedAt:
            d.status !== DossierStatus.SUBMITTED ? new Date() : undefined,
        }),
      );

      // Create Revenue Line
      await revLineRepo.save(
        revLineRepo.create({
          organizationId: org.id,
          estimateId: newEstimate.id,
          description: d.revDesc,
          quantity: d.qty,
          multiplier: 1,
          unitPrice: Math.round(d.revenue / d.qty),
          grossAmount: d.revenue,
          netAmount: d.revenue,
          sortOrder: 1,
        }),
      );

      // Create Cost Line
      await costLineRepo.save(
        costLineRepo.create({
          organizationId: org.id,
          estimateId: newEstimate.id,
          description: d.costDesc,
          quantity: d.qty,
          multiplier: 1,
          unitPrice: Math.round(d.cost / d.qty),
          grossAmount: d.cost,
          netAmount: d.cost,
          sortOrder: 1,
        }),
      );

      console.log(
        `  ✅ Created Dossier & Estimate: ${d.code} - ${d.name} (${d.status})`,
      );
    }
  }

  console.log('🎉 Initial Seed Completed Successfully!');
}
