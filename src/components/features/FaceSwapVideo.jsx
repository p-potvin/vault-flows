import React, { useEffect, useState } from 'react';
import { FlowRuntimePanel } from '../ui/FlowRuntimePanel';
import { buildFaceSwapManifest } from '../../lib/flowRuntime';
import { runFaceSwapVideo } from '../../api';

function revokeUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 MB';
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function FaceSwapVideo() {
  const [runtimeConfig, setRuntimeConfig] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourcePreview, setSourcePreview] = useState('');
  const [targetFile, setTargetFile] = useState(null);
  const [targetPreview, setTargetPreview] = useState('');
  const [outputName, setOutputName] = useState('vault-faceswap-output.mp4');
  const [prompt, setPrompt] = useState('Save the processed output to my local machine after the swap completes.');
  const [status, setStatus] = useState({ loading: false, error: '', result: null });

  useEffect(() => () => revokeUrl(sourcePreview), [sourcePreview]);
  useEffect(() => () => revokeUrl(targetPreview), [targetPreview]);

  function handleSourceChange(event) {
    const file = event.target.files?.[0] || null;
    revokeUrl(sourcePreview);
    setSourceFile(file);
    setSourcePreview(file ? URL.createObjectURL(file) : '');
  }

  function handleTargetChange(event) {
    const file = event.target.files?.[0] || null;
    revokeUrl(targetPreview);
    setTargetFile(file);
    setTargetPreview(file ? URL.createObjectURL(file) : '');
  }

  function handleDownloadManifest() {
    if (!runtimeConfig || !sourceFile || !targetFile) {
      return;
    }

    const manifest = buildFaceSwapManifest({
      config: runtimeConfig,
      sourceFile,
      targetFile,
      prompt,
      outputName,
    });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vault-faceswap-job.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleRun() {
    if (!sourceFile || !targetFile) {
      return;
    }

    setStatus({ loading: true, error: '', result: null });

    try {
      const result = await runFaceSwapVideo({
        sourceFile,
        targetFile,
        prompt,
        outputName,
      });

      setStatus({ loading: false, error: '', result });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Local face swap execution failed.',
        result: null,
      });
    }
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded shadow mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">Image to Video Face Swap</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Upload a source face image and a target video. This flow exports a local job manifest and can execute immediately when the local bridge runtime is available on your machine.
        </p>
      </div>

      <div className="mb-4">
        <FlowRuntimePanel
          flowId="videoFaceSwap"
          title="Face Swap Runtime"
          description="This flow expects a machine-local runtime. The recommended stack is a local bridge plus FaceFusion or a ComfyUI face-swap workflow."
          onConfigChange={setRuntimeConfig}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Source face image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleSourceChange}
            className="w-full text-sm"
          />
          {sourcePreview && (
            <div className="mt-3 rounded border border-gray-200 p-3 dark:border-gray-700">
              <img
                src={sourcePreview}
                alt="Face swap source preview"
                className="max-h-56 w-full rounded object-contain"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {sourceFile?.name} • {formatBytes(sourceFile?.size || 0)}
              </div>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Target video</span>
          <input
            type="file"
            accept="video/*"
            onChange={handleTargetChange}
            className="w-full text-sm"
          />
          {targetPreview && (
            <div className="mt-3 rounded border border-gray-200 p-3 dark:border-gray-700">
              <video
                src={targetPreview}
                controls
                className="max-h-56 w-full rounded bg-black"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {targetFile?.name} • {formatBytes(targetFile?.size || 0)}
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Output filename</span>
          <input
            value={outputName}
            onChange={(event) => setOutputName(event.target.value)}
            className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Save prompt / operator note</span>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>

      <div className="mt-4 rounded border border-vault-200 bg-vault-50 p-3 text-sm text-vault-900 dark:border-vault-700 dark:bg-vault-950/40 dark:text-vault-100">
        Recommended local stack: a machine-local bridge plus FaceFusion for direct video jobs, or a local ComfyUI workflow using ReActor / DeepFuze when you want node-based control over swap + restoration.
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          onClick={handleDownloadManifest}
          disabled={!runtimeConfig || !sourceFile || !targetFile}
        >
          Download Job Manifest
        </button>
        <button
          type="button"
          className="rounded bg-vault-900 px-4 py-2 text-sm font-semibold text-white hover:bg-vault-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
          onClick={handleRun}
          disabled={status.loading || !sourceFile || !targetFile}
        >
          {status.loading ? 'Running local job...' : 'Run Local Face Swap'}
        </button>
      </div>

      {status.error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {status.error}
        </div>
      )}

      {status.result && (
        <div className="mt-4 rounded border border-gray-200 p-4 dark:border-gray-700">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Execution result</div>
          {'reason' in status.result && status.result.reason ? (
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-200">
              {status.result.reason}
            </div>
          ) : null}

          {status.result.outputPath ? (
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
              Saved locally to: <code>{status.result.outputPath}</code>
            </div>
          ) : null}

          {status.result.previewUrl ? (
            <div className="mt-4">
              <video src={status.result.previewUrl} controls className="max-h-72 w-full rounded bg-black" />
              <a
                href={status.result.previewUrl}
                download={outputName}
                className="mt-3 inline-flex rounded bg-vault-200 px-3 py-2 text-sm font-semibold text-vault-900 hover:bg-vault-300 dark:bg-vault-800 dark:text-vault-100 dark:hover:bg-vault-700"
              >
                Save Output Video Locally
              </a>
            </div>
          ) : null}

          <pre className="mt-4 max-h-72 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
            {JSON.stringify(status.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
