"""
Entrypoint for the full VaultWares multi-agent coordination system.

Starts:
  - LonelyManager  — monitors heartbeats, enforces alignment, dispatches tasks
  - TextAgent      — text generation, captioning, prompt engineering
  - ImageAgent     — image generation, editing, masking, inpainting
  - VideoAgent     — video trimming, frame sampling, captioning
  - WorkflowAgent  — workflow parsing, conversion, ComfyUI export

Usage:
    python run_coordinated_system.py

Requires:
    Redis server running on localhost:6379
    Start with: redis-server vaultwares-agentciation/redis.conf
"""

import sys
import os
import time
import asyncio
import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from vaultwares_agentciation import LonelyManager
from agents.text_agent import TextAgent
from agents.image_agent import ImageAgent
from agents.video_agent import VideoAgent
from agents.workflow_agent import WorkflowAgent
from dispatcher.redis_dispatcher import RedisDispatcher


DEFAULT_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
COORDINATION_API_HOST = os.getenv("COORDINATION_API_HOST", "127.0.0.1")
COORDINATION_API_PORT = int(os.getenv("COORDINATION_API_PORT", "8765"))


class ConnectRequest(BaseModel):
    redis_url: str = Field(default=DEFAULT_REDIS_URL, min_length=1)


class TaskRequest(BaseModel):
    type: str = Field(min_length=1)
    description: str = ""
    details: dict[str, Any] = Field(default_factory=dict)
    target_agent_id: str | None = None
    agent_type: str | None = None
    required_skill: str | None = None


@dataclass
class AgentProfile:
    agent_id: str
    agent_type: str
    skills: list[str]


def parse_redis_endpoint(redis_url: str) -> tuple[str, int, int]:
    parsed = urlparse(redis_url)
    if parsed.scheme not in ("redis", "rediss"):
        raise ValueError("Only redis:// and rediss:// URLs are supported.")

    return (
        parsed.hostname or "localhost",
        parsed.port or 6379,
        int(parsed.path.lstrip("/") or 0),
    )


class CoordinationRuntime:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.dispatcher = RedisDispatcher(redis_url)
        self.agent_profiles: dict[str, AgentProfile] = {}
        self.dispatch_interval_seconds = 2

    async def register_agent(self, agent: Any):
        agent_type = getattr(agent, "AGENT_TYPE", "general")
        skills = list(getattr(agent, "SKILLS", []))
        self.agent_profiles[agent.agent_id] = AgentProfile(agent.agent_id, agent_type, skills)
        await self.dispatcher.set_agent_status(
            agent.agent_id,
            getattr(agent.status, "value", str(agent.status)),
            current_task=None,
            metadata={"agent_type": agent_type, "skills": skills},
        )

    async def snapshot(self):
        return await self.dispatcher.get_snapshot()

    async def test_redis(self, redis_url: str):
        probe = RedisDispatcher(redis_url)
        try:
            await probe.ping()
        finally:
            await probe.close()

        return {
            "connected": True,
            "redis_url": redis_url,
            "active_runtime_url": self.redis_url,
            "same_as_runtime": redis_url == self.redis_url,
        }

    async def enqueue_task(self, request: TaskRequest):
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        task_id = await self.dispatcher.enqueue_task(payload)
        return {"task_id": task_id, "queued": True}

    async def dispatch_once(self):
        agents = await self.dispatcher.get_all_agents()
        assignments = []
        for agent_id, profile in self.agent_profiles.items():
            status = agents.get(agent_id, {})
            state = status.get("state")
            current_task = status.get("current_task")

            if current_task or state not in ("WAITING_FOR_INPUT", "RELAXING", "UNKNOWN", None):
                continue

            task = await self.dispatcher.assign_next_task(
                agent_id,
                agent_type=profile.agent_type,
                skills=profile.skills,
            )
            if task:
                assignments.append(task)

        return assignments

    async def dispatch_loop(self):
        while True:
            try:
                assignments = await self.dispatch_once()
                for task in assignments:
                    print(f"Assigned task {task['id']} to {task['assigned_to']}")
            except Exception as error:
                print(f"Dispatcher loop error: {error}")

            await asyncio.sleep(self.dispatch_interval_seconds)

    async def message_observer_loop(self):
        pubsub = self.dispatcher.redis.pubsub()
        await pubsub.subscribe(self.dispatcher.channel, self.dispatcher.alert_channel)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue

                raw = message.get("data")
                try:
                    data = json.loads(raw)
                except (TypeError, json.JSONDecodeError):
                    data = {
                        "agent": "redis",
                        "action": "MESSAGE",
                        "task": str(message.get("channel")),
                        "details": {"raw": raw},
                    }

                if message.get("channel") == self.dispatcher.alert_channel:
                    data.setdefault("action", "ALERT")

                await self.dispatcher.process_message(data)
        finally:
            await pubsub.close()


