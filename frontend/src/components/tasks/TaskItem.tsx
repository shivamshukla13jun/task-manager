import type { Task, TaskStatus } from '../../types';
import { TASK_STATUSES } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const STATUS_TONE: Record<TaskStatus, 'warn' | 'info' | 'ok'> = {
  pending: 'warn',
  'in-progress': 'info',
  completed: 'ok',
};

const PRIORITY_TONE: Record<Task['priority'], 'neutral' | 'info' | 'danger'> = {
  low: 'neutral',
  medium: 'info',
  high: 'danger',
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export const TaskItem = ({ task, onEdit, onDelete, onStatusChange }: TaskItemProps) => {
  const due = formatDate(task.dueDate);
  const overdue = due && task.status !== 'completed' && new Date(task.dueDate!) < new Date();

  return (
    <Card className="task-item">
      <div className="task-item-top">
        <h3 className={`task-title ${task.status === 'completed' ? 'task-title-done' : ''}`}>
          {task.title}
        </h3>
        <Badge label={task.priority} tone={PRIORITY_TONE[task.priority]} />
      </div>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-meta">
        <Badge label={task.status} tone={STATUS_TONE[task.status]} />
        {due && (
          <span className={`task-due ${overdue ? 'task-due-over' : ''}`}>
            {overdue ? 'Overdue · ' : 'Due '}
            {due}
          </span>
        )}
      </div>
      <div className="task-actions">
        <select
          className="input task-status-select"
          value={task.status}
          onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
          aria-label="Change status"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => onEdit(task)}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete(task)}>
          Delete
        </Button>
      </div>
    </Card>
  );
};
