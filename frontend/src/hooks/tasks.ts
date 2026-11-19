import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import type { TaskQuery } from '../api/tasks.api';
import type { TaskFormValues } from '../schemas/task.schema';

const TASKS_KEY = 'tasks';

export const useTasks = (query: TaskQuery) =>
  useQuery({
    queryKey: [TASKS_KEY, query],
    queryFn: () => tasksApi.list(query),
    placeholderData: (prev) => prev,
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskFormValues> }) =>
      tasksApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
};
