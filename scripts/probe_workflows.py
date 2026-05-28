"""
Submit each seeded workflow's graph directly to ComfyUI's /prompt endpoint
(without going through pipelines' worker) and print whether ComfyUI's
validator accepts it. This isolates "is the graph well-formed?" from "does
it actually generate?".

ComfyUI's /prompt validates synchronously — returns 400 with a per-node
errors dict if any node is unknown or has a missing-file / wrong-type input.
That's the fastest way to see what's truly broken.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error

PIPELINES = "http://127.0.0.1:9001"
COMFYUI = "http://127.0.0.1:8188"


def _http(method, url, *, body=None, headers=None, timeout=30):
    data = None
    hdrs = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def login() -> str:
    code, body = _http(
        "POST", f"{PIPELINES}/auth/login",
        body={"username": "admin", "password": "FuckyouPipelines123!"},
    )
    if code != 200:
        raise SystemExit(f"login failed: {body[:200]}")
    return json.loads(body)["access_token"]


def list_workflows(token: str) -> list[dict]:
    code, body = _http(
        "GET", f"{PIPELINES}/workflows",
        headers={"Authorization": f"Bearer {token}"},
    )
    if code != 200:
        raise SystemExit(f"list failed: {body[:200]}")
    return json.loads(body)


def probe(wf: dict) -> tuple[str, str]:
    """Returns (status, detail). status in {OK, NODE_VALIDATION, OTHER}."""
    steps = wf.get("steps") or []
    step = next((s for s in steps if isinstance(s, dict) and s.get("kind") == "comfyui_graph"), None)
    if not step:
        return "OTHER", "no comfyui_graph step"
    graph = step.get("graph") or {}
    if not graph:
        return "OTHER", "empty graph"

    # Submit (we expect /prompt to either validate-and-queue or 400 with detail)
    code, body = _http(
        "POST", f"{COMFYUI}/prompt",
        body={"prompt": graph, "client_id": "vault-flows-probe"},
        timeout=30,
    )
    if code == 200:
        # Accepted! We don't wait for completion in this probe.
        try:
            pid = json.loads(body).get("prompt_id")
        except Exception:
            pid = "?"
        return "OK", f"validated, prompt_id={pid}"
    # Try to parse the structured error
    try:
        err = json.loads(body)
        # ComfyUI returns: {"error": {...}, "node_errors": {...}}
        node_errors = err.get("node_errors", {})
        if node_errors:
            issues = []
            for nid, info in list(node_errors.items())[:6]:
                errs = info.get("errors") or [{"message": "?"}]
                msg = errs[0].get("message") if errs else "?"
                ctype = info.get("class_type") or "?"
                issues.append(f"node {nid} ({ctype}): {msg}")
            return "NODE_VALIDATION", "; ".join(issues)
        top = err.get("error", {})
        if isinstance(top, dict):
            return "OTHER", f"{top.get('type','?')}: {top.get('message','?')}"
    except Exception:
        pass
    return "OTHER", f"HTTP {code}: {body[:200]}"


def main():
    token = login()
    workflows = list_workflows(token)
    print(f"Probing {len(workflows)} workflows against ComfyUI /prompt\n")
    width = max(len(w["id"]) for w in workflows)
    ok_count = 0
    for w in sorted(workflows, key=lambda x: x["id"]):
        status, detail = probe(w)
        # Truncate detail
        detail_trim = detail if len(detail) < 240 else detail[:240] + " ..."
        marker = "[OK ]" if status == "OK" else f"[{status[:3]}]"
        print(f"  {marker}  {w['id'].ljust(width)}  {detail_trim}")
        if status == "OK":
            ok_count += 1
    print(f"\n--> {ok_count}/{len(workflows)} workflows validate cleanly")


if __name__ == "__main__":
    main()
