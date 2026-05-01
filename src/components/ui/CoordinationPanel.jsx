import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCoordinationTask,
  dispatchCoordinationTasks,
  fetchCoordinationSnapshot,
  getCoordinationApiBase,
  saveCoordinationApiBase,
  testCoordinationRedis,
} from '../../api';

const AGENT_OPTIONS = [
  { id: '', label: 'Auto assign' },
  { id: 'text-agent', label: 'Text agent' },
  { id: 'image-agent', label: 'Image agent' },
  { id: 'video-agent', label: 'Video agent' },
  { id: 'workflow-agent', label: 'Workflow agent' },
];

const TASK_TYPES = [
  { type: 'generate_text', agentType: 'text', skill: 'text_generation' },
  { type: 'generate_caption', agentType: 'text', skill: 'captioning' },
  { type: 'generate_image', agentType: 'image', skill: 'image_generation' },
  { type: 'edit_image', agentType: 'image', skill: 'image_editing' },
  { type: 'analyze_video', agentType: 'video', skill: 'video_analysis' },
  { type: 'sample_frames', agentType: 'video', skill: 'frame_sampling' },
  { type: 'parse_workflow', agentType: 'workflow', skill: 'workflow_parsing' },
  { type: 'export_comfyui', agentType: 'workflow', skill: 'comfyui_export' },
];

const DEFAULT_DETAILS = JSON.stringify(
  {
    prompt: 'Draft a concise status update for this flow.',
    style: 'plain',
  },
  null,
  2,
);

function formatTime(value) {
  if (!value) {
    return 'Not reported';
  }

  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return value;
  }
}

function parseDetails(value) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Task details must be a JSON object.');
  }

  return parsed;
}

