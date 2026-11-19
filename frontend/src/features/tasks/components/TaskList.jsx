import React from 'react';
export default function TaskList({tasks,onSelect,onEdit,onDelete,onUpdate,onCreate}) {
  if (!tasks.length) return <div className="task-empty"><div>✓</div><h2>Nothing here yet</h2><p>Your tasks will show up here. Add one to get started.</p><button className="task-primary" onClick={onCreate}>＋ Create a task</button></div>;
  return (
    <div className="task-list">
      {tasks.map(task => (
        <article className="task-row" key={task.id}>
          <button
            aria-label={task.status === 'completed' ? 'Mark as to do' : 'Mark completed'}
            className={`task-check ${task.status === 'completed' ? 'checked' : ''}`}
            onClick={() => onUpdate(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' })}
          >
            {task.status === 'completed' ? '✓' : ''}
          </button>
          <button className="task-main" onClick={() => onSelect(task)}>
            <strong className={task.status === 'completed' ? 'done' : ''}>{task.title}</strong>
            {task.description && <small>{task.description}</small>}
            <span className="task-meta">
              {task.dueDate && <span>◷ {task.dueDate}</span>}
              {task.category && <span>{task.category}</span>}
              {task.subtasks?.length > 0 && <span>☷ {task.subtasks.filter(x => x.completed).length}/{task.subtasks.length}</span>}
            </span>
          </button>
          <button className="task-action" onClick={() => onEdit(task)}>Edit</button>
          <button className="task-action delete" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)}>×</button>
        </article>
      ))}
    </div>
  );
}

