export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskChecklistItem {
  id?: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  sortOrder?: number;
}

export interface TaskDossier {
  id: string;
  code?: string;
  name?: string;
  route?: string;
  customer?: {
    displayName?: string;
  };
}

export interface TaskAssignee {
  id: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface TaskItem {
  id: string;
  organizationId?: string;
  dossierId?: string;
  title: string;
  description?: string;
  createdBy?: string;
  assignedTo?: string;
  priority: TaskPriority;
  status: TaskStatus;
  progressPercent: number;
  startAt?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  dossier?: TaskDossier;
  assignee?: TaskAssignee;
  checklistItems?: TaskChecklistItem[];
}

export interface QueryTaskParams {
  page?: number;
  limit?: number;
  search?: string;
  dossierId?: string;
  assignedTo?: string;
  status?: TaskStatus;
}

export interface PaginatedTasksResponse {
  items: TaskItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTaskInput {
  dossierId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: TaskPriority;
  startAt?: string;
  dueAt?: string;
  checklistItems?: TaskChecklistItem[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  progressPercent?: number;
  completedAt?: string;
}

export interface TaskActionInput {
  comment?: string;
  reasonCode?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskExtensionRequestInput {
  dueDate: string;
  reason?: string;
}
