import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncChatEntities1787938289103 implements MigrationInterface {
  name = 'SyncChatEntities1787938289103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_settings" DROP CONSTRAINT "organization_settings_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "roles_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "users_department_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" DROP CONSTRAINT "departments_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" DROP CONSTRAINT "customer_contacts_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" DROP CONSTRAINT "customer_contacts_customer_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP CONSTRAINT "customers_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP CONSTRAINT "customers_assigned_sales_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "dossier_passengers_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "dossier_passengers_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "dossier_passengers_passenger_type_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "estimate_revenue_lines_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "estimate_revenue_lines_estimate_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "estimate_revenue_lines_passenger_type_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "estimate_revenue_lines_unit_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_supplier_type_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "estimate_cost_lines_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "estimate_cost_lines_estimate_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "estimate_cost_lines_service_category_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "estimate_cost_lines_supplier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "estimate_cost_lines_unit_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "estimates_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "estimates_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "estimates_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "estimates_submitted_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "estimates_approved_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "conversations_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "conversations_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "conversations_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_customer_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_business_line_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_market_type_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_sales_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_operator_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_locked_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "dossiers_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_requests_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_requests_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_requests_estimate_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_requests_reviewer_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_estimate_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_actor_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "documents_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "documents_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "documents_estimate_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "documents_document_type_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "documents_uploaded_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "document_versions_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "document_versions_document_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "document_versions_uploaded_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "comments_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "comments_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "comments_parent_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "payments_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "payments_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "payments_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" DROP CONSTRAINT "import_templates_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" DROP CONSTRAINT "import_rows_session_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "import_sessions_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "import_sessions_template_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "import_sessions_uploaded_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" DROP CONSTRAINT "import_errors_session_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP CONSTRAINT "kpi_results_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP CONSTRAINT "kpi_results_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "kpi_targets_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "kpi_targets_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "kpi_targets_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "message_attachments_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "message_attachments_message_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "message_attachments_document_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "messages_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "messages_parent_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_conversation_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" DROP CONSTRAINT "saved_reports_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" DROP CONSTRAINT "saved_reports_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_locked_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_organization_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_dossier_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigned_to_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" DROP CONSTRAINT "task_checklist_items_task_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_org_settings_key"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_org_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_departments_org_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_organizations_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_customers_org_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_suppliers_org_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_conversations_org_last_msg"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_refresh_tokens_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_unread"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" DROP CONSTRAINT "uq_org_settings_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "uq_role_permissions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "uq_roles_org_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "uq_conv_participants"`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_33146a476696a973a14d931e675" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "last_message_at"`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "is_group" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_type_enum" AS ENUM('DIRECT', 'GROUP', 'DOSSIER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "type" "public"."conversations_type_enum" NOT NULL DEFAULT 'DIRECT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "title" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "created_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "last_message_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP COLUMN "scope"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_scope_enum" AS ENUM('OWN', 'TEAM', 'ALL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD "scope" "public"."role_permissions_scope_enum" NOT NULL DEFAULT 'ALL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'LOCKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN "customer_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customers_customer_type_enum" AS ENUM('INDIVIDUAL', 'COMPANY', 'ORGANIZATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "customer_type" "public"."customers_customer_type_enum" NOT NULL DEFAULT 'INDIVIDUAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_lines" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_lines" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_types" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_types" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "passenger_types" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "passenger_types" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "estimates" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."estimates_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEED_CHANGES', 'APPROVED', 'SUPERSEDED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD "status" "public"."estimates_status_enum" NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_dossiers_org_status"`);
    await queryRunner.query(
      `ALTER TABLE "dossiers" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "dossiers" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."dossiers_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEED_CHANGES', 'RESUBMITTED', 'APPROVED', 'COMPLETED', 'LOCKED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD "status" "public"."dossiers_status_enum" NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(`ALTER TABLE "dossiers" DROP COLUMN "priority"`);
    await queryRunner.query(
      `CREATE TYPE "public"."dossiers_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD "priority" "public"."dossiers_priority_enum" NOT NULL DEFAULT 'MEDIUM'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_approvals_reviewer_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."approval_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD "status" "public"."approval_requests_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "requested_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_audit_entity_time"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_types" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_types" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_direction"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_direction_enum" AS ENUM('CUSTOMER_RECEIPT', 'SUPPLIER_PAYMENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_direction" "public"."payments_payment_direction_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('BANK_TRANSFER', 'CASH', 'CREDIT_CARD', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_method" "public"."payments_payment_method_enum" NOT NULL DEFAULT 'BANK_TRANSFER'`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."import_sessions_status_enum" AS ENUM('UPLOADED', 'PROCESSING', 'READY_FOR_REVIEW', 'CONFIRMED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD "status" "public"."import_sessions_status_enum" NOT NULL DEFAULT 'UPLOADED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" DROP COLUMN "severity"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."import_errors_severity_enum" AS ENUM('WARNING', 'ERROR')`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ADD "severity" "public"."import_errors_severity_enum" NOT NULL DEFAULT 'ERROR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP COLUMN "metric_code"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kpi_results_metric_code_enum" AS ENUM('REVENUE', 'PROFIT', 'DOSSIER_COUNT', 'CLOSE_RATE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD "metric_code" "public"."kpi_results_metric_code_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kpi_results_period_type_enum" AS ENUM('MONTHLY', 'QUARTERLY', 'YEARLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD "period_type" "public"."kpi_results_period_type_enum" NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP COLUMN "metric_code"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kpi_targets_metric_code_enum" AS ENUM('REVENUE', 'PROFIT', 'DOSSIER_COUNT', 'CLOSE_RATE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD "metric_code" "public"."kpi_targets_metric_code_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kpi_targets_period_type_enum" AS ENUM('MONTHLY', 'QUARTERLY', 'YEARLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD "period_type" "public"."kpi_targets_period_type_enum" NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_messages_conv_created"`);
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "message_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('TEXT', 'FILE', 'IMAGE', 'SYSTEM')`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "message_type" "public"."messages_message_type_enum" NOT NULL DEFAULT 'TEXT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP COLUMN "role"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversation_participants_role_enum" AS ENUM('ADMIN', 'MEMBER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD "role" "public"."conversation_participants_role_enum" NOT NULL DEFAULT 'MEMBER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "joined_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."accounting_periods_period_type_enum" AS ENUM('MONTHLY', 'QUARTERLY', 'YEARLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD "period_type" "public"."accounting_periods_period_type_enum" NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."accounting_periods_status_enum" AS ENUM('OPEN', 'LOCKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD "status" "public"."accounting_periods_status_enum" NOT NULL DEFAULT 'OPEN'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_tasks_assignee_status_due"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM'`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'TODO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da4eb8a978236948c9e0a551bb" ON "organization_settings"  ("key") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8dad765629e83229da6feda1c1" ON "permissions"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6d54f95c31b73fb1bdd8e91d0" ON "roles"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ae048b57cb451eb306035b1e6" ON "users"  ("employee_code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_38f94d07e939713133cb6458e2" ON "departments"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7e27c3b62c681fbe3e2322535f" ON "organizations"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_963693341bd612aa01ddf3a4b6" ON "organizations"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3770f157bd77d83ab022e92fc" ON "organizations"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2eee14aa1fe3e956fe193c142" ON "customers"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_589e5e6434f0e8628aa2ad33e1" ON "customers"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fefe0887b875ab0fd46e0d2e74" ON "business_lines"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_eb66afabdb17a8fd825f7decc7" ON "market_types"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ba8d0979d515f3d880fce362a1" ON "passenger_types"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_47635c1ab22d02fc3ebae3608b" ON "units"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fa8e5034d4e454f1564fa6042c" ON "service_categories"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68e9d3e31ea445ac25e071ac25" ON "supplier_types"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f01a03dcb1aa33822e19534cd" ON "suppliers"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_00d459497429b7681a09308029" ON "suppliers"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63b625e34d9378444906300890" ON "estimates"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2f408e41e65ebf503dad3ec713" ON "dossiers"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dossiers_org_status" ON "dossiers"  ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_approvals_reviewer_status" ON "approval_requests"  ("organization_id", "reviewer_user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_entity_time" ON "audit_logs"  ("organization_id", "entity_type", "entity_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5c46cecbae576329e689110cbb" ON "document_types"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5bf5e7d68bbab21abf72cb296" ON "payments"  ("payment_direction") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2544ede81b9f9221cb1a4aa8b7" ON "import_templates"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18583ed7dd7f5736bf608d8bf9" ON "import_rows"  ("row_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bdaef2df263ed0d5925c1684b5" ON "import_sessions"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_conv_created" ON "messages"  ("conversation_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_org_last_msg" ON "conversations"  ("organization_id", "last_message_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f12148ce379462ebbb4d06cc13" ON "notifications"  ("is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee_status_due" ON "tasks"  ("organization_id", "assigned_to", "status", "due_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles"  ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_25d24010f53bb80b78e412c9656" UNIQUE ("role_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "UQ_fdcd6405d74e797f10fa8360338" UNIQUE ("conversation_id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ADD CONSTRAINT "FK_5fbdacce9bdcb454877d068e355" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_0921d1972cf861d568f5271cd85" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "FK_71070628c130f2c9cd3cd5f082f" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ADD CONSTRAINT "FK_1d988c6e872af420e313f30add4" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ADD CONSTRAINT "FK_76ca61fed7339b9f358599f9fda" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "FK_16e5b89bc7205d8619dbd9d7757" FOREIGN KEY ("assigned_sales_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "FK_3c8370cdf846e5f9c8359bebd47" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "FK_d09d2309c81ac70210a35c35f0e" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "FK_c8440d450770c45a9af9caaab95" FOREIGN KEY ("passenger_type_id") REFERENCES "passenger_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "FK_8d807b26167a728c29c2c98c829" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "FK_e53efc94c39ed20fd474caa9967" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "FK_6406f30f4ff4403e250f4be3f07" FOREIGN KEY ("passenger_type_id") REFERENCES "passenger_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "FK_f64eac6ac7e6d617855403d4c94" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_3e9f69576d3622550efafbd6e4b" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_2b1258636d8891f1cd36a63ba03" FOREIGN KEY ("supplier_type_id") REFERENCES "supplier_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "FK_454bed0f2e7ed19ec230869ca7b" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "FK_ddd8387bf33e5e56c96b6762104" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "FK_a4806227ad110aa5e0f0bcd3529" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "FK_bc84966d3336922f96b2c2c53e3" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "FK_f70a6f48e87244054578ea1264e" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "FK_317ac0d0a5e6c9b9bf13c7c5a73" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "FK_d46a261e151826a2041706bad20" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "FK_81482ffdb30c288b70403445af9" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "FK_28b7fed168ee737417a3b702740" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "FK_3dd5f258d96698ff94e04bb4c47" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_27ed737d4398ac16da23bdc2881" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_36340a1704b039608e34244511f" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_c223dac1c7d1c04c8954ce669dc" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_3d623662d4ee1219b23cf61e649" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_9e5fc47ecb06d4d7b84633b1718" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_87d9df8c99fb824a39c681ec332" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_1a5a6d9bebcceb7e5e1e7c2387a" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_11e38ccc8675b71371f4cdc6cdb" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_30db80d33a5d40f899a328ffe42" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_d6307deb44c7d42934627fb467b" FOREIGN KEY ("business_line_id") REFERENCES "business_lines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_2e4f62a6948604c0a26c1a75c46" FOREIGN KEY ("market_type_id") REFERENCES "market_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_23326a2b2e7c2d153cd4de4f026" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "FK_58b3b380273d68899bf9e87c5d5" FOREIGN KEY ("operator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_48206c45316b368509fa89b7bac" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_9cb52cd455616b9c1a7fc8a8e82" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_d7a50837b78304f22ffa576fd50" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_7f79970e1a89b388dc5ec13e408" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "FK_48f5cf3b49ba9778ee284d127fd" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "FK_8c3db4b4a3e06bcb7e7563e4381" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "FK_2f60b54a5a5643c1ed25b86dfe4" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "FK_10cfbcd29844d3bab2eac14a145" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_f160d97a931844109de9d04228f" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_69427761f37533ae7767601a64b" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_611c89ba30bacdb8b7d3b21da9b" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_01945715bb5fca346fb0ee459b8" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_5e174bbf5fb523874f836c425e9" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_b9e28779ec77ff2223e2da41f6d" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "FK_27e63d2c35e953e8a5b4fabbac6" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "FK_ac75577bca976d6d581b0f459b6" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "FK_3d213e52561610b751922e36e8a" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_a73bdb55794ec2e4c63cff1d631" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_d45d7b2030d73ad91c1dca14dec" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_fc07ace491143726974991711f2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_95d4298e055c2069a1921c366ba" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_2b505576ec68c4d47782a51a832" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ADD CONSTRAINT "FK_a068998abf46c78f14b71d3ef59" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ADD CONSTRAINT "FK_e59c2d8116a78362eb73b53bd2a" FOREIGN KEY ("session_id") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "FK_3d34f0989a05cc9c18c826b0bc7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "FK_ace46e3352db009b7ea9e2eb643" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "FK_aedfc2284f10d0d5c4a02de1944" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ADD CONSTRAINT "FK_4c9881d3ab76ce4d949f486d279" FOREIGN KEY ("session_id") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD CONSTRAINT "FK_387031ed0ffda924e695c70e4bd" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD CONSTRAINT "FK_66acd77a5893521e672820933a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "FK_312226111010d7ce7f8b68c5a75" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "FK_aea61871a3020c0f047245209a4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "FK_c392045dc316ba9b4f6c90d92cb" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_ee850491a13a19e5d94150a1069" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_bf65c3db8657cef6197b68b8c88" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_a72180202851cd4be549f078e04" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_f1c6874ea159caa5b964731e216" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_81d92d15c62b3fff79c617c9043" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_77b953e6f39f9ea166801fb814d" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_1559e8a16b828f2e836a2312800" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_377d4041a495b81ee1a85ae026f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ADD CONSTRAINT "FK_c3a6767c379cb9f838a3ecc5c41" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ADD CONSTRAINT "FK_2946d269ccb3ed73903b2b3c781" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD CONSTRAINT "FK_09345bf541c4739d3cb1f8031e4" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD CONSTRAINT "FK_ac0046f9a2dfacf66ddd7a11373" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_44a9b5209cdfd6f72fb09a7c994" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_6c260461a2f05c4ed29bb05aa0b" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9fc727aef9e222ebd09dc8dac08" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_5770b28d72ca90c43b1381bf787" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ADD CONSTRAINT "FK_16eac8446e23230a0e7f3586bcb" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" DROP CONSTRAINT "FK_16eac8446e23230a0e7f3586bcb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_5770b28d72ca90c43b1381bf787"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_9fc727aef9e222ebd09dc8dac08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_6c260461a2f05c4ed29bb05aa0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_44a9b5209cdfd6f72fb09a7c994"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP CONSTRAINT "FK_ac0046f9a2dfacf66ddd7a11373"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP CONSTRAINT "FK_09345bf541c4739d3cb1f8031e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" DROP CONSTRAINT "FK_2946d269ccb3ed73903b2b3c781"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" DROP CONSTRAINT "FK_c3a6767c379cb9f838a3ecc5c41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_377d4041a495b81ee1a85ae026f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_1559e8a16b828f2e836a2312800"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_77b953e6f39f9ea166801fb814d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_81d92d15c62b3fff79c617c9043"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_f1c6874ea159caa5b964731e216"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_a72180202851cd4be549f078e04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_bf65c3db8657cef6197b68b8c88"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_ee850491a13a19e5d94150a1069"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "FK_c392045dc316ba9b4f6c90d92cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "FK_aea61871a3020c0f047245209a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP CONSTRAINT "FK_312226111010d7ce7f8b68c5a75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP CONSTRAINT "FK_66acd77a5893521e672820933a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP CONSTRAINT "FK_387031ed0ffda924e695c70e4bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" DROP CONSTRAINT "FK_4c9881d3ab76ce4d949f486d279"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_aedfc2284f10d0d5c4a02de1944"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_ace46e3352db009b7ea9e2eb643"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_3d34f0989a05cc9c18c826b0bc7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" DROP CONSTRAINT "FK_e59c2d8116a78362eb73b53bd2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" DROP CONSTRAINT "FK_a068998abf46c78f14b71d3ef59"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_2b505576ec68c4d47782a51a832"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_95d4298e055c2069a1921c366ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_fc07ace491143726974991711f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_d45d7b2030d73ad91c1dca14dec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_a73bdb55794ec2e4c63cff1d631"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "FK_3d213e52561610b751922e36e8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "FK_ac75577bca976d6d581b0f459b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT "FK_27e63d2c35e953e8a5b4fabbac6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_b9e28779ec77ff2223e2da41f6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_5e174bbf5fb523874f836c425e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_01945715bb5fca346fb0ee459b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_611c89ba30bacdb8b7d3b21da9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_69427761f37533ae7767601a64b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_f160d97a931844109de9d04228f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "FK_10cfbcd29844d3bab2eac14a145"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "FK_2f60b54a5a5643c1ed25b86dfe4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "FK_8c3db4b4a3e06bcb7e7563e4381"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" DROP CONSTRAINT "FK_48f5cf3b49ba9778ee284d127fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_7f79970e1a89b388dc5ec13e408"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_d7a50837b78304f22ffa576fd50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_9cb52cd455616b9c1a7fc8a8e82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_48206c45316b368509fa89b7bac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_58b3b380273d68899bf9e87c5d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_23326a2b2e7c2d153cd4de4f026"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_2e4f62a6948604c0a26c1a75c46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_d6307deb44c7d42934627fb467b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_30db80d33a5d40f899a328ffe42"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" DROP CONSTRAINT "FK_11e38ccc8675b71371f4cdc6cdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_1a5a6d9bebcceb7e5e1e7c2387a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_87d9df8c99fb824a39c681ec332"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_9e5fc47ecb06d4d7b84633b1718"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_3d623662d4ee1219b23cf61e649"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_c223dac1c7d1c04c8954ce669dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_36340a1704b039608e34244511f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_27ed737d4398ac16da23bdc2881"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "FK_3dd5f258d96698ff94e04bb4c47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "FK_28b7fed168ee737417a3b702740"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "FK_81482ffdb30c288b70403445af9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "FK_d46a261e151826a2041706bad20"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" DROP CONSTRAINT "FK_317ac0d0a5e6c9b9bf13c7c5a73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "FK_f70a6f48e87244054578ea1264e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "FK_bc84966d3336922f96b2c2c53e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "FK_a4806227ad110aa5e0f0bcd3529"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "FK_ddd8387bf33e5e56c96b6762104"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" DROP CONSTRAINT "FK_454bed0f2e7ed19ec230869ca7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_2b1258636d8891f1cd36a63ba03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_3e9f69576d3622550efafbd6e4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "FK_f64eac6ac7e6d617855403d4c94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "FK_6406f30f4ff4403e250f4be3f07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "FK_e53efc94c39ed20fd474caa9967"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" DROP CONSTRAINT "FK_8d807b26167a728c29c2c98c829"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "FK_c8440d450770c45a9af9caaab95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "FK_d09d2309c81ac70210a35c35f0e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" DROP CONSTRAINT "FK_3c8370cdf846e5f9c8359bebd47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP CONSTRAINT "FK_16e5b89bc7205d8619dbd9d7757"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" DROP CONSTRAINT "FK_76ca61fed7339b9f358599f9fda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" DROP CONSTRAINT "FK_1d988c6e872af420e313f30add4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" DROP CONSTRAINT "FK_71070628c130f2c9cd3cd5f082f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_0921d1972cf861d568f5271cd85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_21a659804ed7bf61eb91688dea7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" DROP CONSTRAINT "FK_5fbdacce9bdcb454877d068e355"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "UQ_fdcd6405d74e797f10fa8360338"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_25d24010f53bb80b78e412c9656"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_tasks_assignee_status_due"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f12148ce379462ebbb4d06cc13"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_conversations_org_last_msg"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_messages_conv_created"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bdaef2df263ed0d5925c1684b5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18583ed7dd7f5736bf608d8bf9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2544ede81b9f9221cb1a4aa8b7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5bf5e7d68bbab21abf72cb296"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5c46cecbae576329e689110cbb"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_audit_entity_time"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_approvals_reviewer_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_dossiers_org_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f408e41e65ebf503dad3ec713"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_63b625e34d9378444906300890"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_00d459497429b7681a09308029"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f01a03dcb1aa33822e19534cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68e9d3e31ea445ac25e071ac25"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa8e5034d4e454f1564fa6042c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_47635c1ab22d02fc3ebae3608b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba8d0979d515f3d880fce362a1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb66afabdb17a8fd825f7decc7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fefe0887b875ab0fd46e0d2e74"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_589e5e6434f0e8628aa2ad33e1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f2eee14aa1fe3e956fe193c142"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3770f157bd77d83ab022e92fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_963693341bd612aa01ddf3a4b6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e27c3b62c681fbe3e2322535f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_38f94d07e939713133cb6458e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ae048b57cb451eb306035b1e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f6d54f95c31b73fb1bdd8e91d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8dad765629e83229da6feda1c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da4eb8a978236948c9e0a551bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "status" character varying(30) NOT NULL DEFAULT 'TODO'`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "priority" character varying(30) NOT NULL DEFAULT 'MEDIUM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee_status_due" ON "tasks" USING btree ("organization_id", "assigned_to", "status", "due_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."accounting_periods_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD "status" character varying(30) NOT NULL DEFAULT 'OPEN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."accounting_periods_period_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD "period_type" character varying(30) NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "joined_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP COLUMN "role"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."conversation_participants_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD "role" character varying(30) NOT NULL DEFAULT 'MEMBER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "message_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."messages_message_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "message_type" character varying(30) NOT NULL DEFAULT 'TEXT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_conv_created" ON "messages" USING btree ("conversation_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."kpi_targets_period_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD "period_type" character varying(30) NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" DROP COLUMN "metric_code"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."kpi_targets_metric_code_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD "metric_code" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."kpi_results_period_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD "period_type" character varying(30) NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" DROP COLUMN "metric_code"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."kpi_results_metric_code_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD "metric_code" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" DROP COLUMN "severity"`,
    );
    await queryRunner.query(`DROP TYPE "public"."import_errors_severity_enum"`);
    await queryRunner.query(
      `ALTER TABLE "import_errors" ADD "severity" character varying(20) NOT NULL DEFAULT 'ERROR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."import_sessions_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD "status" character varying(30) NOT NULL DEFAULT 'UPLOADED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "status" character varying(30) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payments_payment_method_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_method" character varying(30) NOT NULL DEFAULT 'BANK_TRANSFER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_direction"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payments_payment_direction_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_direction" character varying(30) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_types" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_entity_time" ON "audit_logs" USING btree ("organization_id", "entity_type", "entity_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "requested_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."approval_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD "status" character varying(30) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_approvals_reviewer_status" ON "approval_requests" USING btree ("organization_id", "reviewer_user_id", "status") `,
    );
    await queryRunner.query(`ALTER TABLE "dossiers" DROP COLUMN "priority"`);
    await queryRunner.query(`DROP TYPE "public"."dossiers_priority_enum"`);
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD "priority" character varying(30) NOT NULL DEFAULT 'MEDIUM'`,
    );
    await queryRunner.query(`ALTER TABLE "dossiers" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."dossiers_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD "status" character varying(30) NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dossiers_org_status" ON "dossiers" USING btree ("organization_id", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "estimates" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."estimates_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD "status" character varying(30) NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_types" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "passenger_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "passenger_types" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_types" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_lines" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_lines" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN "customer_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."customers_customer_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "customer_type" character varying(30) NOT NULL DEFAULT 'INDIVIDUAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" character varying(30) NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP COLUMN "scope"`,
    );
    await queryRunner.query(`DROP TYPE "public"."role_permissions_scope_enum"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD "scope" character varying(30) NOT NULL DEFAULT 'ALL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "last_message_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "created_by"`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."conversations_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "is_group"`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "title" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "type" character varying(30) NOT NULL DEFAULT 'DIRECT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "last_message_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "created_by" uuid`,
    );
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TABLE "conversation_members"`);
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "uq_conv_participants" UNIQUE ("conversation_id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "uq_roles_org_code" UNIQUE ("organization_id", "code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "uq_role_permissions" UNIQUE ("role_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ADD CONSTRAINT "uq_org_settings_key" UNIQUE ("organization_id", "key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id", "is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_org_last_msg" ON "conversations" USING btree ("organization_id", "last_message_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_suppliers_org_code" ON "suppliers" USING btree ("organization_id", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customers_org_code" ON "customers" USING btree ("organization_id", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_status" ON "organizations" USING btree ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_departments_org_code" ON "departments" USING btree ("organization_id", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_org_status" ON "users" USING btree ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" USING btree ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_org_settings_key" ON "organization_settings" USING btree ("key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD CONSTRAINT "kpi_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kpi_results" ADD CONSTRAINT "kpi_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "comments_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "documents_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "documents_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_market_type_id_fkey" FOREIGN KEY ("market_type_id") REFERENCES "market_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_business_line_id_fkey" FOREIGN KEY ("business_line_id") REFERENCES "business_lines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "conversations_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "estimates_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "estimates_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "estimates_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimates" ADD CONSTRAINT "estimates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "estimate_cost_lines_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "estimate_cost_lines_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "estimate_cost_lines_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "estimate_cost_lines_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_cost_lines" ADD CONSTRAINT "estimate_cost_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_supplier_type_id_fkey" FOREIGN KEY ("supplier_type_id") REFERENCES "supplier_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "estimate_revenue_lines_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "estimate_revenue_lines_passenger_type_id_fkey" FOREIGN KEY ("passenger_type_id") REFERENCES "passenger_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "estimate_revenue_lines_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estimate_revenue_lines" ADD CONSTRAINT "estimate_revenue_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "dossier_passengers_passenger_type_id_fkey" FOREIGN KEY ("passenger_type_id") REFERENCES "passenger_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "dossier_passengers_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dossier_passengers" ADD CONSTRAINT "dossier_passengers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_sales_id_fkey" FOREIGN KEY ("assigned_sales_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
