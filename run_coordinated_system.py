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
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
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


class TasksFileDispatchRequest(BaseModel):
    path: str = "TASKS.md"
    repo_path: str | None = None
    repo_url: str | None = None
    base_branch: str = "main"
    branch_name: str | None = None
    create_branch: bool = True
    create_pr: bool = True
    include_subtasks: bool = False
    limit: int = Field(default=1, ge=1, le=50)
    dispatch_now: bool = True


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


TASK_LINE_RE = re.compile(r"^\s*(?P<ref>\d+[a-z]?)\s+\[(?P<status>[ xX~])\]\s+(?P<title>.+?)\s*$")


def slugify_branch_part(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-").lower()
    return slug or "tasks"


def run_git(repo_path: Path, args: list[str], timeout: int = 30) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo_path), *args],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def resolve_repo_path(repo_path: str | None, repo_url: str | None = None) -> Path:
    if repo_path:
        resolved = Path(repo_path).expanduser().resolve()
    elif repo_url:
        repo_slug = slugify_branch_part(Path(urlparse(repo_url).path).stem or "repo")
        resolved = (Path.cwd() / ".omx" / "dispatch-repos" / repo_slug).resolve()
    else:
        resolved = Path.cwd().resolve()

    if repo_url and not resolved.exists():
        resolved.parent.mkdir(parents=True, exist_ok=True)
        clone = subprocess.run(
            ["git", "clone", repo_url, str(resolved)],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if clone.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {clone.stderr.strip() or clone.stdout.strip()}")

    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Repository path not found: {resolved}")

    return resolved


def prepare_dispatch_branch(repo_path: Path, branch_name: str | None, base_branch: str, create_branch: bool) -> dict[str, Any]:
    current = run_git(repo_path, ["branch", "--show-current"])
    current_branch = current.stdout.strip() if current.returncode == 0 else ""
    branch = branch_name or f"dispatch/tasks-md-{int(time.time())}"

    result: dict[str, Any] = {
        "requested": create_branch,
        "branch": branch,
        "base_branch": base_branch,
        "previous_branch": current_branch,
        "created": False,
        "checked_out": False,
        "warning": None,
    }

    if not create_branch:
        return result

    inside_work_tree = run_git(repo_path, ["rev-parse", "--is-inside-work-tree"])
    if inside_work_tree.returncode != 0 or inside_work_tree.stdout.strip() != "true":
        result["warning"] = "Repository path is not a git work tree."
        return result

    if current_branch == branch:
        result["checked_out"] = True
        return result

    dirty = run_git(repo_path, ["status", "--porcelain"])
    if dirty.returncode != 0:
        result["warning"] = dirty.stderr.strip() or "Could not inspect git status."
        return result

    existing = run_git(repo_path, ["rev-parse", "--verify", branch])
    if existing.returncode != 0:
        created = run_git(repo_path, ["branch", branch])
        result["created"] = created.returncode == 0
        if created.returncode != 0:
            result["warning"] = created.stderr.strip() or created.stdout.strip()
            return result

    if dirty.stdout.strip():
        result["warning"] = "Branch exists but was not checked out because the work tree has uncommitted changes."
        return result

    switched = run_git(repo_path, ["switch", branch])
    result["checked_out"] = switched.returncode == 0
    if switched.returncode != 0:
        result["warning"] = switched.stderr.strip() or switched.stdout.strip()

    return result


def resolve_project_file(path: str, repo_path: Path | None = None) -> Path:
    root = (repo_path or Path.cwd()).resolve()
    resolved = (root / path).resolve()
    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Task file not found: {path}")

    return resolved


def parse_tasks_file(path: Path) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        match = TASK_LINE_RE.match(line)
        if not match:
            continue

        ref = match.group("ref")
        status = match.group("status")
        tasks.append(
            {
                "ref": ref,
                "title": match.group("title").strip(),
                "status": "finished" if status.lower() == "x" else "in_progress" if status == "~" else "free",
                "is_subtask": not ref.isdigit(),
                "line_number": line_number,
            }
        )

    return tasks


def update_tasks_file_status(path: Path, task_ref: str, marker: str) -> bool:
    content = path.read_text(encoding="utf-8")
    pattern = rf"(?m)^(\s*{re.escape(task_ref)}\s+\[)[ xX~](\]\s+.+)$"
    updated, count = re.subn(pattern, lambda match: f"{match.group(1)}{marker}{match.group(2)}", content, count=1)
    if not count:
        return False

    path.write_text(updated, encoding="utf-8")
    return True


def create_pull_request(repo_path: Path, branch_name: str, base_branch: str, title: str, body: str) -> dict[str, Any]:
    gh = subprocess.run(
        ["gh", "pr", "create", "--base", base_branch, "--head", branch_name, "--title", title, "--body", body],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    return {
        "created": gh.returncode == 0,
        "url": gh.stdout.strip() if gh.returncode == 0 else None,
        "warning": None if gh.returncode == 0 else (gh.stderr.strip() or gh.stdout.strip() or "gh pr create failed"),
    }


def commit_and_push_dispatch_run(repo_path: Path, branch_name: str, paths: list[str], message: str) -> dict[str, Any]:
    current = run_git(repo_path, ["branch", "--show-current"])
    current_branch = current.stdout.strip() if current.returncode == 0 else ""
    if current_branch != branch_name:
        return {
            "committed": False,
            "pushed": False,
            "warning": f"Refusing to commit from branch '{current_branch}'. Expected dispatch branch '{branch_name}'.",
        }

    unique_paths = sorted({path for path in paths if path})
    if not unique_paths:
        return {"committed": False, "pushed": False, "warning": "No changed files were reported for this dispatch run."}

    added = run_git(repo_path, ["add", "--", *unique_paths])
    if added.returncode != 0:
        return {"committed": False, "pushed": False, "warning": added.stderr.strip() or added.stdout.strip()}

    diff = run_git(repo_path, ["diff", "--cached", "--quiet"])
    if diff.returncode == 0:
        return {"committed": False, "pushed": False, "warning": "No staged changes to commit."}

    committed = run_git(repo_path, ["commit", "-m", message], timeout=60)
    if committed.returncode != 0:
        return {"committed": False, "pushed": False, "warning": committed.stderr.strip() or committed.stdout.strip()}

    pushed = run_git(repo_path, ["push", "-u", "origin", branch_name], timeout=120)
    return {
        "committed": True,
        "pushed": pushed.returncode == 0,
        "commit_output": committed.stdout.strip(),
        "warning": None if pushed.returncode == 0 else (pushed.stderr.strip() or pushed.stdout.strip()),
    }


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

    async def enqueue_tasks_from_file(self, request: TasksFileDispatchRequest):
        repo_path = resolve_repo_path(request.repo_path, request.repo_url)
        dispatch_run_id = f"tasks-md-{int(time.time())}"
        branch = request.branch_name or f"dispatch/tasks-md-{int(time.time())}"
        branch_status = prepare_dispatch_branch(repo_path, branch, request.base_branch, request.create_branch)
        if request.create_branch and not branch_status.get("checked_out"):
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Dispatch branch was not checked out, so TASKS.md was not modified.",
                    "branch": branch_status,
                },
            )

        task_file = resolve_project_file(request.path, repo_path)
        parsed_tasks = parse_tasks_file(task_file)
        pending_tasks = [
            task
            for task in parsed_tasks
            if task["status"] == "free" and (request.include_subtasks or not task["is_subtask"])
        ]

        existing_refs = {
            (task.get("details") or {}).get("tasks_md_ref")
            for task in await self.dispatcher.get_tasks()
            if (task.get("details") or {}).get("source") == task_file.name
        }

        queued = []
        skipped_duplicates = []
        for task in pending_tasks:
            if task["ref"] in existing_refs:
                skipped_duplicates.append(task)
                continue

            update_tasks_file_status(task_file, task["ref"], "~")
            payload = {
                "type": "project_task",
                "description": task["title"],
                "details": {
                    "source": task_file.name,
                    "repo_path": str(repo_path),
                    "task_file_path": str(task_file),
                    "task_file_relative_path": str(task_file.relative_to(repo_path)),
                    "tasks_md_ref": task["ref"],
                    "line_number": task["line_number"],
                    "title": task["title"],
                    "dispatch_run_id": dispatch_run_id,
                    "branch_name": branch_status["branch"],
                    "base_branch": request.base_branch,
                    "pr_requested": request.create_pr,
                    "dispatch_note": "Read from TASKS.md via Redis dashboard.",
                },
            }
            queued.append({**task, "task_id": await self.dispatcher.enqueue_task(payload)})
            existing_refs.add(task["ref"])

            if len(queued) >= request.limit:
                break

        assignments = await self.dispatch_once() if request.dispatch_now else []
        return {
            "source": str(task_file),
            "repo_path": str(repo_path),
            "dispatch_run_id": dispatch_run_id,
            "branch": branch_status,
            "available": len(pending_tasks),
            "queued": queued,
            "queued_count": len(queued),
            "skipped_duplicates": skipped_duplicates[: request.limit],
            "skipped_duplicate_count": len(skipped_duplicates),
            "assigned": assignments,
            "assigned_count": len(assignments),
        }

    async def finalize_task_lifecycle(self, data: dict[str, Any]):
        details = data.get("details") or {}
        task_id = details.get("task_id")
        if not task_id:
            return

        tasks = await self.dispatcher.get_tasks()
        task = next((candidate for candidate in tasks if candidate.get("id") == task_id), None)
        if not task:
            return

        task_details = task.get("details") or {}
        task_file_path = task_details.get("task_file_path")
        task_ref = task_details.get("tasks_md_ref")
        if task_file_path and task_ref:
            update_tasks_file_status(Path(task_file_path), task_ref, "x")

        dispatch_run_id = task_details.get("dispatch_run_id")
        if not dispatch_run_id:
            return

        run_tasks = [
            candidate
            for candidate in tasks
            if (candidate.get("details") or {}).get("dispatch_run_id") == dispatch_run_id
        ]
        if not run_tasks or any(candidate.get("status") != "completed" for candidate in run_tasks):
            return

        pr_requested = any((candidate.get("details") or {}).get("pr_requested") for candidate in run_tasks)
        if not pr_requested:
            return

        pr_marker_key = f"dispatch_run:{dispatch_run_id}:pr"
        if await self.dispatcher.redis.get(pr_marker_key):
            return

        await self.dispatcher.redis.set(pr_marker_key, "attempted")
        repo_path = Path(task_details.get("repo_path") or Path.cwd())
        branch_name = task_details.get("branch_name") or ""
        base_branch = task_details.get("base_branch") or "main"
        title = f"Complete TASKS.md dispatch run {dispatch_run_id}"
        body = "\n".join(
            [
                "Automated dispatcher run completed these TASKS.md items:",
                "",
                *[
                    f"- {(candidate.get('details') or {}).get('tasks_md_ref')}: {candidate.get('description')}"
                    for candidate in run_tasks
                ],
            ]
        )
        changed_files = {
            (candidate.get("details") or {}).get("task_file_relative_path")
            for candidate in run_tasks
        }
        for candidate in run_tasks:
            result_details = candidate.get("result_details") or {}
            changed_files.update(result_details.get("changed_files") or [])

        commit_result = commit_and_push_dispatch_run(
            repo_path,
            branch_name,
            [path for path in changed_files if path],
            title,
        )
        if not commit_result.get("committed") or not commit_result.get("pushed"):
            await self.dispatcher.log_task_event(
                task_id,
                "pull_request_blocked",
                {"dispatch_run_id": dispatch_run_id, **commit_result},
            )
            return

        pr_result = create_pull_request(repo_path, branch_name, base_branch, title, body)
        await self.dispatcher.log_task_event(
            task_id,
            "pull_request_attempted",
            {"dispatch_run_id": dispatch_run_id, "commit": commit_result, **pr_result},
        )

    async def dispatch_once(self):
        agents = await self.dispatcher.get_all_agents()
        assignments = []
        for agent_id, profile in self.agent_profiles.items():
            status = agents.get(agent_id, {})
            state = status.get("state")
            current_task = status.get("current_task")

            if current_task or state != "RELAXING":
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
                if data.get("action") == "RESULT":
                    await self.finalize_task_lifecycle(data)
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
        <h2>TASKS.md Dispatcher</h2>
        <label>
          Items to queue
          <input id="tasks-md-limit" type="number" min="1" max="50" value="1" />
        </label>
        <label>
          Task scope
          <select id="tasks-md-scope">
            <option value="main">Main tasks only</option>
            <option value="all">Main tasks and subtasks</option>
          </select>
        </label>
        <button id="dispatch-tasks-md">Read TASKS.md and Dispatch</button>
        <p id="tasks-md-result" class="muted"></p>
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
      tasksMdLimit: document.querySelector("#tasks-md-limit"),
      tasksMdScope: document.querySelector("#tasks-md-scope"),
      dispatchTasksMd: document.querySelector("#dispatch-tasks-md"),
      tasksMdResult: document.querySelector("#tasks-md-result"),
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
            status.state === "RELAXING" ? "ok" : "",
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

    async function dispatchTasksMd() {
      const limit = Math.max(1, Math.min(50, Number.parseInt(els.tasksMdLimit.value || "1", 10)));
      els.tasksMdResult.textContent = "Reading TASKS.md...";
      const response = await fetch("/api/coordination/tasks/from-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "TASKS.md",
          include_subtasks: els.tasksMdScope.value === "all",
          limit,
          dispatch_now: true,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        const refs = (result.queued || []).map((task) => task.ref).join(", ") || "none";
        const branch = result.branch && result.branch.branch ? ` branch ${result.branch.branch};` : "";
        els.tasksMdResult.textContent =
          `Queued ${result.queued_count} (${refs}); assigned ${result.assigned_count};${branch} skipped duplicates ${result.skipped_duplicate_count}.`;
      } else {
        els.tasksMdResult.textContent = `Failed: ${JSON.stringify(result)}`;
      }
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
    els.dispatchTasksMd.addEventListener("click", () => dispatchTasksMd());
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


@app.post("/api/coordination/tasks/from-file")
async def create_tasks_from_file(request: TasksFileDispatchRequest):
    return await runtime.enqueue_tasks_from_file(request)


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
