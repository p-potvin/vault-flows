import React, { useState, useCallback, useMemo } from 'react';
import { Modal } from './Modal';
import { useVaultTheme } from '../../lib/vaultTheme';
import { updateWorkflow } from '../../api';
import { Link } from 'react-router-dom';

function ThemeSwitcher({ theme, themeIndex, setThemeIndex, themes }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="font-semibold">Theme:</span>
      <select
        value={themeIndex}
        onChange={e => setThemeIndex(Number(e.target.value))}
        style={{
          background: theme.primary,
          color: theme.accent,
          border: `1px solid ${theme.accent}`,
          borderRadius: 6,
          padding: '2px 8px',
        }}
      >
        {themes.map((t, i) => (
          <option key={t.name} value={i}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}

export function WorkflowList({ workflows, onUpdated }) {
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { theme, themeIndex, setThemeIndex, themes } = useVaultTheme();

  // ⚡ Bolt: Wrap openEdit in useCallback so its reference is stable.
  const openEdit = useCallback((wf) => {
    setEditing(wf);
    setEditName(wf.name || '');
    setEditCategory(wf.category || '');
  }, []);

  const closeEdit = () => {
    setEditing(null);
    setEditName('');
    setEditCategory('');
    setSaveError('');
  };
  const saveEdit = async () => {
    if (!editing) {
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      await updateWorkflow(editing.id, {
        name: editName.trim(),
        category: editCategory.trim(),
      });
      closeEdit();
      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      setSaveError(error.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  };

  // ⚡ Bolt: Memoize the rendered list of workflows to prevent recreating hundreds
  // of <li> elements on every keystroke when typing in the "Edit Workflow" modal.
  const renderedWorkflows = useMemo(() => {
    if (!workflows || workflows.length === 0) {
      return <li className="text-gray-500">No workflows found.</li>;
    }

    return workflows.map((wf, i) => (
      <li key={wf.id || i} className="bg-white dark:bg-gray-800 rounded shadow p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{wf.name}</span>
          {wf.category && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-vault-100 dark:bg-vault-800 text-vault-700 dark:text-vault-200 border border-vault-200 dark:border-vault-700">{wf.category}</span>
          )}
          {wf.description && (
            <div className="text-gray-600 dark:text-gray-300 text-sm mt-1">{wf.description}</div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Link
            to={`/workflows/${wf.id}`}
            className="px-3 py-1 rounded bg-vault-900 dark:bg-vault-100 text-white dark:text-vault-900 hover:bg-vault-800 dark:hover:bg-vault-200 font-semibold"
          >
            Design
          </Link>
          <button
            className="px-3 py-1 rounded bg-vault-200 dark:bg-vault-700 text-vault-900 dark:text-vault-100 hover:bg-vault-300 dark:hover:bg-vault-600 font-semibold"
            onClick={() => openEdit(wf)}
          >
            Edit
          </button>
        </div>
      </li>
    ));
  }, [workflows, openEdit]);

  return (
    <div className="p-4">
      <ThemeSwitcher theme={theme} themeIndex={themeIndex} setThemeIndex={setThemeIndex} themes={themes} />
      <h2 className="text-2xl font-bold mb-4">Workflows</h2>
      <ul className="space-y-2">
        {renderedWorkflows}
      </ul>

      <Modal open={!!editing} onClose={closeEdit} title="Edit Workflow">
        <div className="mb-4">
          <label htmlFor="edit-workflow-name" className="block text-sm font-medium mb-1">Name:</label>
          <input
            id="edit-workflow-name"
            className="w-full border rounded px-2 py-1 dark:bg-gray-900 dark:text-gray-100"
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="edit-workflow-category" className="block text-sm font-medium mb-1">Category:</label>
          <input
            id="edit-workflow-category"
            className="w-full border rounded px-2 py-1 dark:bg-gray-900 dark:text-gray-100"
            value={editCategory}
            onChange={e => setEditCategory(e.target.value)}
          />
        </div>
        {saveError ? <div className="mb-2 text-sm text-red-500">{saveError}</div> : null}
        <div className="flex justify-end space-x-2">
          <button className="px-4 py-1 rounded bg-vault-200 dark:bg-vault-700 text-vault-900 dark:text-vault-100" onClick={closeEdit}>Cancel</button>
          <button
            className="px-4 py-1 rounded bg-vault-900 dark:bg-vault-100 text-white dark:text-vault-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={saveEdit}
            disabled={isSaving || !editName.trim() || !editCategory.trim()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
