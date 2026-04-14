import React from 'react';
import { useParams, Link } from 'react-router-dom';

export default function WorkflowPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-vault-100 via-vault-50 to-gray-50 dark:from-vault-900 dark:via-gray-900 dark:to-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-vault-600 dark:text-vault-400 hover:underline mb-4 inline-block font-bold">
          &larr; Back to Dashboard
        </Link>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-vault-900 dark:text-vault-100 font-vault">Workflow Advanced Editor</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Editing Workflow ID: {id}</p>
        </header>

        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border border-vault-200 dark:border-vault-700">
          <h2 className="text-xl font-semibold mb-4">Pipeline Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">
            The Advanced Workflow Creator interface will be mounted here, providing granular node-based connections and configuration.
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-dashed border-gray-300 dark:border-gray-700 h-64 flex items-center justify-center">
            <span className="text-gray-400">Canvas Area Placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
