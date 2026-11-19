import { api } from './client';
import type { ApiResponse, Task, TaskListResponse } from '../types';
import type { TaskFormValues } from '../schemas/task.schema';

export interface TaskQuery {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export const tasksApi = {
  list: async (query: TaskQuery): Promise<TaskListResponse> => {
    const { data } = await api.get<TaskListResponse>('/api/tasks', { params: query });
    return data;
  },
  create: async (input: TaskFormValues): Promise<Task> => {
    const body = { ...input, dueDate: input.dueDate || undefined };
    const { data } = await api.post<ApiResponse<Task>>('/api/tasks', body);
    return data.data;
  },
  update: async (id: string, input: Partial<TaskFormValues>): Promise<Task> => {
    const body = { ...input, dueDate: input.dueDate || undefined };
    const { data } = await api.patch<ApiResponse<Task>>(`/api/tasks/${id}`, body);
    return data.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/tasks/${id}`);
  },
};
