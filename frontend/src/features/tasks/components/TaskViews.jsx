import React from 'react';
const icons = { 'All Tasks': '▤', "Today's Schedule": '◷', Completed: '✓' };
export default function TaskViews({ views, active, onChange }) { return <nav className="task-views" aria-label="Task views">{views.map(({name,count}) => <button key={name} onClick={() => onChange(name)} className={active === name ? 'active' : ''}><span>{icons[name]}</span>{name}<small>{count}</small></button>)}</nav>; }

