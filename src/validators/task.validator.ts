import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { paginationSchema, uuidSchema } from './common.validator';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  projectId: uuidSchema,
  sprintId: uuidSchema.optional().nullable(),
  parentId: uuidSchema.optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: uuidSchema.optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedHours: z.coerce.number().min(0).max(9999).optional().nullable(),
  position: z.coerce.number().int().min(0).optional(),
  labelIds: z.array(uuidSchema).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  sprintId: uuidSchema.optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: uuidSchema.optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedHours: z.coerce.number().min(0).max(9999).optional().nullable(),
  position: z.coerce.number().int().min(0).optional(),
});

export const taskIdParamSchema = z.object({
  taskId: uuidSchema,
});

export const projectIdParamSchema = z.object({
  projectId: uuidSchema,
});

export const listTasksQuerySchema = paginationSchema.extend({
  projectId: uuidSchema.optional(),
  sprintId: uuidSchema.optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: uuidSchema.optional(),
  parentId: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  includeArchived: z.coerce.boolean().optional(),
});

export const assignTaskSchema = z.object({
  assigneeId: uuidSchema.nullable(),
});

export const changeTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const taskLabelsSchema = z.object({
  labelIds: z.array(uuidSchema),
});

export const duplicateTaskSchema = z.object({
  includeSubtasks: z.boolean().default(false),
});

export const boardBulkUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        taskId: uuidSchema,
        status: z.nativeEnum(TaskStatus).optional(),
        position: z.coerce.number().int().min(0).optional(),
        sprintId: uuidSchema.optional().nullable(),
      }),
    )
    .min(1)
    .max(100),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type BoardBulkUpdateInput = z.infer<typeof boardBulkUpdateSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
export type TaskLabelsInput = z.infer<typeof taskLabelsSchema>;
export type DuplicateTaskInput = z.infer<typeof duplicateTaskSchema>;
