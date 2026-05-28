"""
Produce a per-workflow diagnostic markdown file with a checklist of exactly
what to fix in each Proven_Workflow. Output goes to:
    vault-flows/scripts/proven_workflows_diagnostic.md

For each seeded workflow we report:
  - ComfyUI /prompt validation status
  - Node-by-node breakdown: class_type, whether each required input is wired,
    any model filename that isn't on disk
  - Unknown node types (with a hint about probable cause)
  - Concrete suggested fixes

This is a read-only audit — no files are modified.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error

PIPELINES = "http://127.0.0.1:9001"
COMFYUI = "http://127.0.0.1:8188"
INVENTORY = r"C:\Users\Administrator\AppData\Local\Temp\vf-fix\models_inventory.json"
OUT_PATH = r"C:\Users\Administrator\Desktop\Github Repos\vault-flows\scripts\proven_workflows_diagnostic.md"
OBJECT_INFO_CACHE = r"C:\Users\Administrator\AppData\Local\Temp\vf-fix\object_info.json"

# UI-only / structural nodes ComfyUI doesn't execute server-side — fine to ignore
UI_ONLY = {
    "Note", "MarkdownNote", "Reroute", "RerouteNode", "PrimitiveNode",
    "PrimitiveBoolean", "PrimitiveInt", "PrimitiveFloat", "PrimitiveString",
    "PrimitiveStringMultiline", "Anchor",
    "Fast Groups Muter (rgthree)", "Fast Groups Bypasser (rgthree)",
    "Bookmark (rgthree)", "Label (rgthree)",
}

MODEL_EXTS = (".safetensors", ".gguf", ".pt", ".ckpt", ".bin", ".pth")


def _http(method, url, body=None, headers=None, timeout=30):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    hdrs = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, f"network error: {e}"


def login():
    code, body = _http("POST", f"{PIPELINES}/auth/login",
                       body={"username": "admin", "password": "FuckyouPipelines123!"})
    if code != 200:
        raise SystemExit(f"login failed: {body[:200]}")
    return json.loads(body)["access_token"]


def get_object_info():
    try:
        code, body = _http("GET", f"{COMFYUI}/object_info", timeout=10)
        if code == 200:
            os.makedirs(os.path.dirname(OBJECT_INFO_CACHE), exist_ok=True)
            with open(OBJECT_INFO_CACHE, "w", encoding="utf-8") as f:
                f.write(body)
            return json.loads(body), True
    except Exception:
        pass
    if os.path.isfile(OBJECT_INFO_CACHE):
        with open(OBJECT_INFO_CACHE, encoding="utf-8") as f:
            return json.load(f), False
    return {}, False


def get_inventory():
    if os.path.isfile(INVENTORY):
        with open(INVENTORY, encoding="utf-8") as f:
            return json.load(f)
    return {}


def all_model_files(inventory):
    flat = set()
    for files in inventory.values():
        for f in files:
            flat.add(f)
            flat.add(f.replace("/", "\\"))
            flat.add(os.path.basename(f))
    return flat


def _spec_type(input_spec) -> tuple:
    """ComfyUI input specs are [type, options] or just "TYPE" or [enum_list, options].
    Returns (type_value, options_dict).
    """
    if isinstance(input_spec, list) and input_spec:
        t = input_spec[0]
        opts = input_spec[1] if len(input_spec) > 1 and isinstance(input_spec[1], dict) else {}
        return t, opts
    return input_spec, {}


def validate_locally(graph: dict, object_info: dict, step: dict | None = None) -> tuple[str, str, dict]:
    """
    Replicate ComfyUI's validate_prompt() server-side checks without
    actually POSTing to /prompt (avoids queuing a job on the user's GPU).

    Checks per node:
      - class_type exists in /object_info
      - all required inputs are present (either wired or literal)
      - wired inputs reference a node that exists in the graph
      - enum-typed literal inputs are in the allowed values list
      - INT/FLOAT/STRING literal inputs are roughly type-correct

    Exemption: for nodes that are the target of an `image_inputs` entry, the
    `image` input is skipped — the worker overwrites it at run time with the
    user's uploaded filename, so the static value is irrelevant.

    Returns (status, summary, node_errors_like_comfyui).
    """
    # Resolve which node-id's `image` input is going to be replaced at run time.
    overridden: set[tuple[str, str]] = set()
    if step:
        ip = step.get("input_paths") or {}
        ii = step.get("image_inputs") or []
        for key in ii:
            dotted = ip.get(key)
            if isinstance(dotted, str) and "." in dotted:
                nid, _, field = dotted.split(".", 1)[0], None, dotted.split(".")[-1]
                overridden.add((nid, field))

    node_errors: dict = {}

    def add_err(nid, ct, message, details=""):
        node_errors.setdefault(nid, {"class_type": ct, "errors": []})
        node_errors[nid]["errors"].append({"message": message, "details": details})

    for nid, node in graph.items():
        if not isinstance(node, dict):
            continue
        ct = node.get("class_type")
        if not ct:
            add_err(nid, "?", "node has no class_type")
            continue
        if ct in UI_ONLY:
            continue
        schema = object_info.get(ct)
        if not schema:
            add_err(nid, ct, "missing_node_type", f"Node '{ct}' not found. The custom node may not be installed.")
            continue
        required = schema.get("input", {}).get("required", {}) if isinstance(schema, dict) else {}
        if not isinstance(required, dict):
            continue
        inputs = node.get("inputs") or {}

        for name, spec in required.items():
            # Skip inputs the worker overrides at runtime (e.g. LoadImage.image
            # whose dotted path is declared in step.image_inputs).
            if (nid, name) in overridden:
                continue

            value = inputs.get(name)

            # Wired link?
            if isinstance(value, list) and len(value) == 2:
                src_id = str(value[0])
                if src_id not in graph:
                    add_err(nid, ct, f"Required input '{name}' linked to missing node '{src_id}'")
                continue

            # Missing required (None or "" for non-string slots; for string slots empty is sometimes OK so be lenient)
            if value is None:
                add_err(nid, ct, "Required input is missing", f"input '{name}'")
                continue

            stype, opts = _spec_type(spec)

            # Enum literal — value must be in the allowed list
            if isinstance(stype, list):
                if value not in stype:
                    add_err(nid, ct, "Value not in list", f"input '{name}': {value!r}")
                continue

            # Type sanity (best-effort — ComfyUI is permissive on coercion)
            if isinstance(stype, str):
                st = stype.upper()
                if st == "INT" and not isinstance(value, (int, bool)):
                    if not (isinstance(value, str) and value.lstrip("-").isdigit()):
                        add_err(nid, ct, "Expected INT", f"input '{name}': got {type(value).__name__}")
                elif st == "FLOAT" and not isinstance(value, (int, float, bool)):
                    if not (isinstance(value, str)):
                        add_err(nid, ct, "Expected FLOAT", f"input '{name}': got {type(value).__name__}")
                elif st == "STRING" and not isinstance(value, str):
                    add_err(nid, ct, "Expected STRING", f"input '{name}': got {type(value).__name__}")
                elif st in ("MODEL", "CLIP", "VAE", "CONDITIONING", "LATENT", "IMAGE", "MASK", "CONTROL_NET", "STYLE_MODEL", "UPSCALE_MODEL", "INSIGHTFACE", "IPADAPTER"):
                    # These should always be wired, not literal
                    add_err(nid, ct, f"Required input '{name}' (type {st}) must be wired, got literal {type(value).__name__}")

    if not node_errors:
        return "PASS", "static validation passed (no GPU work performed)", {}
    return "VALIDATION", f"{len(node_errors)} node(s) failed static validation", node_errors


def probe(graph: dict, object_info: dict, step: dict | None = None) -> tuple[str, str, dict]:
    """Local-only validator — no ComfyUI HTTP call, no GPU work."""
    if not object_info:
        return "SKIPPED", "no cached /object_info available", {}
    return validate_locally(graph, object_info, step)


def classify_node(class_type: str, object_info: dict) -> str:
    """One of: ok, ui_only, subgraph_uuid, unknown_pack, unknown."""
    if class_type in UI_ONLY:
        return "ui_only"
    # ComfyUI subgraph references use UUID-style ids
    if (
        len(class_type) == 36
        and class_type.count("-") == 4
        and all(c in "0123456789abcdef-" for c in class_type.lower())
    ):
        return "subgraph_uuid"
    if class_type in object_info:
        return "ok"
    return "unknown_pack"


def required_input_names(class_type: str, object_info: dict) -> list[str]:
    schema = (object_info or {}).get(class_type, {})
    req = schema.get("input", {}).get("required", {}) if isinstance(schema, dict) else {}
    return list(req.keys()) if isinstance(req, dict) else []


def is_wired(value) -> bool:
    # ComfyUI wired-link: [src_node_id (str), src_slot (int)]
    return isinstance(value, list) and len(value) == 2 and isinstance(value[0], (str, int))


def is_literal_present(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value != ""
    if isinstance(value, (int, float, bool)):
        return True
    if isinstance(value, list):
        return is_wired(value)
    return True


def main():
    token = login()
    object_info, comfy_live = get_object_info()
    inventory = get_inventory()
    inv_set = all_model_files(inventory)

    code, body = _http("GET", f"{PIPELINES}/workflows",
                       headers={"Authorization": f"Bearer {token}"})
    if code != 200:
        raise SystemExit(f"list workflows failed: {body[:200]}")
    workflows = sorted(json.loads(body), key=lambda x: x["id"])

    lines: list[str] = []
    lines.append("# vault-flows · Proven_Workflows diagnostic\n")
    lines.append(
        f"_Local static validator vs ComfyUI's `/object_info` ({len(object_info)} node classes, "
        f"{'live' if comfy_live else 'cached'}) + on-disk model inventory._  \n"
        f"_No jobs queued — zero GPU load._\n"
    )
    lines.append(f"_Total seeded workflows: **{len(workflows)}**_\n")

    # Per-workflow summary index
    summary_rows = []

    for w in workflows:
        steps = w.get("steps") or []
        step = next((s for s in steps if isinstance(s, dict) and s.get("kind") == "comfyui_graph"), None)
        if not step:
            summary_rows.append((w["id"], "?", "no comfyui_graph step"))
            lines.append(f"\n## `{w['id']}`\n")
            lines.append(f"- **name:** {w.get('name')}\n")
            lines.append(f"- _no comfyui_graph step in workflow — cannot diagnose_\n")
            continue

        graph = step.get("graph") or {}
        input_paths = step.get("input_paths") or {}
        image_inputs = step.get("image_inputs") or []

        # Local validation — replicates ComfyUI's validate_prompt without queuing
        status, prompt_summary, node_errors = probe(graph, object_info, step)

        # Classify nodes
        classes = {nid: n.get("class_type") for nid, n in graph.items()}
        ui_only = []
        subgraphs = []
        unknown_pack = []
        ok = []
        for nid, ct in classes.items():
            kind = classify_node(ct, object_info)
            if kind == "ui_only": ui_only.append((nid, ct))
            elif kind == "subgraph_uuid": subgraphs.append((nid, ct))
            elif kind == "unknown_pack": unknown_pack.append((nid, ct))
            else: ok.append((nid, ct))

        # Unwired-required-input scan
        unwired: list[tuple[str, str, str]] = []
        for nid, node in graph.items():
            ct = node.get("class_type")
            if ct not in object_info:
                continue
            inputs = node.get("inputs") or {}
            for req_name in required_input_names(ct, object_info):
                val = inputs.get(req_name)
                if not is_literal_present(val):
                    unwired.append((nid, ct, req_name))

        # Missing model files
        missing_files: list[tuple[str, str, str]] = []  # (nid, key, value)
        for nid, node in graph.items():
            for key, val in (node.get("inputs") or {}).items():
                if isinstance(val, str) and val.lower().endswith(MODEL_EXTS):
                    if val not in inv_set and val.replace("\\", "/") not in inv_set:
                        if os.path.basename(val) not in inv_set:
                            missing_files.append((nid, key, val))

        # Compute the punch-list "severity". Static-analysis blockers first,
        # then probe-based status, then VALIDATION/OTHER cases.
        if unknown_pack:
            verdict = "BLOCKED_UNKNOWN_PACK"
        elif subgraphs:
            verdict = "BLOCKED_SUBGRAPH"
        elif missing_files:
            verdict = "BLOCKED_MISSING_MODEL"
        elif status == "PASS":
            verdict = "PASS"
        elif unwired:
            verdict = "BROKEN_WIRING"
        elif status == "VALIDATION":
            if (
                node_errors
                and all(
                    "LoadImage" in (info.get("class_type") or "")
                    for info in node_errors.values()
                )
            ):
                verdict = "PROBABLY_OK_WITH_UPLOAD"
            else:
                verdict = "VALIDATION_OTHER"
        elif status == "SKIPPED":
            verdict = "OK_STATIC"
        else:
            verdict = "OTHER"
        summary_rows.append((w["id"], verdict, prompt_summary))

        # Markdown section
        lines.append(f"\n---\n\n## `{w['id']}` — **{verdict}**\n")
        lines.append(f"- **Display name:** {w.get('name')}\n")
        desc = w.get("description") or ""
        src = desc.split("|")[0].replace("Original:", "").strip() if desc else ""
        lines.append(f"- **Source file:** `{src or '(unknown)'}`\n")
        lines.append(f"- **Total nodes:** {len(graph)}  · ok: {len(ok)}, ui-only: {len(ui_only)}, subgraph-uuid: {len(subgraphs)}, unknown-pack: {len(unknown_pack)}\n")
        lines.append(f"- **input_paths:** `{list(input_paths.keys())}`\n")
        lines.append(f"- **image_inputs:** `{image_inputs}`\n")
        lines.append(f"- **ComfyUI probe:** **{status}** — {prompt_summary}\n")

        if unknown_pack:
            lines.append(f"\n### Unknown class_types (not in any installed pack)\n")
            for nid, ct in unknown_pack:
                lines.append(f"- node `{nid}` → `{ct}`\n")
            lines.append("\n_Action: either install the pack into `D:\\comfyui\\resources\\comfyui\\custom_nodes\\` and restart ComfyUI, or replace the node with a registered equivalent._\n")

        if subgraphs:
            lines.append(f"\n### Subgraph references (UUID-named — need expansion)\n")
            for nid, ct in subgraphs:
                lines.append(f"- node `{nid}` → subgraph `{ct}`\n")
            lines.append("\n_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._\n")

        if missing_files:
            lines.append(f"\n### Model files referenced but not on disk\n")
            for nid, key, val in missing_files:
                lines.append(f"- node `{nid}` `{key}`: `{val}`\n")
            lines.append("\n_Action: either download the file into the right subdir under `D:\\comfyui\\resources\\comfyui\\models\\`, or edit the workflow to reference a file you do have._\n")

        if unwired:
            lines.append(f"\n### Required inputs that are not wired / empty\n")
            for nid, ct, name in unwired:
                # Show the current value if any
                cur = (graph.get(nid, {}).get("inputs") or {}).get(name)
                cur_repr = json.dumps(cur)[:80] if cur is not None else "(missing)"
                lines.append(f"- node `{nid}` (`{ct}`) — required input `{name}` is empty (current: `{cur_repr}`)\n")
            lines.append("\n_Action: open the workflow in ComfyUI editor and connect the missing slot._\n")

        if status == "VALIDATION" and node_errors:
            lines.append(f"\n### ComfyUI validator errors\n")
            for nid, info in list(node_errors.items())[:10]:
                ct = info.get("class_type") or "?"
                errs = info.get("errors") or []
                for err in errs[:3]:
                    msg = err.get("message", "?")
                    det = err.get("details", "")
                    lines.append(f"- node `{nid}` (`{ct}`): {msg}{(' — ' + det) if det else ''}\n")

        # Node table (collapsed-ish)
        lines.append(f"\n### Node inventory\n")
        lines.append("| ID | class_type | kind |\n|---|---|---|\n")
        for nid in sorted(graph.keys(), key=lambda x: int(x) if x.isdigit() else 9999):
            ct = classes.get(nid) or "?"
            k = classify_node(ct, object_info)
            kind_marker = {
                "ok": "✓",
                "ui_only": "ui-only (skipped)",
                "subgraph_uuid": "**subgraph**",
                "unknown_pack": "**UNKNOWN**",
            }.get(k, "?")
            lines.append(f"| {nid} | `{ct}` | {kind_marker} |\n")

    # Top-of-file summary table
    summary_md = ["\n## Summary\n", "| ID | Verdict | Probe |\n|---|---|---|\n"]
    for wid, verdict, summary in summary_rows:
        summary_md.append(f"| `{wid}` | **{verdict}** | {summary[:80]} |\n")

    # Splice summary right after the header
    header_end = next(i for i, l in enumerate(lines) if l.startswith("_Total seeded"))
    final = lines[: header_end + 1] + summary_md + lines[header_end + 1 :]

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.writelines(final)

    print(f"Wrote {OUT_PATH}")
    print(f"  workflows audited: {len(workflows)}")
    cnt = {}
    for _, verdict, _ in summary_rows:
        cnt[verdict] = cnt.get(verdict, 0) + 1
    for k, v in sorted(cnt.items(), key=lambda kv: -kv[1]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    sys.exit(main())
