"""
Bulk-convert ComfyUI editor workflow JSONs (Proven_Workflows folder) into
vault-flows-compatible comfyui_graph steps and POST them to vaultwares-api.

Per file we:
  1. Parse the editor format ({nodes, links, ...})
  2. Walk nodes in order, resolving widget values + link slots against
     ComfyUI's /object_info schema to produce the API-format graph
  3. Identify the primary model (CheckpointLoader/UnetLoader/etc.)
  4. Identify the user-facing inputs:
       - positive_prompt + negative_prompt: CLIPTextEncode nodes wired to
         KSampler.positive / KSampler.negative
       - seed: KSampler.seed
       - source_image / target_image / etc.: LoadImage nodes (named by their
         downstream consumer if obvious)
  5. Generate a clean id like  flux2-klein-faceswap  and a name like
     "Flux 2 Klein · Face Swap (flux-2-klein-9b-fp8)"
  6. POST to /workflows on vaultwares-api

Run:
    python convert_proven_workflows.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
import urllib.error

PIPELINES_BASE = "http://100.67.25.118:9001"
COMFYUI_BASE = "http://127.0.0.1:8188"
PROVEN_DIR = r"C:\Users\Administrator\ComfyUI\user\default\workflows\Proven_Workflows"

ADMIN_USER = "admin"
ADMIN_PASS = "FuckyouPipelines123!"

# ---------------------------------------------------------------------------
# HTTP helpers (stdlib only — keep this script portable)
# ---------------------------------------------------------------------------

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
    code, body = _http("POST", f"{PIPELINES_BASE}/auth/login",
                       body={"username": ADMIN_USER, "password": ADMIN_PASS})
    if code != 200:
        raise SystemExit(f"login failed [{code}]: {body[:200]}")
    return json.loads(body)["access_token"]


_OBJECT_INFO_CACHE = r"C:\Users\Administrator\AppData\Local\Temp\vf-fix\object_info.json"


def get_object_info() -> dict:
    """Try live ComfyUI first; fall back to a local cache if it's down."""
    try:
        code, body = _http("GET", f"{COMFYUI_BASE}/object_info", timeout=10)
        if code == 200:
            os.makedirs(os.path.dirname(_OBJECT_INFO_CACHE), exist_ok=True)
            with open(_OBJECT_INFO_CACHE, "w", encoding="utf-8") as f:
                f.write(body)
            return json.loads(body)
    except Exception:
        pass
    if os.path.isfile(_OBJECT_INFO_CACHE):
        print(f"    (using cached /object_info — ComfyUI was unreachable)")
        with open(_OBJECT_INFO_CACHE, encoding="utf-8") as f:
            return json.load(f)
    raise SystemExit("ComfyUI not reachable and no cached object_info available")


# ---------------------------------------------------------------------------
# Workflow → API format converter
# ---------------------------------------------------------------------------

# UI-only / structural nodes we never include in the API graph.
# These exist only in the editor's frontend (JS/TS extensions) with no
# server-side counterpart, so submitting them to ComfyUI's /prompt fails.
UI_NODE_TYPES = {
    # Core editor primitives
    "Note", "MarkdownNote", "Reroute", "RerouteNode", "PrimitiveNode",
    "PrimitiveBoolean", "PrimitiveInt", "PrimitiveFloat", "PrimitiveString",
    "PrimitiveStringMultiline", "Anchor",
    # rgthree-comfy UI-only helpers (defined only in web/comfyui/*.js)
    "Fast Groups Muter (rgthree)", "Fast Groups Bypasser (rgthree)",
    "Bookmark (rgthree)", "Label (rgthree)", "Mute / Bypass Repeater (rgthree)",
    "Mute / Bypass Relay (rgthree)", "Display Int (rgthree)",
}

# Inputs that have a UI-only "control_after_generate" sibling widget right
# after them in the editor's widgets_values array.
SEED_INPUT_NAMES = {"seed", "noise_seed", "rand_seed"}
CONTROL_VALUES = {"randomize", "fixed", "increment", "decrement"}


