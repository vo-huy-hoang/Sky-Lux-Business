import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationSetting } from '../../modules/organizations/entities/organization-setting.entity';
import { Department } from '../../modules/departments/entities/department.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { RolePermission } from '../../modules/permissions/entities/role-permission.entity';
import { User } from '../../modules/users/entities/user.entity';
import { BusinessLine } from '../../modules/master-data/entities/business-line.entity';
import { MarketType } from '../../modules/master-data/entities/market-type.entity';
import { ServiceCategory } from '../../modules/master-data/entities/service-category.entity';
import { PassengerType } from '../../modules/master-data/entities/passenger-type.entity';
import { Unit } from '../../modules/master-data/entities/unit.entity';
import { SupplierType } from '../../modules/suppliers/entities/supplier-type.entity';
import { UserStatus, RoleScope } from '../../common/enums';

export async function runInitialSeed(dataSource: DataSource) {
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
  const permissionsList = [
    // Users & Roles
    { code: 'user.view', name: 'Xem người dùng', module: 'USER' },
    { code: 'user.create', name: 'Tạo người dùng', module: 'USER' },
    { code: 'user.update', name: 'Sửa người dùng', module: 'USER' },
    { code: 'user.delete', name: 'Xóa người dùng', module: 'USER' },
    { code: 'role.manage', name: 'Quản lý vai trò & quyền', module: 'USER' },

    // Dossiers
    { code: 'dossier.view.own', name: 'Xem hồ sơ cá nhân', module: 'DOSSIER' },
    {
      code: 'dossier.view.team',
      name: 'Xem hồ sơ phòng ban',
      module: 'DOSSIER',
    },
    { code: 'dossier.view.all', name: 'Xem toàn bộ hồ sơ', module: 'DOSSIER' },
    { code: 'dossier.create', name: 'Tạo hồ sơ', module: 'DOSSIER' },
    { code: 'dossier.update', name: 'Cập nhật hồ sơ', module: 'DOSSIER' },
    { code: 'dossier.submit', name: 'Gửi duyệt hồ sơ', module: 'DOSSIER' },
    { code: 'dossier.approve', name: 'Phê duyệt hồ sơ', module: 'DOSSIER' },
    { code: 'dossier.lock', name: 'Khóa hồ sơ', module: 'DOSSIER' },

    // Estimates
    { code: 'estimate.create', name: 'Tạo dự toán', module: 'ESTIMATE' },
    { code: 'estimate.update', name: 'Sửa dự toán', module: 'ESTIMATE' },
    { code: 'estimate.view', name: 'Xem dự toán', module: 'ESTIMATE' },
    { code: 'import.manage', name: 'Quản lý import Excel', module: 'IMPORT' },

    // Customers & Suppliers
    { code: 'customer.manage', name: 'Quản lý khách hàng', module: 'CRM' },
    { code: 'supplier.manage', name: 'Quản lý nhà cung cấp', module: 'CRM' },

    // Finance & Reports
    {
      code: 'finance.view',
      name: 'Xem tài chính & công nợ',
      module: 'FINANCE',
    },
    { code: 'finance.manage', name: 'Quản lý thanh toán', module: 'FINANCE' },
    { code: 'report.view', name: 'Xem báo cáo', module: 'REPORT' },
    { code: 'report.export', name: 'Xuất file báo cáo', module: 'REPORT' },
    { code: 'audit.view', name: 'Xem nhật ký kiểm toán', module: 'AUDIT' },

    // Tasks & Chat
    { code: 'task.manage', name: 'Quản lý công việc', module: 'TASK' },
    { code: 'chat.access', name: 'Sử dụng hệ thống chat', module: 'CHAT' },
    { code: 'kpi.manage', name: 'Quản lý chỉ tiêu KPI', module: 'KPI' },

    // Dashboards
    {
      code: 'dashboard.sales',
      name: 'Xem Dashboard Sales',
      module: 'DASHBOARD',
    },
    {
      code: 'dashboard.operator',
      name: 'Xem Dashboard Operator',
      module: 'DASHBOARD',
    },
    {
      code: 'dashboard.ceo',
      name: 'Xem Dashboard CEO',
      module: 'DASHBOARD',
    },
    // Master Data
    {
      code: 'master_data.view',
      name: 'Xem danh mục hệ thống',
      module: 'MASTER',
    },
  ];

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
        'task.manage',
        'chat.access',
        'master_data.view',
        'kpi.manage',
      ],
      scope: RoleScope.ALL,
    },
    OPERATOR: {
      codes: [
        'dashboard.operator',
        'dossier.view.all',
        'dossier.view.team',
        'dossier.update',
        'estimate.view',
        'estimate.update',
        'import.manage',
        'supplier.manage',
        'task.manage',
        'chat.access',
        'master_data.view',
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
        'report.export',
        'task.manage',
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
      password: 'Admin@123456',
      departmentCode: 'BOD',
      roleCodes: ['SUPER_ADMIN', 'CEO_ADMIN'],
    },
    {
      employeeCode: 'EMP002',
      fullName: 'Nguyễn Thu Hà',
      email: 'sales@skylux.vn',
      phone: '0901234568',
      password: 'Sales@123456',
      departmentCode: 'SALES',
      roleCodes: ['SALES'],
    },
    {
      employeeCode: 'EMP005',
      fullName: 'Nguyễn Văn Minh',
      email: 'ceo@skylux.vn',
      phone: '0901234571',
      password: 'CeoAdmin@123456',
      departmentCode: 'BOD',
      roleCodes: ['CEO_ADMIN'],
    },
    {
      employeeCode: 'EMP003',
      fullName: 'Phạm Minh Quân',
      email: 'operator@skylux.vn',
      phone: '0901234569',
      password: 'Operator@123456',
      departmentCode: 'OPS',
      roleCodes: ['OPERATOR'],
    },
    {
      employeeCode: 'EMP004',
      fullName: 'Trần Minh Ngọc',
      email: 'accountant@skylux.vn',
      phone: '0901234570',
      password: 'Accountant@123456',
      departmentCode: 'ACC',
      roleCodes: ['ACCOUNTANT'],
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
        `  ✅ Created ${userData.roleCodes.join('/')} user: ${userData.email} (Password: ${userData.password})`,
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
    if (!exists) await stRepo.save(stRepo.create(st));
  }

  console.log('🎉 Initial Seed Completed Successfully!');
}
