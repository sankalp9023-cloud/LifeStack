import React, { useState } from 'react';
import { RESOURCE_TYPES } from '../data/projectRepository.js';
import Modal from '@/components/ui/Modal';

export default function ResourcesManager({ project, resources = [], repository, run }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('link');
  const [url, setUrl] = useState('');

  const projectResources = resources.filter((r) => r.projectId === project.id);

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('link');
    setUrl('');
    setEditingResource(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (res) => {
    setEditingResource(res);
    setName(res.name);
    setDescription(res.description || '');
    setType(res.type || 'link');
    setUrl(res.url || '');
    setShowAddForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingResource) {
      const ok = run(() =>
        repository.updateResource(editingResource.id, {
          name,
          description,
          type,
          url,
        })
      );
      if (ok) resetForm();
    } else {
      const ok = run(() =>
        repository.createResource(project.id, {
          name,
          description,
          type,
          url,
        })
      );
      if (ok) resetForm();
    }
  };

  const handleDelete = (resourceId) => {
    if (window.confirm('Delete this resource?')) {
      run(() => repository.deleteResource(resourceId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Resources & References ({projectResources.length})
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
            + Add Resource
          </button>
        )}
      </div>

      <Modal open={showAddForm} title={editingResource ? 'Edit resource' : 'Add project resource'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. API Documentation"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Reference / URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://docs.example.com or /docs/spec.pdf"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about this resource..."
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              {editingResource ? 'Save Changes' : 'Add Resource'}
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

      {projectResources.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No resources attached to this project yet. Add links, documentation, file paths, or references.
        </p>
      ) : (
        <div className="space-y-2.5">
          {projectResources.map((res) => {
            const isWebLink = res.url && (res.url.startsWith('http://') || res.url.startsWith('https://'));

            return (
              <div
                key={res.id}
                className="rounded border border-slate-800 bg-slate-900/40 p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                      {res.type}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100">{res.name}</h4>
                  </div>

                  {res.description && (
                    <p className="text-xs text-slate-400">{res.description}</p>
                  )}

                  {res.url && (
                    <div className="text-xs font-mono text-cyan-400 truncate">
                      {isWebLink ? (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {res.url} ↗
                        </a>
                      ) : (
                        <span>{res.url}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {isWebLink && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
                    >
                      Open Link
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(res)}
                    className="text-slate-400 hover:text-white underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(res.id)}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