def _looks_like_api_format(wf: dict) -> bool:
    """
    API-format graphs are flat dicts of {node_id: {class_type, inputs}}.
    Editor-format graphs have a top-level 'nodes' list plus 'links', etc.
    """
    if not isinstance(wf, dict):
        return False
    if "nodes" in wf or "links" in wf or "last_node_id" in wf:
        return False
    # Sample a value: if it has class_type + inputs, it's API format
    for v in wf.values():
        if isinstance(v, dict) and "class_type" in v and "inputs" in v:
            return True
        break
    return False


def convert_workflow_to_api(wf: dict, object_info: dict) -> tuple[dict, list[str]]:
    """
    Convert editor-format workflow into API-format graph + a list of warnings.
    Returns ({node_id: {class_type, inputs}}, warnings).
    Already-API-format input is passed through unchanged.

    Handles per-node `mode`:
      - 0 (always)   : include normally
      - 2 (muted)    : drop from graph; consumers will see broken links
                       (no auto-rewire — muted means "outputs don't exist")
      - 4 (bypassed) : drop from graph, BUT rewire any consumer link from
                       bypassed_node.output[N] to whatever feeds
                       bypassed_node.input[N]. This is what the ComfyUI
                       editor's "Bypass" mode means: pass-through.
    """
    warnings: list[str] = []
    if _looks_like_api_format(wf):
        # Already API format — pass through, just stringify keys
        passthrough: dict = {}
        for k, v in wf.items():
            if isinstance(v, dict) and "class_type" in v:
                passthrough[str(k)] = {
                    "class_type": v["class_type"],
                    "inputs": v.get("inputs") or {},
                }
        return passthrough, warnings

    nodes = wf.get("nodes", [])
    links = wf.get("links", [])
    # link_id -> [source_node_id (str), source_slot (int)]
    link_map: dict[int, list] = {}
    for l in links:
        if isinstance(l, list) and len(l) >= 4:
            link_map[l[0]] = [str(l[1]), l[2]]

    # Build a bypass map: for each bypassed node, output_slot_index -> source.
    # ComfyUI's bypass convention: output slot N is fed by input slot N if
    # the types match (otherwise the editor disables bypass for that pair).
    # We use positional pass-through, which matches the common case.
    bypass_map: dict[str, dict[int, list]] = {}
    for node in nodes:
        if node.get("mode") != 4:
            continue
        nid = str(node.get("id"))
        node_inputs = node.get("inputs") or []
        node_outputs = node.get("outputs") or []
        slot_to_src: dict[int, list] = {}
        for slot_idx in range(len(node_outputs)):
            if slot_idx >= len(node_inputs):
                continue
            inp = node_inputs[slot_idx]
            if not isinstance(inp, dict):
                continue
            link_id = inp.get("link")
            if isinstance(link_id, int) and link_id in link_map:
                slot_to_src[slot_idx] = link_map[link_id]
        bypass_map[nid] = slot_to_src

    def resolve_src(src: list) -> list | None:
        """Follow bypass chains: keep redirecting until we hit a non-bypassed source."""
        seen = set()
        while isinstance(src, list) and len(src) == 2:
            src_id = str(src[0])
            if src_id in seen:
                return None  # cycle — shouldn't happen but guard anyway
            seen.add(src_id)
            if src_id not in bypass_map:
                return src
            src_slot = src[1] if isinstance(src[1], int) else 0
            next_src = bypass_map[src_id].get(src_slot)
            if next_src is None:
                # Bypassed node has no input at that slot — link is dead
                return None
            src = next_src
        return src

    api: dict = {}
    for node in nodes:
        ntype = node.get("type")
        if not ntype:
            continue
        if ntype in UI_NODE_TYPES:
            continue
        # ComfyUI editor stores per-node `mode`: 0=normal, 2=muted, 4=bypassed.
        # Muted/bypassed nodes are skipped at execution time, so they shouldn't
        # appear in the API graph either — otherwise they'd cause "missing model"
        # / "missing node" failures for things the user never actually runs.
        mode = node.get("mode", 0)
        if isinstance(mode, int) and mode in (2, 4):
            continue

        schema = (object_info or {}).get(ntype, {})
        sch_inputs = schema.get("input", {}) if isinstance(schema, dict) else {}
        required = sch_inputs.get("required", {}) if isinstance(sch_inputs, dict) else {}
        optional = sch_inputs.get("optional", {}) if isinstance(sch_inputs, dict) else {}
        if not isinstance(required, dict):
            required = {}
        if not isinstance(optional, dict):
            optional = {}
        all_inputs = list(required.items()) + list(optional.items())

        if not all_inputs:
            # Unknown to ComfyUI /object_info — likely a custom node pack that
            # isn't installed. We still include the node with its widgets +
            # links as best-effort, so the user sees a clear ComfyUI error
            # ("node X does not exist") instead of an empty graph.
            warnings.append(f"unknown node type {ntype} (custom node pack may not be installed)")

        nid = str(node.get("id"))
        widgets = node.get("widgets_values") or []
        # Slot inputs on the node (declared in the editor)
        slot_links = {}
        for i in (node.get("inputs") or []):
            if not isinstance(i, dict):
                continue
            name = i.get("name")
            link = i.get("link")
            if name is not None:
                slot_links[name] = link

        api_inputs: dict = {}
        widget_idx = 0

        # For unknown node types we have no schema, so we can't drive
        # iteration by schema. Fall back to: include all slot-linked inputs,
        # and store widgets_values as positional unnamed-then-named-best-effort.
        if not all_inputs:
            for name, link_id in slot_links.items():
                if isinstance(link_id, int):
                    src = link_map.get(link_id)
                    if src is not None:
                        resolved = resolve_src(src)
                        if resolved is not None:
                            api_inputs[name] = resolved
            if widgets:
                api_inputs["_widgets_values"] = widgets  # preserved for debugging
            api[nid] = {"class_type": ntype, "inputs": api_inputs}
            continue

        for input_name, input_spec in all_inputs:
            link_id = slot_links.get(input_name)
            if isinstance(link_id, int):
                src = link_map.get(link_id)
                if src is not None:
                    resolved = resolve_src(src)
                    if resolved is not None:
                        api_inputs[input_name] = resolved
                # If the link is broken or chains through a bypass with no
                # source, skip silently — ComfyUI would have done the same.
                continue

            if widget_idx >= len(widgets):
                # No widget left; assume schema default
                continue

            value = widgets[widget_idx]
            widget_idx += 1
            api_inputs[input_name] = value

            # control_after_generate sibling widget
            spec_type = None
            if isinstance(input_spec, list) and input_spec:
                spec_type = input_spec[0]
            if (
                isinstance(spec_type, str)
                and spec_type.upper() == "INT"
                and input_name.lower() in SEED_INPUT_NAMES
                and widget_idx < len(widgets)
                and isinstance(widgets[widget_idx], str)
                and widgets[widget_idx] in CONTROL_VALUES
            ):
                widget_idx += 1

        api[nid] = {"class_type": ntype, "inputs": api_inputs}

    return api, warnings


