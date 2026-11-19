import { TASK_PRIORITIES, TASK_STATUSES } from '../../types';
import type { TaskPriority, TaskStatus } from '../../types';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const withAll = (values: readonly string[], allLabel: string) => [
  { value: '', label: allLabel },
  ...values.map((v) => ({ value: v, label: v })),
];

interface TaskFiltersProps {
  status: '' | TaskStatus;
  priority: '' | TaskPriority;
  onStatusChange: (status: '' | TaskStatus) => void;
  onPriorityChange: (priority: '' | TaskPriority) => void;
  onReset: () => void;
}

export const TaskFilters = ({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  onReset,
}: TaskFiltersProps) => (
  <div className="task-filters">
    <Select
      aria-label="Filter by status"
      options={withAll(TASK_STATUSES, 'All statuses')}
      value={status}
      onChange={(e) => onStatusChange(e.target.value as '' | TaskStatus)}
    />
    <Select
      aria-label="Filter by priority"
      options={withAll(TASK_PRIORITIES, 'All priorities')}
      value={priority}
      onChange={(e) => onPriorityChange(e.target.value as '' | TaskPriority)}
    />
    {(status || priority) && (
      <Button variant="ghost" onClick={onReset}>
        Clear
      </Button>
    )}
  </div>
);
