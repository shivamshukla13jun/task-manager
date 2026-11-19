import { useAppDispatch, useAppSelector } from '../../store';
import { resetFilters, setPriority, setStatus } from '../../store/filters.slice';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../types';
import type { TaskPriority, TaskStatus } from '../../types';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const withAll = (values: readonly string[], allLabel: string) => [
  { value: '', label: allLabel },
  ...values.map((v) => ({ value: v, label: v })),
];

export const TaskFilters = () => {
  const dispatch = useAppDispatch();
  const { status, priority } = useAppSelector((s) => s.filters);

  return (
    <div className="task-filters">
      <Select
        aria-label="Filter by status"
        options={withAll(TASK_STATUSES, 'All statuses')}
        value={status}
        onChange={(e) => dispatch(setStatus(e.target.value as '' | TaskStatus))}
      />
      <Select
        aria-label="Filter by priority"
        options={withAll(TASK_PRIORITIES, 'All priorities')}
        value={priority}
        onChange={(e) => dispatch(setPriority(e.target.value as '' | TaskPriority))}
      />
      {(status || priority) && (
        <Button variant="ghost" onClick={() => dispatch(resetFilters())}>
          Clear
        </Button>
      )}
    </div>
  );
};
