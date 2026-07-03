import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api.js';

/**
 * Generic CRUD table for admin screens.
 *
 * @param {string} title              Section heading
 * @param {string} endpoint           API path, e.g. "/admin/users"
 * @param {string} queryKey           react-query cache key
 * @param {Array<{key,label,render?}>} columns  Columns to render
 * @param {Array<{key,label,type}>}   formFields  Fields shown in the create/edit modal
 * @param {boolean} canCreate         Show "+ New" button (default true)
 * @param {boolean} canDelete         Show delete action (default true)
 */
export default function DataTable({
  title, endpoint, queryKey, columns, formFields = [], canCreate = true, canDelete = true,
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...row} = edit
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery([queryKey, search], () =>
    api.get(endpoint, { params: search ? { q: search } : {} }).then((r) => r.data));

  const rows = data?.data || [];

  const saveMutation = useMutation(
    (payload) => payload.id
      ? api.patch(`${endpoint}/${payload.id}`, payload)
      : api.post(endpoint, payload),
    { onSuccess: () => { queryClient.invalidateQueries(queryKey); setEditing(null); } }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`${endpoint}/${id}`),
    { onSuccess: () => queryClient.invalidateQueries(queryKey) }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none"
          />
          {canCreate && (
            <button onClick={() => setEditing({})} className="btn-primary text-sm">+ New</button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-white/50">Loading...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-400">Failed to load: {error.response?.data?.message || error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-white/50">No records yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(row)} className="text-primary-400 text-xs mr-3">Edit</button>
                    {canDelete && (
                      <button
                        onClick={() => { if (confirm('Delete this record?')) deleteMutation.mutate(row.id); }}
                        className="text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <EditModal
          initial={editing}
          fields={formFields}
          onCancel={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate({ ...editing, ...payload })}
          saving={saveMutation.isLoading}
          error={saveMutation.error?.response?.data?.message}
        />
      )}
    </div>
  );
}

function EditModal({ initial, fields, onCancel, onSave, saving, error }) {
  const [form, setForm] = useState(() => {
    const base = {};
    fields.forEach((f) => { base[f.key] = initial[f.key] ?? (f.type === 'checkbox' ? false : ''); });
    return base;
  });

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="glass-card p-6 w-full max-w-md flex flex-col gap-3">
        <h2 className="font-semibold text-lg">{initial.id ? 'Edit' : 'New'} Record</h2>
        {fields.map((f) => (
          <label key={f.key} className="text-xs text-white/60 flex flex-col gap-1">
            {f.label}
            {f.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="self-start"
              />
            ) : (
              <input
                type={f.type || 'text'}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-white/5 rounded-lg px-3 py-2 text-sm outline-none text-white"
              />
            )}
          </label>
        ))}
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onCancel} className="text-xs text-white/60 px-3 py-2">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
