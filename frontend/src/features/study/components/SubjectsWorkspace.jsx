import React, { useState } from 'react';
import confirmAction from '@/utils/confirmAction';
import { getChapterProgress, getSubjectProgress, getTopicCompletion } from '../data/studyMetrics';
import Modal from '@/components/ui/Modal';

const LEARNING_TYPES = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'reading', label: 'Reading' },
  { value: 'practice', label: 'Practice' },
];

export default function SubjectsWorkspace({ data, repository, run, onAddNote }) {
  const [selectedId, setSelectedId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', goal: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', goal: '', description: '' });
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showSubjectEdit, setShowSubjectEdit] = useState(false);
  const selectedSubject = data.subjects.find((subject) => subject.id === selectedId);
  const chapters = data.chapters.filter((chapter) => chapter.subjectId === selectedId);
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId);

  const saveSubject = (event) => {
    event.preventDefault();
    if (run(() => repository.createSubject(subjectForm))) { setSubjectForm({ name: '', goal: '', description: '' }); setShowSubjectForm(false); }
  };

  const saveEditedSubject = (event) => {
    event.preventDefault();
    if (run(() => repository.updateSubject(selectedId, editForm))) setShowSubjectEdit(false);
  };

  const selectSubject = (subject) => {
    setSelectedId(subject.id);
    setSelectedChapterId('');
    setEditForm({ name: subject.name, goal: subject.goal, description: subject.description });
  };

  return (
    <div className="space-y-6">
      <Modal open={showSubjectForm} title="Add subject" onClose={() => setShowSubjectForm(false)}>
      <form className="space-y-3" onSubmit={saveSubject}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Name
            <input required value={subjectForm.name} onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" />
          </label>
          <label className="text-sm">Study goal
            <input value={subjectForm.goal} onChange={(event) => setSubjectForm({ ...subjectForm, goal: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" placeholder="e.g. 5 hours per week" />
          </label>
          <label className="text-sm">Description
            <input value={subjectForm.description} onChange={(event) => setSubjectForm({ ...subjectForm, description: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" />
          </label>
        </div>
        <button className="rounded border border-slate-500 px-3 py-2 text-sm" type="submit">Add subject</button>
      </form></Modal>

      {!selectedSubject && <section>
        {data.subjects.length === 0 && <p className="mb-3 text-sm text-slate-400">No subjects yet. Add a subject to begin organizing your study.</p>}
          <ul className="space-y-1">
            {data.subjects.map((subject) => {
              const progress = getSubjectProgress(data, subject.id);
              return (
                <li key={subject.id} className="study-subject-row min-w-0 transition-colors hover:bg-slate-900/50">
                  <div className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <button type="button" className="min-w-48 flex-1 text-left" onClick={() => selectSubject(subject)}>
                      <span className="block font-medium text-slate-100">{subject.name}</span>
                      {subject.goal && <span className="mt-0.5 block text-xs text-slate-400">Goal: {subject.goal}</span>}
                      <span className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex-1 overflow-hidden bg-slate-800"><span className="block h-1 bg-cyan-400" style={{ width: `${progress.percentage}%` }} /></span>
                        <span className="shrink-0 text-cyan-300">{progress.completed}/{progress.total} topics · {progress.percentage}%</span>
                      </span>
                    </button>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="study-control study-control-edit" onClick={() => { selectSubject(subject); setEditForm({ name: subject.name, goal: subject.goal || '', description: subject.description || '' }); setShowSubjectEdit(true); }}>Edit</button>
                      <button type="button" className="study-control study-control-delete" onClick={async () => {
                        if (await confirmAction(`Delete ${subject.name} and its chapters, topics, notes, practice, and assessments?`)) {
                          if (run(() => repository.deleteSubject(subject.id)) && selectedId === subject.id) setSelectedId('');
                        }
                      }}>Delete</button>
                    </div>
                  </div>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => setShowSubjectForm(true)} className="flex w-full items-center px-3 py-3 text-sm font-medium text-cyan-200 transition-colors hover:bg-sky-950/25">
                ＋ Add subject
              </button>
            </li>
          </ul>
      </section>}

      {selectedSubject && (
        <section className="subject-detail-screen min-h-full space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button type="button" className="study-control study-control-back mb-3 text-sm" onClick={() => { setSelectedChapterId(''); setSelectedId(''); }}>← Back to subjects</button>
              <h2 className="text-lg font-semibold">{selectedSubject.name}</h2>
              {selectedSubject.description && <p className="mt-1 text-sm text-slate-400">{selectedSubject.description}</p>}
              {selectedSubject.goal && <p className="mt-1 text-sm text-slate-400">Goal: {selectedSubject.goal}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" className="study-control study-control-edit" onClick={() => { setEditForm({ name: selectedSubject.name, goal: selectedSubject.goal || '', description: selectedSubject.description || '' }); setShowSubjectEdit(true); }}>Edit subject</button>
              <button type="button" className="study-control study-control-delete" onClick={async () => {
                if (await confirmAction(`Delete ${selectedSubject.name} and its chapters, topics, notes, practice, and assessments?`)) {
                  if (run(() => repository.deleteSubject(selectedId))) setSelectedId('');
                }
              }}>Delete subject</button>
            </div>
          </div>

          <Modal open={showSubjectEdit} title={`Edit ${selectedSubject.name}`} onClose={() => setShowSubjectEdit(false)}>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={saveEditedSubject}>
              <label className="text-sm">Name<input required value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
              <label className="text-sm">Study goal<input value={editForm.goal} onChange={(event) => setEditForm({ ...editForm, goal: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
              <label className="text-sm">Description<input value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
              <button type="submit" className="w-fit rounded border border-slate-500 px-3 py-2 text-sm">Save subject</button>
            </form>
          </Modal>

          <div>
            {selectedChapter ? (
              <div className="space-y-3">
                <button type="button" className="study-control study-control-back text-sm" onClick={() => setSelectedChapterId('')}>← Back to chapters</button>
                <ChapterCard chapter={selectedChapter} data={data} repository={repository} run={run} onAddNote={onAddNote} />
              </div>
            ) : (
              <>
                <h3 className="mb-3 font-semibold">Chapters</h3>
                {chapters.length === 0 && <p className="mb-3 text-sm text-slate-400">No chapters in this subject yet.</p>}
                <ul className="space-y-1">
                  {chapters.map((chapter) => {
                    const progress = getChapterProgress(data, chapter.id);
                    return (
                      <li key={chapter.id} className="flex flex-wrap items-center gap-3 px-3 py-3 hover:bg-slate-900/50">
                        <button type="button" className="min-w-48 flex-1 text-left" onClick={() => setSelectedChapterId(chapter.id)}>
                          <span className="block font-medium">{chapter.name}</span>
                          {chapter.description && <span className="mt-0.5 block text-xs text-slate-400">{chapter.description}</span>}
                        </button>
                        <span className="text-xs text-slate-400">{progress.completed}/{progress.total} topics complete</span>
                      </li>
                    );
                  })}
                  <li><AddChapterForm subjectId={selectedId} repository={repository} run={run} /></li>
                </ul>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AddChapterForm({ subjectId, repository, run }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <><button type="button" className="flex w-full items-center px-3 py-3 text-sm font-medium text-cyan-200 transition-colors hover:bg-sky-950/25" onClick={() => setOpen(true)}>＋ Add chapter</button><Modal open={open} title="Add chapter" onClose={() => setOpen(false)}><form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (run(() => repository.createChapter(subjectId, { name, description }))) {
        setName('');
        setDescription('');
        setOpen(false);
      }
    }}>
      <label className="min-w-48 flex-1 text-sm">Chapter name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
      <label className="min-w-48 flex-1 text-sm">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
      <button type="submit" className="rounded border border-slate-500 px-3 py-2 text-sm">Add chapter</button>
    </form></Modal></>
  );
}

function ChapterCard({ chapter, data, repository, run, onAddNote }) {
  const [topicName, setTopicName] = useState('');
  const [requirements, setRequirements] = useState(['lecture', 'reading', 'practice']);
  const [editing, setEditing] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editName, setEditName] = useState(chapter.name);
  const topics = data.topics.filter((topic) => topic.chapterId === chapter.id);
  const progress = getChapterProgress(data, chapter.id);

  const toggleRequirement = (type) => setRequirements((current) => current.includes(type)
    ? current.filter((item) => item !== type)
    : [...current, type]);

  return (
    <article className="study-chapter-detail space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <form className="flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (run(() => repository.updateChapter(chapter.id, { name: editName, description: chapter.description }))) setEditing(false);
          }}>
            <input required value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Chapter name" className="rounded border border-slate-600 bg-slate-950 p-2" />
            <button type="submit" className="text-sm underline">Save</button>
          </form>
        ) : <h3 className="font-medium">{chapter.name} <span className="text-sm font-normal text-slate-400">· {progress.completed}/{progress.total} topics complete</span></h3>}
        <div className="flex gap-3 text-sm">
          <button type="button" className="underline" onClick={() => { setEditName(chapter.name); setEditing(!editing); }}>{editing ? 'Cancel' : 'Edit'}</button>
          <button type="button" className="text-red-300 underline" onClick={async () => {
            if (await confirmAction(`Delete chapter "${chapter.name}" and its topics?`)) run(() => repository.deleteChapter(chapter.id));
          }}>Delete</button>
        </div>
      </div>

      <button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setShowTopicForm(true)}>＋ Add topic</button>
      <Modal open={showTopicForm} title={`Add topic to ${chapter.name}`} onClose={() => setShowTopicForm(false)}><form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (run(() => repository.createTopic(chapter.id, { name: topicName, requirements }))) { setTopicName(''); setShowTopicForm(false); }
      }}>
        <label className="min-w-48 flex-1 text-sm">New topic<input required value={topicName} onChange={(event) => setTopicName(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></label>
        <fieldset className="flex flex-wrap gap-3 text-sm">
          <legend className="w-full text-slate-400">Required activities</legend>
          {LEARNING_TYPES.map((type) => <label key={type.value} className="flex items-center gap-1"><input type="checkbox" checked={requirements.includes(type.value)} onChange={() => toggleRequirement(type.value)} />{type.label}</label>)}
        </fieldset>
        <button type="submit" className="rounded border border-slate-500 px-3 py-2 text-sm">Add topic</button>
      </form></Modal>

      {topics.length > 0 && (
        <div className="space-y-1">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} data={data} repository={repository} run={run} onAddNote={onAddNote} />
          ))}
        </div>
      )}
    </article>
  );
}

function TopicCard({ topic, data, repository, run, onAddNote }) {
  const [activity, setActivity] = useState({ type: topic.requirements[0], title: '', details: '' });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(topic.name);
  const [editRequirements, setEditRequirements] = useState(topic.requirements);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const activities = data.learningActivities.filter((item) => item.topicId === topic.id);
  const notes = data.notes.filter((item) => item.topicId === topic.id);
  const complete = getTopicCompletion(data, topic.id);
  const toggle = (type, current) => setEditRequirements((items) => current
    ? items.filter((item) => item !== type)
    : [...items, type]);

  return (
    <div className="px-3 py-3 hover:bg-slate-900/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <form className="flex flex-wrap gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (run(() => repository.updateTopic(topic.id, { name: editName, requirements: editRequirements }))) setEditing(false);
          }}>
            <input required value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Topic name" className="rounded border border-slate-600 bg-slate-950 p-2" />
            {LEARNING_TYPES.map((type) => <label key={type.value} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editRequirements.includes(type.value)} onChange={() => toggle(type.value, editRequirements.includes(type.value))} />{type.label}</label>)}
            <button type="submit" className="text-sm underline">Save</button>
          </form>
        ) : <h4 className="font-medium">{topic.name} <span className={complete ? 'text-blue-300' : 'text-slate-400'}>· {complete ? 'Complete' : 'In progress'}</span></h4>}
        <div className="flex gap-3 text-sm">
          <button type="button" className="underline" onClick={() => { setEditName(topic.name); setEditRequirements(topic.requirements); setEditing(!editing); }}>{editing ? 'Cancel' : 'Edit'}</button>
          <button type="button" className="underline" onClick={() => onAddNote({
            subjectId: data.chapters.find((item) => item.id === topic.chapterId).subjectId,
            chapterId: topic.chapterId,
            topicId: topic.id,
          })}>Add note</button>
          <button type="button" className="underline" onClick={() => run(() => repository.createRevision(topic.id))}>Mark for revision</button>
          <button type="button" className="text-red-300 underline" onClick={async () => {
            if (await confirmAction(`Delete topic "${topic.name}"? Linked notes and history are retained where possible.`)) run(() => repository.deleteTopic(topic.id));
          }}>Delete</button>
        </div>
      </div>

      <ul className="my-2 space-y-1">
        {activities.map((item) => (
          <ActivityRow key={item.id} activity={item} repository={repository} run={run} />
        ))}
      </ul>
      {notes.length > 0 && (
        <details className="my-2 text-sm">
          <summary className="cursor-pointer">Topic notes ({notes.length})</summary>
          <ul className="mt-2 space-y-2 pl-4">
            {notes.map((note) => (
              <li key={note.id}>
                <p className="font-medium">{note.title}</p>
                <p className="whitespace-pre-wrap text-slate-400">{note.content}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setShowActivityForm(true)}>＋ Add activity</button>
      <Modal open={showActivityForm} title={`Add activity to ${topic.name}`} onClose={() => setShowActivityForm(false)}><form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        const type = topic.requirements.includes(activity.type) ? activity.type : topic.requirements[0];
        if (run(() => repository.addLearningActivity(topic.id, { ...activity, type }))) { setActivity({ ...activity, type, title: '', details: '' }); setShowActivityForm(false); }
      }}>
        <select value={topic.requirements.includes(activity.type) ? activity.type : topic.requirements[0]} onChange={(event) => setActivity({ ...activity, type: event.target.value })} aria-label="Activity type" className="rounded border border-slate-600 bg-slate-950 p-2 text-sm">
          {topic.requirements.map((type) => <option key={type} value={type}>{LEARNING_TYPES.find((item) => item.value === type)?.label || type}</option>)}
        </select>
        <input required value={activity.title} onChange={(event) => setActivity({ ...activity, title: event.target.value })} aria-label="Activity title" placeholder="Lecture, reading, or practice activity" className="min-w-48 flex-1 rounded border border-slate-600 bg-slate-950 p-2 text-sm" />
        <input value={activity.details} onChange={(event) => setActivity({ ...activity, details: event.target.value })} aria-label="Activity details" placeholder="Notes or resource" className="min-w-36 flex-1 rounded border border-slate-600 bg-slate-950 p-2 text-sm" />
        <button type="submit" className="rounded border border-slate-500 px-3 py-2 text-sm">Add activity</button>
      </form></Modal>
    </div>
  );
}

function ActivityRow({ activity, repository, run }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(activity.title);
  const [details, setDetails] = useState(activity.details);
  if (editing) {
    return (
      <li className="flex flex-wrap gap-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Activity title" className="rounded border border-slate-600 bg-slate-950 p-1 text-sm" />
        <input value={details} onChange={(event) => setDetails(event.target.value)} aria-label="Activity details" className="rounded border border-slate-600 bg-slate-950 p-1 text-sm" />
        <button type="button" className="text-sm underline" onClick={() => {
          if (run(() => repository.updateLearningActivity(activity.id, { title, details, completed: activity.completed }))) setEditing(false);
        }}>Save</button>
        <button type="button" className="text-sm underline" onClick={() => setEditing(false)}>Cancel</button>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={activity.completed} onChange={(event) => run(() => repository.updateLearningActivity(activity.id, { ...activity, completed: event.target.checked }))} />
        <span className={activity.completed ? 'line-through text-slate-400' : ''}>{activity.title}</span>
      </label>
      <span className="text-slate-400">({activity.type}) {activity.details}</span>
      <button type="button" className="underline" onClick={() => setEditing(true)}>Edit</button>
      <button type="button" className="text-red-300 underline" onClick={() => run(() => repository.deleteLearningActivity(activity.id))}>Delete</button>
    </li>
  );
}