# ---------------------------------------------------------------------------
# Metadata extraction
# ---------------------------------------------------------------------------

CKPT_NODE_TYPES = {
    "CheckpointLoaderSimple", "CheckpointLoader", "UnetLoaderGGUF",
    "UNETLoader", "UnetLoader", "UnetLoaderGGUFAdvanced",
    "CheckpointLoaderSimpleWithNoiseSelect",
}
LORA_NODE_TYPES = {"LoraLoader", "LoraLoaderModelOnly", "LoraLoaderTagsQuery"}


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def find_primary_model(api: dict) -> str | None:
    """Return the first checkpoint/unet name we find."""
    for node in api.values():
        if node["class_type"] in CKPT_NODE_TYPES:
            inputs = node.get("inputs", {})
            for key in ("ckpt_name", "unet_name", "model_name"):
                if key in inputs and isinstance(inputs[key], str):
                    return inputs[key]
    return None


def find_loras(api: dict) -> list[str]:
    names = []
    for node in api.values():
        if node["class_type"] in LORA_NODE_TYPES:
            inputs = node.get("inputs", {})
            name = inputs.get("lora_name")
            if isinstance(name, str):
                names.append(name)
    return names


def find_text_prompts(api: dict) -> dict[str, str]:
    """
    Return {"positive_prompt": "<NID>.inputs.text", ...} for CLIPTextEncode
    nodes that feed KSampler.positive / KSampler.negative (or similar).
    """
    out: dict[str, str] = {}
    # Look for KSampler-like nodes
    samplers = []
    for nid, node in api.items():
        if "KSampler" in node["class_type"] or "Sampler" in node["class_type"]:
            samplers.append((nid, node))

    seen_positive = False
    seen_negative = False
    for _, node in samplers:
        inputs = node.get("inputs", {})
        pos = inputs.get("positive")
        neg = inputs.get("negative")
        if isinstance(pos, list) and len(pos) >= 1 and not seen_positive:
            src_id = pos[0]
            src_node = api.get(src_id)
            if src_node and "TextEncode" in src_node["class_type"]:
                out["positive_prompt"] = f"{src_id}.inputs.text"
                seen_positive = True
        if isinstance(neg, list) and len(neg) >= 1 and not seen_negative:
            src_id = neg[0]
            src_node = api.get(src_id)
            if src_node and "TextEncode" in src_node["class_type"]:
                out["negative_prompt"] = f"{src_id}.inputs.text"
                seen_negative = True

    # Fallback: any CLIPTextEncode if we didn't find one via sampler walk
    if not out:
        for nid, node in api.items():
            if "TextEncode" in node["class_type"] and "text" in node.get("inputs", {}):
                key = "positive_prompt" if "positive_prompt" not in out else "negative_prompt"
                out[key] = f"{nid}.inputs.text"
                if len(out) >= 2:
                    break
    return out


