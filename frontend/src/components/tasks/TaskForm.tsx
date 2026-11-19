import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '../../schemas/task.schema';
import type { TaskFormValues } from '../../schemas/task.schema';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../types';
import type { Task } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const toOptions = (values: readonly string[]) =>
  values.map((v) => ({ value: v, label: v }));

interface TaskFormProps {
  task?: Task;
  onSubmit: (values: TaskFormValues) => void;
  isLoading?: boolean;
  error?: string | null;
  onCancel: () => void;
}

export const TaskForm = ({ task, onSubmit, isLoading, error, onCancel }: TaskFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'pending',
      priority: task?.priority ?? 'medium',
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    },
  });

  return (
    <form className="task-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Alert message={error} />
      <Input
        id="title"
        label="Title"
        placeholder="What needs to be done?"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        id="description"
        label="Description"
        placeholder="Optional details"
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="form-row">
        <Select
          id="status"
          label="Status"
          options={toOptions(TASK_STATUSES)}
          error={errors.status?.message}
          {...register('status')}
        />
        <Select
          id="priority"
          label="Priority"
          options={toOptions(TASK_PRIORITIES)}
          error={errors.priority?.message}
          {...register('priority')}
        />
      </div>
      <Input
        id="dueDate"
        label="Due date"
        type="date"
        error={errors.dueDate?.message}
        {...register('dueDate')}
      />
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {task ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
};
