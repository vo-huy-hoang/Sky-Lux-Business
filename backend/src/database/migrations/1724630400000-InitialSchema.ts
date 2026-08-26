import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1724630400000 implements MigrationInterface {
  name = 'InitialSchema1724630400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 1. ORGANIZATIONS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "logo_url" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_organizations_status" ON "organizations" ("status");
    `);

    // 2. ORGANIZATION SETTINGS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_settings" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "key" VARCHAR(150) NOT NULL,
        "value" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "uq_org_settings_key" UNIQUE ("organization_id", "key")
      );
      CREATE INDEX IF NOT EXISTS "idx_org_settings_key" ON "organization_settings" ("key");
    `);

    // 3. DEPARTMENTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_departments_org_code" ON "departments" ("organization_id", "code");
    `);

    // 4. USERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
        "employee_code" VARCHAR(50) NOT NULL UNIQUE,
        "full_name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "phone" VARCHAR(20),
        "password_hash" VARCHAR(255) NOT NULL,
        "avatar_url" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "last_login_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
      CREATE INDEX IF NOT EXISTS "idx_users_org_status" ON "users" ("organization_id", "status");
    `);

    // 5. ROLES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "is_system" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "uq_roles_org_code" UNIQUE ("organization_id", "code")
      );
    `);

    // 6. PERMISSIONS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "module" VARCHAR(100),
        "description" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 7. USER_ROLES (Join Table)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "role_id")
      );
    `);

    // 8. ROLE_PERMISSIONS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        "scope" VARCHAR(30) NOT NULL DEFAULT 'ALL',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "uq_role_permissions" UNIQUE ("role_id", "permission_id")
      );
    `);

    // 9. MASTER DATA TABLES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_lines" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "market_types" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "service_categories" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "passenger_types" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "units" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "symbol" VARCHAR(20),
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "supplier_types" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 10. SUPPLIERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "supplier_type_id" UUID REFERENCES "supplier_types"("id") ON DELETE SET NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "tax_code" VARCHAR(50),
        "contact_name" VARCHAR(255),
        "phone" VARCHAR(20),
        "email" VARCHAR(255),
        "address" TEXT,
        "payment_terms" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_suppliers_org_code" ON "suppliers" ("organization_id", "code");
    `);

    // 11. CUSTOMERS & CONTACTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "customer_type" VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL',
        "display_name" VARCHAR(255) NOT NULL,
        "tax_code" VARCHAR(50),
        "phone" VARCHAR(20),
        "email" VARCHAR(255),
        "address" TEXT,
        "assigned_sales_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_customers_org_code" ON "customers" ("organization_id", "code");

      CREATE TABLE IF NOT EXISTS "customer_contacts" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "position" VARCHAR(100),
        "phone" VARCHAR(20),
        "email" VARCHAR(255),
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 12. DOSSIERS & PASSENGERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dossiers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
        "business_line_id" UUID REFERENCES "business_lines"("id") ON DELETE SET NULL,
        "market_type_id" UUID REFERENCES "market_types"("id") ON DELETE SET NULL,
        "sales_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "operator_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "route" VARCHAR(255),
        "start_date" DATE,
        "end_date" DATE,
        "revenue_recognition_date" DATE,
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "priority" VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
        "version" INT NOT NULL DEFAULT 1,
        "locked_at" TIMESTAMPTZ,
        "locked_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_dossiers_org_status" ON "dossiers" ("organization_id", "status");
      CREATE INDEX IF NOT EXISTS "idx_dossiers_org_sales_period" ON "dossiers" ("organization_id", "sales_user_id", "revenue_recognition_date");

      CREATE TABLE IF NOT EXISTS "dossier_passengers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "passenger_type_id" UUID REFERENCES "passenger_types"("id") ON DELETE SET NULL,
        "full_name" VARCHAR(255) NOT NULL,
        "date_of_birth" DATE,
        "gender" VARCHAR(20),
        "passport_number" VARCHAR(50),
        "passport_expiry" DATE,
        "nationality" VARCHAR(50),
        "note" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 13. ESTIMATES, REVENUE LINES & COST LINES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "estimates" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "version_no" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "source_import_session_id" UUID,
        "parent_estimate_id" UUID,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
        "note" TEXT,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "submitted_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "submitted_at" TIMESTAMPTZ,
        "approved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "estimate_revenue_lines" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
        "passenger_type_id" UUID REFERENCES "passenger_types"("id") ON DELETE SET NULL,
        "description" VARCHAR(255) NOT NULL,
        "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
        "unit_id" UUID REFERENCES "units"("id") ON DELETE SET NULL,
        "multiplier" NUMERIC(12,3) NOT NULL DEFAULT 1,
        "unit_price" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "vat_rate" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "price_basis" VARCHAR(50),
        "gross_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "net_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "note" TEXT,
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "estimate_cost_lines" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
        "service_category_id" UUID REFERENCES "service_categories"("id") ON DELETE SET NULL,
        "supplier_id" UUID REFERENCES "suppliers"("id") ON DELETE SET NULL,
        "description" VARCHAR(255) NOT NULL,
        "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
        "unit_id" UUID REFERENCES "units"("id") ON DELETE SET NULL,
        "multiplier" NUMERIC(12,3) NOT NULL DEFAULT 1,
        "unit_price" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "vat_rate" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "price_basis" VARCHAR(50),
        "gross_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "net_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "validation_status" VARCHAR(30) NOT NULL DEFAULT 'VALID',
        "note" TEXT,
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_cost_lines_supplier" ON "estimate_cost_lines" ("organization_id", "supplier_id");
    `);

    // 14. APPROVALS & WORKFLOW HISTORY
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "approval_requests" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "estimate_id" UUID NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
        "step_no" INT NOT NULL DEFAULT 1,
        "step_code" VARCHAR(50) NOT NULL,
        "reviewer_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "decided_at" TIMESTAMPTZ,
        "comment" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_approvals_reviewer_status" ON "approval_requests" ("organization_id", "reviewer_user_id", "status");

      CREATE TABLE IF NOT EXISTS "workflow_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "estimate_id" UUID REFERENCES "estimates"("id") ON DELETE SET NULL,
        "from_status" VARCHAR(50),
        "to_status" VARCHAR(50) NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "comment" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 15. DOCUMENTS & VERSIONS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_types" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "documents" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID REFERENCES "dossiers"("id") ON DELETE SET NULL,
        "estimate_id" UUID REFERENCES "estimates"("id") ON DELETE SET NULL,
        "document_type_id" UUID REFERENCES "document_types"("id") ON DELETE SET NULL,
        "original_name" VARCHAR(255) NOT NULL,
        "object_key" TEXT NOT NULL,
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size" BIGINT NOT NULL,
        "checksum" VARCHAR(100),
        "version_no" INT NOT NULL DEFAULT 1,
        "uploaded_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "document_versions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "version_no" INT NOT NULL,
        "object_key" TEXT NOT NULL,
        "file_size" BIGINT NOT NULL,
        "checksum" VARCHAR(100),
        "change_note" TEXT,
        "uploaded_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 16. COMMENTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "content" TEXT NOT NULL,
        "parent_id" UUID REFERENCES "comments"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 17. TASKS & CHECKLIST
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID REFERENCES "dossiers"("id") ON DELETE SET NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "assigned_to" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "priority" VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
        "status" VARCHAR(30) NOT NULL DEFAULT 'TODO',
        "progress_percent" INT NOT NULL DEFAULT 0,
        "start_at" TIMESTAMPTZ,
        "due_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_tasks_assignee_status_due" ON "tasks" ("organization_id", "assigned_to", "status", "due_at");

      CREATE TABLE IF NOT EXISTS "task_checklist_items" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "title" VARCHAR(255) NOT NULL,
        "is_completed" BOOLEAN NOT NULL DEFAULT false,
        "completed_at" TIMESTAMPTZ,
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 18. PAYMENTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "dossier_id" UUID NOT NULL REFERENCES "dossiers"("id") ON DELETE CASCADE,
        "payment_direction" VARCHAR(30) NOT NULL,
        "amount" NUMERIC(18,2) NOT NULL,
        "due_date" DATE,
        "payment_date" DATE,
        "payment_method" VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
        "reference_code" VARCHAR(100),
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "document_id" UUID,
        "note" TEXT,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 19. KPIS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kpi_targets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "metric_code" VARCHAR(50) NOT NULL,
        "period_type" VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
        "period_start" DATE NOT NULL,
        "period_end" DATE NOT NULL,
        "target_value" NUMERIC(18,2) NOT NULL,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "kpi_results" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "metric_code" VARCHAR(50) NOT NULL,
        "period_type" VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
        "period_start" DATE NOT NULL,
        "period_end" DATE NOT NULL,
        "actual_value" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "achievement_rate" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "is_locked" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 20. NOTIFICATIONS, CHAT & ATTACHMENTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "type" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        "link_url" TEXT,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read");

      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "type" VARCHAR(30) NOT NULL DEFAULT 'DIRECT',
        "title" VARCHAR(255),
        "dossier_id" UUID REFERENCES "dossiers"("id") ON DELETE SET NULL,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "last_message_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_conversations_org_last_msg" ON "conversations" ("organization_id", "last_message_at" DESC);

      CREATE TABLE IF NOT EXISTS "conversation_participants" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
        "last_read_message_id" UUID,
        "last_read_at" TIMESTAMPTZ,
        "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "left_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "uq_conv_participants" UNIQUE ("conversation_id", "user_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_conv_participants_user" ON "conversation_participants" ("organization_id", "user_id", "conversation_id");

      CREATE TABLE IF NOT EXISTS "messages" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "sender_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message_type" VARCHAR(30) NOT NULL DEFAULT 'TEXT',
        "content" TEXT,
        "parent_id" UUID REFERENCES "messages"("id") ON DELETE CASCADE,
        "metadata" JSONB,
        "is_edited" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_messages_conv_created" ON "messages" ("conversation_id", "created_at" DESC);

      CREATE TABLE IF NOT EXISTS "message_attachments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "message_id" UUID NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
        "document_id" UUID REFERENCES "documents"("id") ON DELETE SET NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" TEXT NOT NULL,
        "file_type" VARCHAR(100) NOT NULL,
        "file_size" BIGINT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 21. EXCEL IMPORT STAGING
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "import_templates" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "template_type" VARCHAR(50) NOT NULL DEFAULT 'ESTIMATE',
        "mapping_config" JSONB NOT NULL DEFAULT '{}',
        "sample_file_url" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "import_sessions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "template_id" UUID REFERENCES "import_templates"("id") ON DELETE SET NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" TEXT NOT NULL,
        "file_size" BIGINT NOT NULL DEFAULT 0,
        "status" VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
        "total_rows" INT NOT NULL DEFAULT 0,
        "processed_rows" INT NOT NULL DEFAULT 0,
        "valid_rows" INT NOT NULL DEFAULT 0,
        "error_rows" INT NOT NULL DEFAULT 0,
        "uploaded_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "summary" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "import_rows" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "session_id" UUID NOT NULL REFERENCES "import_sessions"("id") ON DELETE CASCADE,
        "sheet_name" VARCHAR(100) NOT NULL DEFAULT 'Sheet1',
        "row_number" INT NOT NULL,
        "raw_data" JSONB NOT NULL DEFAULT '{}',
        "normalized_data" JSONB,
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "import_errors" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "session_id" UUID NOT NULL REFERENCES "import_sessions"("id") ON DELETE CASCADE,
        "row_number" INT NOT NULL,
        "column_name" VARCHAR(100),
        "error_code" VARCHAR(100) NOT NULL,
        "error_message" TEXT NOT NULL,
        "severity" VARCHAR(20) NOT NULL DEFAULT 'ERROR',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
    `);

    // 22. GOVERNANCE & AUDIT
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounting_periods" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "period_type" VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        "locked_at" TIMESTAMPTZ,
        "locked_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "unlock_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "saved_reports" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "report_type" VARCHAR(100) NOT NULL,
        "filters" JSONB NOT NULL DEFAULT '{}',
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(100) NOT NULL,
        "before_data" JSONB,
        "after_data" JSONB,
        "ip_address" VARCHAR(50),
        "user_agent" TEXT,
        "request_id" VARCHAR(100),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "idx_audit_entity_time" ON "audit_logs" ("organization_id", "entity_type", "entity_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_reports" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "accounting_periods" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "import_errors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_rows" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_templates" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "message_attachments" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "conversation_participants" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpi_results" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpi_targets" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "task_checklist_items" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "document_versions" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "documents" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_types" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_history" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "approval_requests" CASCADE;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "estimate_cost_lines" CASCADE;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "estimate_revenue_lines" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "estimates" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "dossier_passengers" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dossiers" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "customer_contacts" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_types" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "units" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "passenger_types" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "service_categories" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "market_types" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_lines" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_settings" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE;`);
  }
}
