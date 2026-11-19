import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from 'models/task.model';

// Task Create Schema
export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).default('pending'),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).default('medium'),
  dueDate: z.coerce.date().optional(),
});

// Task Update Schema — all fields optional
export const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

// Task List Query Schema
export const taskListQuerySchema = z.object({
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).optional(),
});
