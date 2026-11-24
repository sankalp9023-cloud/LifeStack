import React, { useMemo, useState } from 'react';
import confirmAction from '@/utils/confirmAction';
import useSettings from '@/features/settings/hooks/useSettings';
import { formatSettingsDate, formatSettingsTime } from '@/features/settings/data/settingsFormatters';
import Modal from '@/components/ui/Modal';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(value, settings) {
  return value ? formatSettingsDate(value, settings) : 'No date';
}

function subjectTopics(data, subjectId) {
  const chapterIds = new Set(data.chapters.filter((item) => item.subjectId === subjectId).map((item) => item.id));
  return data.topics.filter((item) => chapterIds.has(item.chapterId));
}

function TopicSelect({ data, subjectId, value, onChange, multiple = false, required = false }) {
  const topics = useMemo(() => subjectTopics(data, subjectId), [data, subjectId]);
  return (
    <select multiple={multiple} required={required} value={value} onChange={(event) => onChange(
      multiple ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value,
    )} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" aria-label="Topic">
      {!multiple && <option value="">No specific topic</option>}
      {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
    </select>
  );
}

function SubjectSelect({ data, value, onChange, required = true }) {
  return (
    <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" aria-label="Subject">
      {!required && <option value="">No subject</option>}
      {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
    </select>
  );
}

function Field({ label, children }) {
  return <label className="text-sm">{label}{children}</label>;
}

export function NotesWorkspace({ data, repository, run, initialLink }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ subjectId: '', chapterId: '', topicId: '', title: '', content: '' });
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const subjectId = form.subjectId || data.subjects[0]?.id || '';
  const chapters = data.chapters.filter((chapter) => chapter.subjectId === subjectId);
  const topics = subjectTopics(data, subjectId).filter((topic) => !form.chapterId || topic.chapterId === form.chapterId);

  React.useEffect(() => {
    if (initialLink) {
      setForm((current) => ({ ...current, ...initialLink }));
      setFormOpen(true);
    }
  }, [initialLink]);

  const reset = () => {
    setEditingId('');
    setFormOpen(false);
    setForm({ subjectId: data.subjects[0]?.id || '', chapterId: '', topicId: '', title: '', content: '' });
  };
  const submit = (event) => {
    event.preventDefault();
    const saved = editingId
      ? run(() => repository.updateNote(editingId, form))
      : run(() => repository.createNote(form));
    if (saved) reset();
  };
  const startEdit = (note) => {
    setEditingId(note.id);
    setFormOpen(true);
    setForm({ subjectId: note.subjectId, chapterId: note.chapterId, topicId: note.topicId, title: note.title, content: note.content });
  };
  const subjectName = (id) => data.subjects.find((item) => item.id === id)?.name || 'Unknown subject';

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setFormOpen(true)}>＋ Create note</button></div>
      <Modal open={formOpen} title={editingId ? 'Edit note' : 'Create note'} onClose={() => setFormOpen(false)}><form className="space-y-3" onSubmit={submit}>
        <h2 className="font-semibold">{editingId ? 'Edit note' : 'Create note'}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Subject"><SubjectSelect data={data} value={subjectId} onChange={(value) => setForm({ ...form, subjectId: value, chapterId: '', topicId: '' })} /></Field>
          <Field label="Chapter">
            <select value={form.chapterId} onChange={(event) => setForm({ ...form, chapterId: event.target.value, topicId: '' })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" aria-label="Chapter">
              <option value="">Subject-level note</option>
              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <select value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" aria-label="Topic">
              <option value="">No specific topic</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </Field>
          <Field label="Title"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        </div>
        <Field label="Note content"><textarea required rows="5" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <div className="flex gap-2">
          <button type="submit" disabled={!data.subjects.length} className="rounded border border-slate-500 px-3 py-2 text-sm">{editingId ? 'Save note' : 'Create note'}</button>
          {editingId && <button type="button" className="rounded border border-slate-500 px-3 py-2 text-sm" onClick={reset}>Cancel</button>}
        </div>
      </form></Modal>

      <section>
        <h2 className="mb-3 font-semibold">Saved notes ({data.notes.length})</h2>
        {data.notes.length === 0 ? <p className="text-sm text-slate-400">No notes yet. Create a note above or add one from a topic.</p> : (
          <ul className="space-y-3">
            {[...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((note) => (
              <li key={note.id} className="rounded border border-slate-700 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-medium">{note.title}</h3>
                  <span className="text-xs text-slate-400">{subjectName(note.subjectId)}{note.topicId ? ` · ${data.topics.find((topic) => topic.id === note.topicId)?.name || ''}` : ''}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{note.content}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <button type="button" className="underline" onClick={() => startEdit(note)}>Edit</button>
                  <button type="button" className="text-red-300 underline" onClick={async () => {
                    if (await confirmAction(`Delete note "${note.title}"?`)) run(() => repository.deleteNote(note.id));
                  }}>Delete</button>
                  <time className="text-slate-500">Updated {dateLabel(note.updatedAt, settings)} {formatSettingsTime(note.updatedAt, settings)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function RevisionsWorkspace({ data, repository, run }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ topicId: '', dueDate: '', notes: '' });
  const [formOpen, setFormOpen] = useState(false);
  const topics = data.topics.map((topic) => ({
    ...topic,
    subjectName: data.subjects.find((subject) => subject.id === data.chapters.find((chapter) => chapter.id === topic.chapterId)?.subjectId)?.name || '',
  }));
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setFormOpen(true)}>＋ Schedule revision</button></div>
      <Modal open={formOpen} title="Schedule a revision" onClose={() => setFormOpen(false)}><form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        if (run(() => repository.createRevision(form.topicId, form))) { setForm({ topicId: '', dueDate: '', notes: '' }); setFormOpen(false); }
      }}>
        <h2 className="font-semibold md:col-span-3">Schedule a revision</h2>
        <Field label="Topic"><select required value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"><option value="">Choose topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.subjectName} · {topic.name}</option>)}</select></Field>
        <Field label="Revision date"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <button type="submit" disabled={!topics.length} className="w-fit rounded border border-slate-500 px-3 py-2 text-sm md:col-span-3">Add revision</button>
      </form></Modal>

      <section>
        <h2 className="mb-3 font-semibold">Revision history ({data.revisions.length})</h2>
        {data.revisions.length === 0 ? <p className="text-sm text-slate-400">No revisions scheduled.</p> : (
          <ul className="space-y-2">
            {[...data.revisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((revision) => (
              <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 p-3">
                <div>
                  <p className="font-medium">{data.topics.find((topic) => topic.id === revision.topicId)?.name || 'Topic removed'}</p>
                  <p className="text-sm text-slate-400">{revision.dueDate ? `Due ${dateLabel(revision.dueDate, settings)}` : 'No due date'} · {revision.status}{revision.notes ? ` · ${revision.notes}` : ''}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" className="underline" onClick={() => run(() => repository.updateRevision(revision.id, { completed: revision.status !== 'completed' }))}>{revision.status === 'completed' ? 'Reopen' : 'Mark completed'}</button>
                  <button type="button" className="text-red-300 underline" onClick={() => run(() => repository.deleteRevision(revision.id))}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PracticeWorkspace({ data, repository, run }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    subjectId: data.subjects[0]?.id || '', topicId: '', questionsAttempted: '',
    questionsCompleted: '', questionsCorrect: '', durationMinutes: '', date: today(), notes: '',
  });
  const [formOpen, setFormOpen] = useState(false);
  const changeSubject = (subjectId) => setForm({ ...form, subjectId, topicId: '' });
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setFormOpen(true)}>＋ Record practice</button></div>
      <Modal open={formOpen} title="Record practice session" onClose={() => setFormOpen(false)}><form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        if (run(() => repository.createPracticeSession(form))) { setForm({ ...form, topicId: '', questionsAttempted: '', questionsCompleted: '', questionsCorrect: '', durationMinutes: '', notes: '', date: today() }); setFormOpen(false); }
      }}>
        <h2 className="font-semibold md:col-span-3">Record practice session</h2>
        <Field label="Subject"><SubjectSelect data={data} value={form.subjectId} onChange={changeSubject} /></Field>
        <Field label="Topic"><TopicSelect data={data} subjectId={form.subjectId} value={form.topicId} onChange={(topicId) => setForm({ ...form, topicId })} /></Field>
        <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Questions attempted"><input required type="number" min="0" step="1" value={form.questionsAttempted} onChange={(event) => setForm({ ...form, questionsAttempted: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Questions completed"><input required type="number" min="0" step="1" value={form.questionsCompleted} onChange={(event) => setForm({ ...form, questionsCompleted: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Questions correct (optional)"><input type="number" min="0" step="1" value={form.questionsCorrect} onChange={(event) => setForm({ ...form, questionsCorrect: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Duration (minutes)"><input type="number" min="0" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <button type="submit" disabled={!data.subjects.length} className="w-fit rounded border border-slate-500 px-3 py-2 text-sm md:col-span-3">Save practice session</button>
      </form></Modal>

      <section>
        <h2 className="mb-3 font-semibold">Practice history ({data.practiceSessions.length})</h2>
        {data.practiceSessions.length === 0 ? <p className="text-sm text-slate-400">No practice sessions recorded.</p> : (
          <ul className="space-y-2">
            {[...data.practiceSessions].sort((a, b) => b.date.localeCompare(a.date)).map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 p-3">
                <div><p className="font-medium">{data.subjects.find((item) => item.id === session.subjectId)?.name} {session.topicId && `· ${data.topics.find((item) => item.id === session.topicId)?.name || ''}`}</p><p className="text-sm text-slate-400">{dateLabel(session.date, settings)} · {session.questionsCompleted}/{session.questionsAttempted} completed{session.questionsCorrect !== null ? ` · ${session.questionsCorrect} correct` : ''} · {session.durationMinutes} min{session.notes ? ` · ${session.notes}` : ''}</p></div>
                <button type="button" className="text-sm text-red-300 underline" onClick={() => run(() => repository.deletePracticeSession(session.id))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AssessmentsWorkspace({ data, repository, run }) {
  const { settings } = useSettings();
  const blank = () => ({ subjectId: data.subjects[0]?.id || '', topicIds: [], title: '', date: '', coverage: '', preparationProgress: '0', marksObtained: '', marksTotal: '' });
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const save = (event) => {
    event.preventDefault();
    const success = editingId
      ? run(() => repository.updateAssessment(editingId, form))
      : run(() => repository.createAssessment(form));
    if (success) {
      setEditingId('');
      setForm(blank());
      setFormOpen(false);
    }
  };
  const edit = (assessment) => {
    setFormOpen(true);
    setEditingId(assessment.id);
    setForm({ ...assessment, preparationProgress: String(assessment.preparationProgress), marksObtained: assessment.marksObtained ?? '', marksTotal: assessment.marksTotal ?? '' });
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => { setEditingId(''); setForm(blank()); setFormOpen(true); }}>＋ Add assessment</button></div>
      <Modal open={formOpen} title={editingId ? 'Edit test or exam' : 'Create test or exam'} onClose={() => { setFormOpen(false); setEditingId(''); }}><form className="grid gap-3 md:grid-cols-3" onSubmit={save}>
        <h2 className="font-semibold md:col-span-3">{editingId ? 'Edit test or exam' : 'Create test or exam'}</h2>
        <Field label="Subject"><SubjectSelect data={data} value={form.subjectId} onChange={(subjectId) => setForm({ ...form, subjectId, topicIds: [] })} /></Field>
        <Field label="Title"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Date"><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Syllabus coverage"><input value={form.coverage} onChange={(event) => setForm({ ...form, coverage: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Preparation progress (%)"><input type="number" min="0" max="100" value={form.preparationProgress} onChange={(event) => setForm({ ...form, preparationProgress: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Topics (optional)"><TopicSelect data={data} subjectId={form.subjectId} value={form.topicIds} onChange={(topicIds) => setForm({ ...form, topicIds })} multiple /></Field>
        <Field label="Marks obtained (optional)"><input type="number" min="0" step="any" value={form.marksObtained} onChange={(event) => setForm({ ...form, marksObtained: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Total marks"><input type="number" min="0" step="any" value={form.marksTotal} onChange={(event) => setForm({ ...form, marksTotal: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <div className="flex gap-2 md:col-span-3">
          <button type="submit" disabled={!data.subjects.length} className="w-fit rounded border border-slate-500 px-3 py-2 text-sm">{editingId ? 'Save assessment' : 'Add assessment'}</button>
          {editingId && <button type="button" className="rounded border border-slate-500 px-3 py-2 text-sm" onClick={() => { setEditingId(''); setForm(blank()); setFormOpen(false); }}>Cancel</button>}
        </div>
      </form></Modal>

      <section>
        <h2 className="mb-3 font-semibold">Tests and exams ({data.assessments.length})</h2>
        {data.assessments.length === 0 ? <p className="text-sm text-slate-400">No tests or exams added.</p> : (
          <ul className="space-y-2">
            {[...data.assessments].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map((assessment) => (
              <li key={assessment.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-slate-700 p-3">
                <div>
                  <p className="font-medium">{assessment.title} · {data.subjects.find((item) => item.id === assessment.subjectId)?.name}</p>
                  <p className="text-sm text-slate-400">{dateLabel(assessment.date, settings)} · Preparation {assessment.preparationProgress}%{assessment.marksObtained !== null ? ` · Result ${assessment.marksObtained}/${assessment.marksTotal}` : ''}</p>
                  {assessment.coverage && <p className="text-sm text-slate-300">Coverage: {assessment.coverage}</p>}
                  {assessment.topicIds.length > 0 && <p className="text-sm text-slate-400">Topics: {assessment.topicIds.map((id) => data.topics.find((topic) => topic.id === id)?.name).filter(Boolean).join(', ')}</p>}
                </div>
                <div className="flex gap-3 text-sm"><button type="button" className="underline" onClick={() => edit(assessment)}>Edit</button><button type="button" className="text-red-300 underline" onClick={() => run(() => repository.deleteAssessment(assessment.id))}>Delete</button></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function StudySessionsWorkspace({ data, repository, run }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ subjectId: '', topicId: '', durationMinutes: '', date: today(), notes: '' });
  const [formOpen, setFormOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button type="button" className="rounded border border-sky-500/50 px-3 py-2 text-sm" onClick={() => setFormOpen(true)}>＋ Record study session</button></div>
      <Modal open={formOpen} title="Record study session" onClose={() => setFormOpen(false)}><form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        if (run(() => repository.createStudySession(form))) { setForm({ ...form, topicId: '', durationMinutes: '', date: today(), notes: '' }); setFormOpen(false); }
      }}>
        <h2 className="font-semibold md:col-span-3">Record study session</h2>
        <Field label="Subject (optional)"><SubjectSelect data={data} required={false} value={form.subjectId} onChange={(subjectId) => setForm({ ...form, subjectId, topicId: '' })} /></Field>
        <Field label="Topic (optional)"><TopicSelect data={data} subjectId={form.subjectId} value={form.topicId} required={false} onChange={(topicId) => setForm({ ...form, topicId })} /></Field>
        <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Duration (minutes)"><input required type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <Field label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2" /></Field>
        <button type="submit" className="w-fit rounded border border-slate-500 px-3 py-2 text-sm md:col-span-3">Save study session</button>
      </form></Modal>

      <section>
        <h2 className="mb-3 font-semibold">Study session history ({data.studySessions.length})</h2>
        {data.studySessions.length === 0 ? <p className="text-sm text-slate-400">No study sessions recorded.</p> : (
          <ul className="space-y-2">
            {[...data.studySessions].sort((a, b) => b.date.localeCompare(a.date)).map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 p-3">
                <div><p className="font-medium">{data.subjects.find((item) => item.id === session.subjectId)?.name || 'General study'}{session.topicId ? ` · ${data.topics.find((item) => item.id === session.topicId)?.name || ''}` : ''}</p><p className="text-sm text-slate-400">{dateLabel(session.date, settings)} · {session.durationMinutes} min{session.notes ? ` · ${session.notes}` : ''}</p></div>
                <button type="button" className="text-sm text-red-300 underline" onClick={() => run(() => repository.deleteStudySession(session.id))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

