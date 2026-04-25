import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Optional

import redis.asyncio as redis

class RedisDispatcher:
    def __init__(self, redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")):
        self.redis_url = redis_url
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.task_queue = "vault_tasks"
        self.agent_status_key = "agent_status"
        self.task_history_key = "task_history"
        self.task_index_key = "task_index"
        self.message_log_key = "coordination_messages"
        self.channel = "tasks"
        self.alert_channel = "alerts"
        self.max_messages = 250

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _normalize_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {
            "id": task.get("id") or str(uuid.uuid4()),
            "type": task.get("type") or task.get("task") or "unknown_task",
            "description": task.get("description") or "",
            "details": task.get("details") or {},
            "target_agent_id": task.get("target_agent_id") or task.get("target"),
            "agent_type": task.get("agent_type"),
            "required_skill": task.get("required_skill"),
            "status": task.get("status") or "queued",
            "created_at": task.get("created_at") or self._now(),
        }

        for key, value in task.items():
            normalized.setdefault(key, value)

        return normalized

    async def enqueue_task(self, task: Dict[str, Any]) -> str:
        normalized = self._normalize_task(task)
        await self.redis.rpush(self.task_queue, json.dumps(normalized))
        await self.redis.hset(self.task_index_key, normalized["id"], json.dumps(normalized))
        await self.log_task_event(normalized["id"], "enqueued", normalized)
        return normalized["id"]

    def _task_matches_agent(
        self,
        task: Dict[str, Any],
        agent_id: str,
        agent_type: Optional[str] = None,
        skills: Optional[Iterable[str]] = None,
    ) -> bool:
        if task.get("target_agent_id") and task["target_agent_id"] != agent_id:
            return False

        if task.get("agent_type") and agent_type and task["agent_type"] != agent_type:
            return False

        required_skill = task.get("required_skill")
        if required_skill and skills is not None and required_skill not in set(skills):
            return False

        return True

    async def get_next_task(
        self,
        agent_id: str,
        agent_type: Optional[str] = None,
        skills: Optional[Iterable[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        queued_items = await self.redis.lrange(self.task_queue, 0, -1)
        for task_json in queued_items:
            try:
                task = json.loads(task_json)
            except json.JSONDecodeError:
                await self.redis.lrem(self.task_queue, 1, task_json)
                continue

            if not self._task_matches_agent(task, agent_id, agent_type, skills):
                continue

            removed = await self.redis.lrem(self.task_queue, 1, task_json)
            if not removed:
                continue

            task["status"] = "assigned"
            task["assigned_to"] = agent_id
            task["assigned_at"] = self._now()
            await self.redis.hset(self.task_index_key, task["id"], json.dumps(task))
            await self.set_agent_status(agent_id, "WORKING", current_task=task)
            await self.log_task_event(task["id"], "assigned", task)
            return task

        return None

    async def assign_next_task(
        self,
        agent_id: str,
        agent_type: Optional[str] = None,
        skills: Optional[Iterable[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        task = await self.get_next_task(agent_id, agent_type, skills)
        if not task:
            return None

        details = {
            **(task.get("details") or {}),
            "task_id": task["id"],
            "description": task.get("description", ""),
        }
        message = {
            "agent": "redis_dispatcher",
            "action": "ASSIGN",
            "task": task["type"],
            "target": agent_id,
            "details": details,
        }
        await self.redis.publish(self.channel, json.dumps(message))
        await self.log_message(message)
        await self.log_task_event(task["id"], "dispatched", message)
        return task

    async def set_agent_status(
        self,
        agent_id: str,
        state: str,
        current_task: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        status = {
            "agent_id": agent_id,
            "state": state,
            "last_updated": self._now(),
            "current_task": current_task,
            "metadata": metadata or {},
        }
        await self.redis.hset(self.agent_status_key, agent_id, json.dumps(status))

    async def log_task_event(self, task_id: str, event: str, data: Dict):
        entry = {"timestamp": self._now(), "event": event, "data": data}
        await self.redis.rpush(f"{self.task_history_key}:{task_id}", json.dumps(entry))
        await self.redis.ltrim(f"{self.task_history_key}:{task_id}", -100, -1)

    async def log_message(self, data: Dict[str, Any]):
        entry = {
            "timestamp": self._now(),
            "agent": data.get("agent"),
            "action": data.get("action"),
            "task": data.get("task"),
            "target": data.get("target"),
            "details": data.get("details") or {},
        }
        await self.redis.lpush(self.message_log_key, json.dumps(entry))
        await self.redis.ltrim(self.message_log_key, 0, self.max_messages - 1)

    async def process_message(self, data: Dict[str, Any]):
        await self.log_message(data)
        agent_id = data.get("agent")
        action = data.get("action")
        details = data.get("details") or {}

        if not agent_id:
            return

        if action == "HEARTBEAT":
            await self.merge_agent_status(agent_id, details.get("status") or "UNKNOWN")
        elif action in ("STATUS", "STATUS_UPDATE"):
            await self.merge_agent_status(agent_id, details.get("status") or "UNKNOWN")
        elif action == "JOIN":
            await self.merge_agent_status(agent_id, details.get("status") or "WAITING_FOR_INPUT")
        elif action == "LEAVE":
            await self.merge_agent_status(agent_id, "OFFLINE")
        elif action == "RESULT":
            await self.record_result(agent_id, data.get("task"), details)

    async def merge_agent_status(self, agent_id: str, state: str):
        current = (await self.get_all_agents()).get(agent_id, {})
        await self.set_agent_status(
            agent_id,
            state,
            current_task=current.get("current_task"),
            metadata=current.get("metadata") or {},
        )

    async def record_result(self, agent_id: str, task_type: Optional[str], details: Dict[str, Any]):
        status = (await self.get_all_agents()).get(agent_id)
        current_task = status.get("current_task") if status else None
        task_id = details.get("task_id") or (current_task.get("id") if current_task else None)

        if task_id:
            updated = {
                **(current_task or {}),
                "status": "completed",
                "completed_at": self._now(),
                "result": details.get("result"),
            }
            await self.redis.hset(self.task_index_key, task_id, json.dumps(updated))
            await self.log_task_event(task_id, "completed", {"agent_id": agent_id, "task": task_type, "details": details})

        await self.set_agent_status(
            agent_id,
            "WAITING_FOR_INPUT",
            current_task=None,
            metadata=status.get("metadata") if status else {},
        )

    async def get_all_agents(self) -> Dict:
        statuses = await self.redis.hgetall(self.agent_status_key)
        return {k: json.loads(v) for k, v in statuses.items()}

    async def get_queued_tasks(self) -> list[Dict[str, Any]]:
        tasks = []
        for task_json in await self.redis.lrange(self.task_queue, 0, -1):
            try:
                tasks.append(json.loads(task_json))
            except json.JSONDecodeError:
                continue
        return tasks

    async def get_recent_messages(self, limit: int = 100) -> list[Dict[str, Any]]:
        messages = []
        for raw in await self.redis.lrange(self.message_log_key, 0, max(0, limit - 1)):
            try:
                messages.append(json.loads(raw))
            except json.JSONDecodeError:
                continue
        return messages

    async def get_tasks(self) -> list[Dict[str, Any]]:
        raw_tasks = await self.redis.hgetall(self.task_index_key)
        tasks = []
        for raw in raw_tasks.values():
            try:
                tasks.append(json.loads(raw))
            except json.JSONDecodeError:
                continue
        return sorted(tasks, key=lambda item: item.get("created_at", ""), reverse=True)

    async def get_snapshot(self) -> Dict[str, Any]:
        return {
            "redis_url": self.redis_url,
            "agents": await self.get_all_agents(),
            "queued_tasks": await self.get_queued_tasks(),
            "tasks": await self.get_tasks(),
            "messages": await self.get_recent_messages(),
        }

    async def ping(self) -> bool:
        return bool(await self.redis.ping())

    async def close(self):

        await self.redis.aclose()