def find_seed_path(api: dict) -> str | None:
    for nid, node in api.items():
        if "KSampler" in node["class_type"] or "Sampler" in node["class_type"]:
            if "seed" in node.get("inputs", {}):
                return f"{nid}.inputs.seed"
            if "noise_seed" in node.get("inputs", {}):
                return f"{nid}.inputs.noise_seed"
    return None


def find_image_inputs(api: dict) -> list[tuple[str, str]]:
    """
    Find LoadImage nodes. Returns [(input_key, dotted_path)] in the order
    they appear. Multiple LoadImage nodes → source_image, target_image,
    reference_image.
    """
    keys = ["source_image", "target_image", "reference_image", "extra_image"]
    found: list[tuple[str, str]] = []
    for nid, node in api.items():
        if node["class_type"] in ("LoadImage", "LoadImageMask", "VHS_LoadImagePath"):
            if not keys:
                break
            key = keys.pop(0)
            inp = node.get("inputs", {})
            field = "image" if "image" in inp else next(iter(inp.keys()), "image")
            found.append((key, f"{nid}.inputs.{field}"))
    return found


# ---------------------------------------------------------------------------
# Clean-name table (curated, with fallback to slugified filename)
# ---------------------------------------------------------------------------

NAME_MAP: dict[str, tuple[str, str, str]] = {
    # file_stem -> (clean_id, display_name, category)
    "BigLove_Photo_Workflow":
        ("biglove-photo", "BigLove · Photo (bigLove_zt3)", "image"),
    "ConditionerSamplerUpscaler":
        ("flux-conditioner-sampler-upscaler", "Flux · Conditioner + Sampler + Upscaler", "image"),
    "Custom_Realistic_Workflow_v1":
        ("custom-realistic", "Custom · Realistic Workflow v1", "image"),
    "Flux2_Klein_Swap_Anything_Facev2":
        ("flux2-klein-faceswap", "Flux 2 Klein · Swap Anything Face", "image"),
    "IPAdapter-faceswap":
        ("ipadapter-faceswap", "IP-Adapter · Face Swap", "image"),
    "basic-lora-loader":
        ("basic-lora-text2img", "Basic · LoRA-Loaded Text-to-Image", "image"),
    "comfy_wf_qwen_image":
        ("qwen-image-text2img", "Qwen-Image · Text-to-Image", "image"),
    "copilot_img2img_face_paste":
        ("copilot-face-paste-img2img", "Copilot · Face Paste Img2Img", "image"),
    "copilot_wan2.2_img2video_flow":
        ("wan22-img2video", "Wan 2.2 · Image-to-Video", "video"),
    "gonzaLomo_DMD_v30":
        ("gonzalomo-dmd-v30", "gonzaLomo · DMD v30", "image"),
    "i2i-OpenPose":
        ("openpose-i2i", "OpenPose · Image-to-Image", "image"),
    "qwen-edit-multiple-angle-VNCCS":
        ("qwen-edit-multi-angle", "Qwen-Edit · Multiple Angles (VNCCS)", "image"),
    "qwen-image-edit-2511-4steps":
        ("qwen-image-edit-4step", "Qwen-Image-Edit · 4-Step (2511)", "image"),
}


