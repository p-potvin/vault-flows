import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchWorkflow, saveWorkflowGraph } from '../../api';
import { AdvancedWorkflowCreator } from '../features/AdvancedWorkflowCreator';

export default function WorkflowPage() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchWorkflow(id)
      .then((data) => {
        if (active) {
          setWorkflow(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load workflow.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = useCallback(async (graph) => {
    setSaveState('saving');
    setSaveMessage('');

    try {
      const updated = await saveWorkflowGraph(id, graph);
      setWorkflow(updated);
      setSaveState('saved');
      setSaveMessage('Graph saved locally.');
    } catch (err) {
      setSaveState('error');
      setSaveMessage(err.message || 'Unable to save graph.');
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-vault-50 text-vault-900 dark:bg-vault-950 dark:text-vault-50">
      <header className="border-b border-vault-200 bg-vault-100 px-4 py-4 dark:border-vault-700 dark:bg-vault-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="mb-2 inline-block text-sm font-semibold text-vault-700 hover:underline dark:text-vault-200">
              Back to workflows
            </Link>
            <h1 className="text-3xl font-semibold">Workflow Editor</h1>
          </div>
          {saveMessage ? (
            <div className={`rounded-md border px-3 py-2 text-sm ${
              saveState === 'error'
                ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300'
                : 'border-vault-300 text-vault-800 dark:border-vault-600 dark:text-vault-100'
            }`}
            >
              {saveMessage}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        {loading ? (
          <div className="rounded-lg border border-vault-200 bg-vault-100 p-6 text-vault-700 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-200">
            Loading workflow graph...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-300 bg-vault-100 p-6 text-red-700 dark:border-red-700 dark:bg-vault-900 dark:text-red-300">
            {error}
          </div>
        ) : (
          <AdvancedWorkflowCreator
            workflow={workflow}
            graph={workflow?.graph}
            onSave={handleSave}
            saveState={saveState}
          />
        )}
      </main>
    </div>
  );
}