runtime = CoordinationRuntime(DEFAULT_REDIS_URL)
app = FastAPI(title="VaultWares Coordination API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "https://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


REDIS_DASHBOARD_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redis Coordination Messages</title>
  <style>
    :root {
      color-scheme: light dark;
      --vault-base: #002B36;
      --vault-paper: #FDF6E3;
      --vault-slate: #4A5459;
      --vault-muted: #586E75;
      --vault-cyan: #21B8CC;
      --vault-gold: #CC9B21;
      --vault-green: #4ECC21;
      --vault-burgundy: #A63D40;
      --surface: Canvas;
      --text: CanvasText;
      --line: color-mix(in srgb, CanvasText 18%, transparent);
      font-family: "Segoe UI", Inter, system-ui, sans-serif;
      background: var(--surface);
      color: var(--text);
    }

    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    header {
      border-bottom: 1px solid var(--line);
      padding: 24px;
      background: color-mix(in srgb, var(--vault-paper) 50%, Canvas);
    }
    main { display: grid; gap: 16px; padding: 16px; }
    h1, h2 { margin: 0; font-weight: 600; }
    h1 { font-size: 28px; color: var(--vault-base); }
    h2 { font-size: 18px; }
    p { margin: 8px 0 0; color: var(--vault-muted); }
    .toolbar, .grid, .message-grid { display: grid; gap: 12px; }
    .toolbar { grid-template-columns: minmax(0, 1fr) auto auto; align-items: end; }
    .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .message-grid { grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr); }
    section {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      background: color-mix(in srgb, Canvas 94%, var(--vault-paper));
    }
    label { display: grid; gap: 6px; font-size: 13px; color: var(--vault-muted); }
    input, select, textarea, button {
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      font: inherit;
      background: Canvas;
      color: CanvasText;
    }
    textarea { min-height: 96px; resize: vertical; font-family: Consolas, "Cascadia Mono", monospace; }
    button {
      cursor: pointer;
      font-weight: 600;
      color: var(--vault-base);
      background: color-mix(in srgb, var(--vault-cyan) 24%, Canvas);
      border-color: color-mix(in srgb, var(--vault-cyan) 60%, CanvasText);
    }
    button.secondary { background: Canvas; color: CanvasText; }
    .status-line { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      color: var(--vault-muted);
      background: Canvas;
    }
    .ok { color: color-mix(in srgb, var(--vault-green) 70%, CanvasText); }
    .warn { color: color-mix(in srgb, var(--vault-burgundy) 78%, CanvasText); }
    .list { display: grid; gap: 8px; margin-top: 12px; max-height: 62vh; overflow: auto; }
    .item {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: Canvas;
    }
    .item-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .name { font-weight: 700; color: var(--vault-base); }
    .muted { color: var(--vault-muted); font-size: 12px; }
    pre {
      margin: 8px 0 0;
      padding: 8px;
      border-radius: 6px;
      overflow: auto;
      max-height: 180px;
      background: color-mix(in srgb, var(--vault-slate) 12%, Canvas);
      font-size: 12px;
      line-height: 1.45;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }
    th { color: var(--vault-muted); font-weight: 600; }
    @media (max-width: 960px) {
      .toolbar, .grid, .message-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Redis Coordination Messages</h1>
    <p>Live view of Redis pub/sub traffic, agent status, queued work, and task results.</p>
    <div class="status-line">
      <span class="pill">Redis: <strong id="redis-url">loading</strong></span>
      <span class="pill">Refresh: <strong id="refresh-state">on</strong></span>
      <span class="pill">Last update: <strong id="last-update">never</strong></span>
    </div>
  </header>

  <main>
    <section>
      <div class="toolbar">
        <label>
          Message filter
          <input id="filter" placeholder="agent, action, task, target, text..." />
        </label>
        <button id="refresh">Refresh</button>
        <button class="secondary" id="toggle-refresh">Pause</button>
      </div>
    </section>

    <div class="grid">
      <section>
        <h2>Agents</h2>
        <div class="list" id="agents"></div>
      </section>

      <section>
        <h2>Tasks</h2>
        <div class="list" id="tasks"></div>
      </section>

      <section>
        <h2>Queue Test Task</h2>
        <label>
          Target agent
          <select id="target">
            <option value="text-agent">text-agent</option>
            <option value="image-agent">image-agent</option>
            <option value="video-agent">video-agent</option>
            <option value="workflow-agent">workflow-agent</option>
          </select>
        </label>
        <label>
          Task type
          <input id="task-type" value="generate_text" />
        </label>
        <label>
          Details JSON
          <textarea id="details">{"prompt":"Redis dashboard test","style":"plain"}</textarea>
        </label>
        <button id="send-task">Queue and dispatch</button>
        <p id="task-result" class="muted"></p>
      </section>
    </div>

    <div class="message-grid">
      <section>
        <h2>Redis Messages</h2>
        <div class="list" id="messages"></div>
      </section>

      <section>
        <h2>Raw Snapshot</h2>
        <pre id="raw">{}</pre>
      </section>
    </div>
  </main>

  <script>
    const state = { snapshot: null, refresh: true, timer: null };
    const els = {
      redisUrl: document.querySelector("#redis-url"),
      refreshState: document.querySelector("#refresh-state"),
      lastUpdate: document.querySelector("#last-update"),
      agents: document.querySelector("#agents"),
      tasks: document.querySelector("#tasks"),
      messages: document.querySelector("#messages"),
      raw: document.querySelector("#raw"),
      filter: document.querySelector("#filter"),
      refresh: document.querySelector("#refresh"),
      toggleRefresh: document.querySelector("#toggle-refresh"),
      target: document.querySelector("#target"),
      taskType: document.querySelector("#task-type"),
      details: document.querySelector("#details"),
      sendTask: document.querySelector("#send-task"),
      taskResult: document.querySelector("#task-result"),
    };

    function text(value) {
      if (value === null || value === undefined) return "";
      return String(value);
    }

    function formatTime(value) {
      if (!value) return "not reported";
      const parsed = new Date(value);
      return Number.isNaN(parsed.valueOf()) ? text(value) : parsed.toLocaleTimeString();
    }

    function matchesFilter(item, filter) {
      if (!filter) return true;
      return JSON.stringify(item).toLowerCase().includes(filter.toLowerCase());
    }

    function renderItem(head, meta, details, extraClass = "") {
      return `<div class="item ${extraClass}">
        <div class="item-head">
          <span class="name">${head}</span>
          <span class="muted">${meta}</span>
        </div>
        ${details ? `<pre>${details}</pre>` : ""}
      </div>`;
    }

    function render() {
      const snapshot = state.snapshot || {};
      const agents = Object.entries(snapshot.agents || {});
      const tasks = snapshot.tasks || [];
      const messages = snapshot.messages || [];
      const filter = els.filter.value.trim();

      els.redisUrl.textContent = snapshot.redis_url || "not connected";
      els.refreshState.textContent = state.refresh ? "on" : "paused";
      els.lastUpdate.textContent = new Date().toLocaleTimeString();
      els.raw.textContent = JSON.stringify(snapshot, null, 2);

      els.agents.innerHTML = agents.length
        ? agents.map(([id, status]) => renderItem(
            id,
            status.state || "UNKNOWN",
            `last_updated: ${formatTime(status.last_updated)}\\ncurrent_task: ${status.current_task ? status.current_task.id : "none"}\\nmetadata: ${JSON.stringify(status.metadata || {}, null, 2)}`,
            status.state === "WAITING_FOR_INPUT" ? "ok" : "",
          )).join("")
        : `<p class="muted">No agents reported.</p>`;

      els.tasks.innerHTML = tasks.length
        ? tasks.slice(0, 50).map((task) => renderItem(
            task.type || "task",
            `${task.status || "unknown"} ${task.assigned_to ? "-> " + task.assigned_to : ""}`,
            JSON.stringify(task, null, 2),
          )).join("")
        : `<p class="muted">No tasks recorded.</p>`;

      const visibleMessages = messages.filter((message) => matchesFilter(message, filter));
      els.messages.innerHTML = visibleMessages.length
        ? visibleMessages.slice(0, 120).map((message) => renderItem(
            `${message.agent || "unknown"} / ${message.action || "MESSAGE"}`,
            `${formatTime(message.timestamp)} ${message.target ? "-> " + message.target : ""}`,
            JSON.stringify(message, null, 2),
          )).join("")
        : `<p class="muted">No matching Redis messages.</p>`;
    }

    async function loadSnapshot() {
      const response = await fetch("/api/coordination/snapshot", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Snapshot failed: ${response.status}`);
      }
      state.snapshot = await response.json();
      render();
    }

    async function sendTask() {
      let details;
      try {
        details = JSON.parse(els.details.value || "{}");
      } catch (error) {
        els.taskResult.textContent = `Invalid JSON: ${error.message}`;
        return;
      }

      const payload = {
        type: els.taskType.value.trim() || "generate_text",
        description: "Queued from Redis dashboard",
        target_agent_id: els.target.value,
        details,
      };

      const response = await fetch("/api/coordination/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      els.taskResult.textContent = response.ok
        ? `Queued ${result.task_id}`
        : `Failed: ${JSON.stringify(result)}`;
      await loadSnapshot();
    }

    function startTimer() {
      if (state.timer) window.clearInterval(state.timer);
      state.timer = window.setInterval(() => {
        if (state.refresh) {
          loadSnapshot().catch((error) => {
            els.lastUpdate.textContent = error.message;
          });
        }
      }, 2000);
    }

    els.refresh.addEventListener("click", () => loadSnapshot());
    els.filter.addEventListener("input", render);
    els.sendTask.addEventListener("click", () => sendTask());
    els.toggleRefresh.addEventListener("click", () => {
      state.refresh = !state.refresh;
      els.toggleRefresh.textContent = state.refresh ? "Pause" : "Resume";
      render();
    });

    loadSnapshot();
    startTimer();
  </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
async def dashboard_root():
    return HTMLResponse(REDIS_DASHBOARD_HTML)


@app.get("/redis", response_class=HTMLResponse)
async def redis_dashboard():
    return HTMLResponse(REDIS_DASHBOARD_HTML)


@app.get("/messages", response_class=HTMLResponse)
async def message_dashboard():
    return HTMLResponse(REDIS_DASHBOARD_HTML)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


@app.get("/health")
async def health():
    try:
        await runtime.dispatcher.ping()
    except Exception as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {"status": "ok", "redis_url": runtime.redis_url}


@app.post("/api/coordination/connect")
async def connect(request: ConnectRequest):
    try:
        return await runtime.test_redis(request.redis_url)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/coordination/snapshot")
async def snapshot():
    return await runtime.snapshot()


@app.post("/api/coordination/tasks")
async def create_task(request: TaskRequest):
    return await runtime.enqueue_task(request)


@app.post("/api/coordination/dispatch")
async def dispatch_now():
    assignments = await runtime.dispatch_once()
    return {"assigned": assignments, "count": len(assignments)}


async def run_api_server():
    config = uvicorn.Config(
        app,
        host=COORDINATION_API_HOST,
        port=COORDINATION_API_PORT,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    await server.serve()


def alert_callback(alert: dict):
    print(f"\n[SYSTEM ALERT] {alert['message']}")


async def main():
    print("=" * 60)
    print("  VaultWares Multi-Agent Coordination System")
    print("=" * 60)
    print()

    redis_host, redis_port, redis_db = parse_redis_endpoint(DEFAULT_REDIS_URL)
    api_task = asyncio.create_task(run_api_server())
    print(f"Coordination API: http://{COORDINATION_API_HOST}:{COORDINATION_API_PORT}")
    print(f"Redis: {DEFAULT_REDIS_URL}")
    print()

    # ----------------------------------------------------------------
    # Start the Lonely Manager (monitors heartbeats, dispatches tasks)
    # ----------------------------------------------------------------
    manager = LonelyManager(
        agent_id="lonely_manager",
        redis_host=redis_host,
        redis_port=redis_port,
        redis_db=redis_db,
        alert_callback=alert_callback,
        todo_path="TODO.md",
        roadmap_path="ROADMAP.md",
    )
    manager.start()
    print(f"[OK] Manager '{manager.agent_id}' started.")

    # ----------------------------------------------------------------
    # Start the specialized worker agents
    # ----------------------------------------------------------------
    text_agent = TextAgent(agent_id="text-agent", redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)
    image_agent = ImageAgent(agent_id="image-agent", redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)
    video_agent = VideoAgent(agent_id="video-agent", redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)
    workflow_agent = WorkflowAgent(agent_id="workflow-agent", redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)

    try:
        for agent in (text_agent, image_agent, video_agent, workflow_agent):
            agent.start()
            agent.send_heartbeat()  # Initial heartbeat to register with manager
            await runtime.register_agent(agent)
            print(f"[OK] Agent '{agent.agent_id}' started.")
    except Exception as e:
        print(f"[ERROR] Error starting agent: {e}")

    observer_task = asyncio.create_task(runtime.message_observer_loop())
    dispatcher_task = asyncio.create_task(runtime.dispatch_loop())

    print()
    print("--- Agents are running. Redis heartbeat active. ---")
    print("--- Press Ctrl+C to stop all agents. ---")
    print()

    # ----------------------------------------------------------------
    # Main monitoring loop
    # ----------------------------------------------------------------
    try:
        while True:
            print(f"\n[{time.strftime('%H:%M:%S')}] System heartbeat - agents active:")
            for agent in (text_agent, image_agent, video_agent, workflow_agent):
                print(f"  - {agent.agent_id}: {agent.status.value}")
            print(f"\n{manager.get_project_status_report()}")
            await asyncio.sleep(5)

    except KeyboardInterrupt:
        print("\n\n--- Shutting down all agents ---")
        api_task.cancel()
        observer_task.cancel()
        dispatcher_task.cancel()
        for agent in (text_agent, image_agent, video_agent, workflow_agent):
            agent.stop()
            print(f"  Stopped: {agent.agent_id}")
        manager.stop()
        print("  Stopped: lonely manager")
        await runtime.dispatcher.close()
        print("\nSystem shutdown complete.")

if __name__ == "__main__":
    asyncio.run(main())