def build_workflow_record(file_path: str, api: dict, warnings: list[str]) -> dict:
    stem = os.path.splitext(os.path.basename(file_path))[0]
    clean_id, display_name, category = NAME_MAP.get(
        stem, (slugify(stem), stem, "image")
    )

    model = find_primary_model(api)
    loras = find_loras(api)
    prompts = find_text_prompts(api)
    seed_path = find_seed_path(api)
    image_inputs = find_image_inputs(api)

    input_paths: dict = {}
    input_paths.update(prompts)
    if seed_path:
        input_paths["seed"] = seed_path
    for key, path in image_inputs:
        input_paths[key] = path

    desc_parts = [
        f"Original: {os.path.basename(file_path)}",
    ]
    if model:
        desc_parts.append(f"Model: {model}")
    if loras:
        desc_parts.append(f"LoRAs: {', '.join(loras[:3])}")
    if image_inputs:
        desc_parts.append(f"Image inputs: {', '.join(k for k, _ in image_inputs)}")
    if warnings:
        desc_parts.append(f"({len(warnings)} unknown nodes — may need ComfyUI custom nodes installed)")

    record = {
        "id": clean_id,
        "name": display_name,
        "category": category,
        "description": " | ".join(desc_parts),
        "steps": [
            {
                "kind": "comfyui_graph",
                "graph": api,
                "input_paths": input_paths,
                "image_inputs": [k for k, _ in image_inputs],
            }
        ],
        "pinned": False,
        "favorite": False,
    }
    return record


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    if not os.path.isdir(PROVEN_DIR):
        raise SystemExit(f"Not a directory: {PROVEN_DIR}")

    print(f"--> Fetching ComfyUI /object_info ...")
    object_info = get_object_info()
    print(f"    Got {len(object_info)} node-class definitions")

    print(f"--> Logging in to pipelines ...")
    jwt_token = login()

    files = sorted(
        os.path.join(PROVEN_DIR, f)
        for f in os.listdir(PROVEN_DIR)
        if f.lower().endswith(".json")
    )
    print(f"--> Found {len(files)} workflow file(s)")
    print()

    summary = []
    for f in files:
        stem = os.path.splitext(os.path.basename(f))[0]
        try:
            with open(f, encoding="utf-8") as fh:
                wf = json.load(fh)
            api, warnings = convert_workflow_to_api(wf, object_info)
            if not api:
                summary.append((stem, "FAIL", "0 nodes after conversion"))
                continue
            record = build_workflow_record(f, api, warnings)
            # Idempotent: try PUT first (update if exists), fall back to POST
            put_code, put_body = _http(
                "PUT",
                f"{PIPELINES_BASE}/workflows/{record['id']}",
                body=record,
                headers={"Authorization": f"Bearer {jwt_token}"},
                timeout=30,
            )
            if put_code == 404:
                code, body = _http(
                    "POST",
                    f"{PIPELINES_BASE}/workflows",
                    body=record,
                    headers={"Authorization": f"Bearer {jwt_token}"},
                    timeout=30,
                )
            else:
                code, body = put_code, put_body
            if code in (200, 201):
                resp = json.loads(body)
                wflag = f", {len(warnings)} warnings" if warnings else ""
                summary.append(
                    (
                        stem,
                        "OK",
                        f"id={resp['id']}, nodes={len(api)}, "
                        f"inputs={list(record['steps'][0]['input_paths'].keys())}{wflag}",
                    )
                )
            else:
                summary.append((stem, "FAIL", f"POST /workflows -> {code}: {body[:200]}"))
        except Exception as e:
            summary.append((stem, "ERROR", f"{type(e).__name__}: {e}"))

    print("--- Results ---")
    width = max(len(s[0]) for s in summary)
    ok = 0
    for stem, status, detail in summary:
        marker = "OK   " if status == "OK" else f"{status:5}"
        print(f"  [{marker}] {stem.ljust(width)}  {detail}")
        if status == "OK":
            ok += 1
    print()
    print(f"--> {ok}/{len(summary)} workflows seeded successfully.")
    return 0 if ok == len(summary) else 1


if __name__ == "__main__":
    sys.exit(main())