function getStateTone(state) {
  if (state === 'WORKING') {
    return 'border-vault-500 bg-vault-50 text-vault-900 dark:border-vault-400 dark:bg-vault-950/40 dark:text-vault-100';
  }

  if (state === 'LOST' || state === 'OFFLINE') {
    return 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
}

// ⚡ Bolt: Wrap CoordinationPanel in React.memo() to prevent unnecessary
// re-renders when parent components like App update fast-changing state.
export const CoordinationPanel = React.memo(function CoordinationPanel() {
  const [apiUrl, setApiUrl] = useState(getCoordinationApiBase());
  const [redisUrl, setRedisUrl] = useState('redis://localhost:6379');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [banner, setBanner] = useState(null);
  const [taskType, setTaskType] = useState(TASK_TYPES[0].type);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [description, setDescription] = useState('Run a coordination smoke task.');
  const [details, setDetails] = useState(DEFAULT_DETAILS);

  const selectedTask = useMemo(
    () => TASK_TYPES.find((task) => task.type === taskType) || TASK_TYPES[0],
    [taskType],
  );

  const agents = useMemo(() => {
    const entries = Object.entries(snapshot?.agents || {});
    return entries.sort(([left], [right]) => left.localeCompare(right));
  }, [snapshot]);

  const queuedTasks = snapshot?.queued_tasks || [];
  const tasks = snapshot?.tasks || [];
  const messages = snapshot?.messages || [];

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCoordinationSnapshot();
      setSnapshot(data);
      setBanner(null);
      if (data.redis_url) {
        setRedisUrl(data.redis_url);
      }
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Coordination API unavailable',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const timer = window.setInterval(loadSnapshot, 2500);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadSnapshot]);

  async function handleSaveApiUrl() {
    const normalized = saveCoordinationApiBase(apiUrl);
    setApiUrl(normalized);
    await loadSnapshot();
  }

  async function handleRedisTest() {
    setLoading(true);
    try {
      const result = await testCoordinationRedis(redisUrl);
      setBanner({
        type: result.same_as_runtime ? 'success' : 'warning',
        title: result.same_as_runtime ? 'Redis connected' : 'Redis reachable',
        description: result.same_as_runtime
          ? 'The coordination runtime is connected to this Redis server.'
          : 'The server is reachable, but the running agents are using a different Redis URL. Restart the coordinator with REDIS_URL set to switch the active loop.',
      });
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Redis connection failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask() {
    setLoading(true);
    try {
      const payload = {
        type: taskType,
        description,
        details: parseDetails(details),
        agent_type: targetAgentId ? undefined : selectedTask.agentType,
        required_skill: targetAgentId ? undefined : selectedTask.skill,
        target_agent_id: targetAgentId || undefined,
      };
      const result = await createCoordinationTask(payload);
      await dispatchCoordinationTasks();
      await loadSnapshot();
      setBanner({
        type: 'success',
        title: 'Task queued',
        description: `Queued task ${result.task_id}.`,
      });
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Task not queued',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 py-4 md:py-8">
      <section className="space-y-4 rounded border border-vault-200 bg-white p-4 text-left shadow-sm dark:border-vault-700 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-vault-900 dark:text-vault-100">Coordination</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Connect to the local coordination API, assign Redis-backed tasks, and watch agent traffic in one loop.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto refresh
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Coordination API URL</span>
            <input
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              className="rounded bg-vault-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900"
              onClick={handleSaveApiUrl}
              disabled={loading}
            >
              Connect
            </button>
            <button
              className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200"
              onClick={loadSnapshot}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Redis URL</span>
            <input
              value={redisUrl}
              onChange={(event) => setRedisUrl(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded border border-vault-300 px-4 py-2 text-sm font-bold text-vault-900 disabled:opacity-60 dark:border-vault-600 dark:text-vault-100"
              onClick={handleRedisTest}
              disabled={loading}
            >
              Test Redis
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`rounded border p-3 text-sm ${
              banner.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                : banner.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            <div className="font-semibold">{banner.title}</div>
            <div>{banner.description}</div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Assign Task</h3>
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Task Type</span>
                <select
                  value={taskType}
                  onChange={(event) => setTaskType(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {TASK_TYPES.map((task) => (
                    <option key={task.type} value={task.type}>{task.type}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Target Agent</span>
                <select
                  value={targetAgentId}
                  onChange={(event) => setTargetAgentId(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {AGENT_OPTIONS.map((agent) => (
                    <option key={agent.id || 'auto'} value={agent.id}>{agent.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Description</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Details JSON</span>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={9}
                  spellCheck={false}
                  className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>

              <button
                className="rounded bg-vault-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900"
                onClick={handleCreateTask}
                disabled={loading}
              >
                Queue and Dispatch
              </button>
            </div>
          </section>

          <section className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Agents</h3>
            <div className="grid gap-2">
              {agents.length === 0 ? (
                <div className="rounded border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No agents reported yet.
                </div>
              ) : agents.map(([agentId, status]) => (
                <div key={agentId} className={`rounded border p-3 ${getStateTone(status.state)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{agentId}</div>
                    <div className="text-xs font-bold">{status.state || 'UNKNOWN'}</div>
                  </div>
                  <div className="mt-1 text-xs opacity-80">Last update: {formatTime(status.last_updated)}</div>
                  {status.current_task && (
                    <div className="mt-2 rounded bg-white/60 p-2 text-xs dark:bg-black/20">
                      {status.current_task.type} / {status.current_task.id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tasks</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{queuedTasks.length} queued</span>
            </div>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {tasks.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No tasks recorded yet.</div>
              ) : tasks.slice(0, 30).map((task) => (
                <div key={task.id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{task.type}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{task.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.id}</div>
                  {task.description && <p className="mt-2 text-gray-700 dark:text-gray-300">{task.description}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Messages</h3>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {messages.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No Redis messages recorded yet.</div>
              ) : messages.slice(0, 60).map((message, index) => (
                <div key={`${message.timestamp}-${index}`} className="rounded border border-gray-200 p-3 text-xs dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {message.agent || 'unknown'} / {message.action || 'MESSAGE'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-gray-600 dark:text-gray-300">
                    {message.task || 'no task'}{message.target ? ` -> ${message.target}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
});
