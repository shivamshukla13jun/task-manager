import { useState } from 'react';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../hooks/tasks';
import { errorMessage } from '../api/client';
import type { Task, TaskPriority, TaskStatus } from '../types';
import type { TaskFormValues } from '../schemas/task.schema';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskFilters } from '../components/tasks/TaskFilters';

const PAGE_SIZE = 9;

type EditorState = { mode: 'create' } | { mode: 'edit'; task: Task } | null;

export const TasksPage = () => {
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const [priority, setPriority] = useState<'' | TaskPriority>('');
  const [page, setPage] = useState(1);

  const query = {
    status: status || undefined,
    priority: priority || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, error } = useTasks(query);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  const tasks = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSubmit = (values: TaskFormValues) => {
    if (editor?.mode === 'edit') {
      updateTask.mutate(
        { id: editor.task._id, input: values },
        { onSuccess: () => setEditor(null) }
      );
    } else {
      createTask.mutate(values, { onSuccess: () => setEditor(null) });
    }
  };

  const handleStatusChange = (task: Task, status: TaskStatus) =>
    updateTask.mutate({ id: task._id, input: { status } });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {pagination ? `${pagination.total} task${pagination.total === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <Button onClick={() => setEditor({ mode: 'create' })}>+ New Task</Button>
      </div>

      <TaskFilters
        status={status}
        priority={priority}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        onPriorityChange={(p) => {
          setPriority(p);
          setPage(1);
        }}
        onReset={() => {
          setStatus('');
          setPriority('');
          setPage(1);
        }}
      />

      <Alert message={isError ? errorMessage(error) : null} />

      {isLoading ? (
        <div className="page-loader">
          <Spinner size={32} />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          message="Create your first task to get started."
          action={<Button onClick={() => setEditor({ mode: 'create' })}>Create task</Button>}
        />
      ) : (
        <>
          <div className="task-grid">
            {tasks.map((task) => (
              <TaskItem
                key={task._id}
                task={task}
                onEdit={(t) => setEditor({ mode: 'edit', task: t })}
                onDelete={setToDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
              >
                Previous
              </Button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        open={editor !== null}
        title={editor?.mode === 'edit' ? 'Edit task' : 'New task'}
        onClose={() => setEditor(null)}
      >
        <TaskForm
          task={editor?.mode === 'edit' ? editor.task : undefined}
          onSubmit={handleSubmit}
          isLoading={createTask.isPending || updateTask.isPending}
          error={
            createTask.isError
              ? errorMessage(createTask.error)
              : updateTask.isError
                ? errorMessage(updateTask.error)
                : null
          }
          onCancel={() => setEditor(null)}
        />
      </Modal>

      <Modal open={toDelete !== null} title="Delete task" onClose={() => setToDelete(null)}>
        <p className="confirm-text">
          Delete <strong>{toDelete?.title}</strong>? This cannot be undone.
        </p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deleteTask.isPending}
            onClick={() =>
              toDelete && deleteTask.mutate(toDelete._id, { onSuccess: () => setToDelete(null) })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
