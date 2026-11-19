import React from 'react';
export default function TaskToolbar({ query, onQuery }) {
  return (
    <div className="task-toolbar">
      <label className="task-search">
        <span>⌕</span>
        <input
          aria-label="Search tasks"
          placeholder="Search tasks..."
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
    </div>
  );
}

