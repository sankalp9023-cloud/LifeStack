import React, { useState } from 'react';
import confirmAction from '@/utils/confirmAction';
import useSettings from '@/features/settings/hooks/useSettings';
import { formatSettingsDateTime } from '@/features/settings/data/settingsFormatters';
import Modal from '@/components/ui/Modal';

export default function NotesManager({ project, notes = [], repository, run }) {
  const { settings } = useSettings();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const projectNotes = notes.filter((n) => n.projectId === project.id);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setShowAddForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingNote) {
      const ok = run(() =>
        repository.updateNote(editingNote.id, {
          title,
          content,
        })
      );
      if (ok) resetForm();
    } else {
      const ok = run(() =>
        repository.createNote(project.id, {
          title,
          content,
        })
      );
      if (ok) resetForm();
    }
  };

  const handleDelete = async (noteId) => {
    if (await confirmAction('Delete this note?')) {
      run(() => repository.deleteNote(noteId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Project Notes ({projectNotes.length})
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
          >
            + Add Note
          </button>
        )}
      </div>

      <Modal open={showAddForm} title={editingNote ? 'Edit note' : 'Add project note'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Considerations & Trade-offs"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Content</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your project notes, ideas, meeting logs, or architectural decisions..."
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 font-mono"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              {editingNote ? 'Save Changes' : 'Create Note'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {projectNotes.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No notes created for this project yet. Capture ideas, meeting summaries, or research findings.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectNotes.map((note) => (
            <div
              key={note.id}
              className="rounded border border-slate-800 bg-slate-900/40 p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">{note.title}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(note)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {note.content ? (
                  <p className="mt-2 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {note.content}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 italic">No content</p>
                )}
              </div>
              <div className="mt-3 pt-2 text-[10px] text-slate-500">
                Updated: {formatSettingsDateTime(note.updatedAt || note.createdAt, settings)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

