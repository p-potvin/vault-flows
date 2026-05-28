"""
In-place fixer for the Proven_Workflow .json files.

Two passes:
  1. Model-name realignment — for every widget value or API-input that looks
     like a model filename (.safetensors / .gguf / .pt / .ckpt / .bin / .pth),
     check it against the on-disk inventory and replace with the closest
     match if the exact name isn't on disk.
  2. VAE insertion — for editor-format workflows that use a checkpoint
     known to ship without a baked-in VAE (bigLove_zt3, Flux2-Klein) and
     contain VAEEncode/VAEDecode nodes, insert a VAELoader node and
     rewrite the vae links on those Encode/Decode nodes to point at it.

Writes a .bak alongside each modified file. Idempotent — re-running is safe.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import difflib

INVENTORY_PATH = r"C:\Users\Administrator\AppData\Local\Temp\vf-fix\models_inventory.json"
PROVEN_DIR = r"C:\Users\Administrator\ComfyUI\user\default\workflows\Proven_Workflows"

# Per-checkpoint VAE pairing for the "no baked-in VAE" case
DEFAULT_VAE_FOR_CKPT = {
    "bigLove_zt3.safetensors": "sdxl_vae.safetensors",
    "other/bigLove_zt3.safetensors": "sdxl_vae.safetensors",
    "Flux.2-Klein-9B-RealCoreXL-Zero.safetensors": "flux2-vae.safetensors",
    "flux/Flux.2-Klein-9B-RealCoreXL-Zero.safetensors": "flux2-vae.safetensors",
    "babesIllustriousBy_v55DMD2.safetensors": "sdxl_vae.safetensors",
    "sdxl/babesIllustriousBy_v55DMD2.safetensors": "sdxl_vae.safetensors",
    "illustrious_v6NS.safetensors": "sdxl_vae.safetensors",
    "sdxl/illustrious_v6NS.safetensors": "sdxl_vae.safetensors",
    "gonzalomoXLFluxPony_v10FluxSAIO.safetensors": "sdxl_vae.safetensors",
    "flux/gonzalomoXLFluxPony_v10FluxSAIO.safetensors": "sdxl_vae.safetensors",
}

# Maps node input name -> inventory subdir(s) to search
NAME_TO_DIR = {
    "ckpt_name": ["checkpoints"],
    "lora_name": ["loras"],
    "vae_name": ["vae"],
    "unet_name": ["unet", "diffusion_models"],
    "model_name": ["checkpoints", "unet", "diffusion_models"],
    "control_net_name": ["controlnet"],
    "clip_name": ["clip", "text_encoders"],
    "clip_name1": ["clip", "text_encoders"],
    "clip_name2": ["clip", "text_encoders"],
    "clip_vision_name": ["clip_vision"],
    "upscale_model_name": ["upscale_models"],
    "ipadapter_file": ["ipadapter"],
    "embedding_name": ["embeddings"],
    "preset": ["ipadapter"],  # IPAdapter preset
}

# By node-type, what subdir does its widget-value-as-file most likely belong to?
NODE_TYPE_TO_DIR = {
    "CheckpointLoaderSimple": ["checkpoints"],
    "CheckpointLoader": ["checkpoints"],
    "VAELoader": ["vae"],
    "VAELoaderGGUF": ["vae"],
    "LoraLoader": ["loras"],
    "LoraLoaderModelOnly": ["loras"],
    "LoraLoaderTagsQuery": ["loras"],
    "UNETLoader": ["unet", "diffusion_models"],
    "UnetLoaderGGUF": ["unet", "diffusion_models"],
    "ControlNetLoader": ["controlnet"],
    "ControlNetLoaderAdvanced": ["controlnet"],
    "UpscaleModelLoader": ["upscale_models"],
    "CLIPLoader": ["clip", "text_encoders"],
    "DualCLIPLoader": ["clip", "text_encoders"],
    "CLIPVisionLoader": ["clip_vision"],
    "IPAdapterModelLoader": ["ipadapter"],
    "IPAdapterUnifiedLoader": ["ipadapter"],
    "InsightFaceLoader": ["insightface"],
}

MODEL_EXTS = (".safetensors", ".gguf", ".pt", ".ckpt", ".bin", ".pth")


def is_model_filename(s) -> bool:
    return isinstance(s, str) and s.lower().endswith(MODEL_EXTS)


def load_inventory() -> dict:
    with open(INVENTORY_PATH, encoding="utf-8") as f:
        return json.load(f)


def all_in(inventory: dict, subdirs) -> list[str]:
    out = []
    for s in subdirs:
        out.extend(inventory.get(s, []))
    return out


import re as _re

# Quant / precision markers that don't change a model's identity, just its size
_QUANT_PATTERNS = [
    r"-fp16", r"-fp8(?:-e4m3fn|-e5m2)?", r"-fp32", r"-bf16",
    r"-q[0-9]+[a-z_-]*",       # q2_k, q4_0, q4_k_m, q4_k_s, q8_0, etc.
    r"-nvfp4", r"-int8", r"-int4",
    r"-dmd2?",                  # DMD2 distillations (same base model, different distill)
    r"-aio", r"-base",          # All-In-One / "base" tags
    r"-distill", r"-distilled",
]
# Minor-version suffixes (-V1.0 vs -V1.1 are usually drop-in replacements)
_MINOR_VERSION = _re.compile(r"-v(\d+)[.-](\d+[a-z]*)\b", _re.IGNORECASE)


def _core_key(s: str) -> str:
    """
    Return a 'core identity' key for a model filename — strip path, extension,
    quant markers, distillation markers, and minor-version suffixes. Two files
    with the same core key are interchangeable (same base model, different
    quant or patch version).

    Examples:
        Qwen-Image-Lightning-8steps-V1.0.safetensors → qwen-image-lightning-8steps-v1
        Qwen-Image-Lightning-8steps-V1.1.safetensors → qwen-image-lightning-8steps-v1
        babesIllustriousBy_v55FP16.safetensors        → babesillustriousby-v55
        babesIllustriousBy_v55DMD2.safetensors        → babesillustriousby-v55
        z-Image-Turbo-FP8-AIO.safetensors             → z-image-turbo
    """
    s = os.path.basename(s).lower()
    for ext in MODEL_EXTS:
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    # Normalize separators to '-'
    s = _re.sub(r"[_.\s]+", "-", s)
    # Strip quant / distill / aio markers
    for pat in _QUANT_PATTERNS:
        s = _re.sub(pat, "", s, flags=_re.IGNORECASE)
    # Collapse minor-version (V1.0 / V1.1 → V1)
    s = _MINOR_VERSION.sub(lambda m: f"-v{m.group(1)}", s)
    # Collapse repeated dashes
    s = _re.sub(r"-+", "-", s).strip("-")
    return s


def _norm_key(s: str) -> str:
    """Legacy alias — kept for any old call sites; same semantics as _core_key."""
    return _core_key(s).replace("-", "")


def closest_match(inventory: dict, subdirs, name: str, *, strict: bool = False) -> str | None:
    """
    Return a same-base filename on disk, or None. Tiered matching:
      1. Exact (after slash normalization)
      2. Exact basename in any subfolder
      3. Same core identity (quant + minor-version stripped) — high confidence,
         this is the case we WANT to substitute (V1.0 → V1.1, FP16 → DMD2)
      4. Conservative fuzzy on basename (cutoff 0.75) — non-strict only

    `strict=True` stops after tier 3 — for LoRAs where a wrong guess would
    silently change the trained concept.
    """
    name_norm = name.replace("\\", "/")
    files = all_in(inventory, subdirs)
    if not files:
        return None

    # 1. Exact
    if name_norm in files:
        return name_norm

    base = os.path.basename(name_norm)
    by_base: dict[str, str] = {}
    for f in files:
        b = os.path.basename(f)
        if b not in by_base or "/" not in f or "/" in by_base[b]:
            by_base[b] = f

    # 2. Exact basename
    if base in by_base:
        return by_base[base]

    # 3. Same core identity — drop-in replacements (different quant or
    #    minor version of the same base model)
    target_core = _core_key(base)
    if target_core:
        # Prefer top-level files when multiple candidates share the core key
        candidates = [(f, "/" in f) for f in files if _core_key(f) == target_core]
        if candidates:
            # Sort: top-level first (False < True), then alphabetical for stability
            candidates.sort(key=lambda x: (x[1], x[0]))
            return candidates[0][0]

    # Strict mode stops here
    if strict:
        return None

    # 4. Conservative fuzzy
    m = difflib.get_close_matches(base, list(by_base.keys()), n=1, cutoff=0.75)
    if m:
        return by_base[m[0]]
    return None


# ---------------------------------------------------------------------------
# Pass 1: model-name realignment
# ---------------------------------------------------------------------------

def fix_model_names(wf: dict, inventory: dict, file_for_log: str) -> int:
    """
    Walk the workflow and replace model filename strings with on-disk matches.
    Works on both editor format (top-level 'nodes' list) and API format.
    Returns the number of replacements made.
    """
    replacements = 0

    # API format
    if "nodes" not in wf:
        for nid, node in wf.items():
            if not (isinstance(node, dict) and "class_type" in node):
                continue
            ntype = node.get("class_type")
            inputs = node.get("inputs") or {}
            for key, value in list(inputs.items()):
                if not is_model_filename(value):
                    continue
                subdirs = NAME_TO_DIR.get(key) or NODE_TYPE_TO_DIR.get(ntype) or ["checkpoints"]
                files = all_in(inventory, subdirs)
                norm = value.replace("\\", "/")
                if norm in files:
                    if norm != value:
                        inputs[key] = norm
                        replacements += 1
                    continue
                match = closest_match(inventory, subdirs, value)
                if match and match != value:
                    print(f"    [{file_for_log}] {ntype}.{key}: '{value}' -> '{match}'")
                    inputs[key] = match
                    replacements += 1
        return replacements

    # Editor format
    for node in wf.get("nodes", []):
        ntype = node.get("type")
        widgets = node.get("widgets_values") or []
        if not widgets:
            continue
        # Default subdir from the node type
        subdirs = NODE_TYPE_TO_DIR.get(ntype) or ["checkpoints"]
        # Multi-LoRA stacker nodes (rgthree, Power LoRA, etc.) interleave
        # name + on/off + strength widgets. Be conservative — strict matching
        # only, and never guess at a substitute we don't have on disk.
        is_lora_stack = "Lora" in (ntype or "") and ("Stack" in (ntype or "") or "Power" in (ntype or ""))
        # Standalone LoRA loader nodes also benefit from strict matching to
        # avoid swapping in unrelated LoRAs.
        is_single_lora = ntype in ("LoraLoader", "LoraLoaderModelOnly", "LoraLoaderTagsQuery")
        strict = is_lora_stack or is_single_lora

        for i, w in enumerate(widgets):
            if not is_model_filename(w):
                continue
            # For lora-stack widgets, double-check we're looking at a real LoRA
            # name and not, say, a trigger word that happens to end in .safetensors
            sub = subdirs
            if is_lora_stack or is_single_lora:
                sub = ["loras"]

            norm = w.replace("\\", "/")
            files = all_in(inventory, sub)
            if norm in files:
                if norm != w:
                    widgets[i] = norm
                    replacements += 1
                continue
            match = closest_match(inventory, sub, w, strict=strict)
            if match and match != w:
                print(f"    [{file_for_log}] {ntype}[{i}]: '{w}' -> '{match}'")
                widgets[i] = match
                replacements += 1
            elif not match and (is_lora_stack or is_single_lora):
                # Track but don't replace — the user's workflow expects this
                # LoRA but they haven't downloaded it. ComfyUI will surface
                # the missing file clearly.
                print(f"    [{file_for_log}] {ntype}[{i}]: MISSING LoRA '{w}' (no substitute on disk)")
    return replacements


# ---------------------------------------------------------------------------
# Pass 2: VAE insertion (editor format only — much harder in API format
# without rewriting connection IDs, and we don't need it for our cases)
# ---------------------------------------------------------------------------

def find_used_checkpoint(wf: dict) -> str | None:
    for node in wf.get("nodes", []):
        if node.get("type") in ("CheckpointLoaderSimple", "CheckpointLoader"):
            widgets = node.get("widgets_values") or []
            for w in widgets:
                if is_model_filename(w):
                    return w
    return None


def insert_vae_loader(wf: dict, file_for_log: str) -> bool:
    """
    Editor-format only. If the workflow uses a checkpoint without a baked-in
    VAE (per DEFAULT_VAE_FOR_CKPT) AND contains VAEEncode/VAEDecode nodes,
    add a VAELoader node and rewrite all `vae` slot links on those nodes to
    pull from the new loader instead of the checkpoint.

    Returns True if changes were made.
    """
    if "nodes" not in wf:
        return False

    ckpt = find_used_checkpoint(wf)
    if not ckpt:
        return False
    ckpt_norm = ckpt.replace("\\", "/")
    if ckpt_norm not in DEFAULT_VAE_FOR_CKPT:
        return False

    vae_users = [
        n for n in wf["nodes"]
        if n.get("type") in ("VAEEncode", "VAEDecode")
    ]
    if not vae_users:
        return False
    has_loader = any(n.get("type") in ("VAELoader", "VAELoaderGGUF") for n in wf["nodes"])
    if has_loader:
        return False

    vae_name = DEFAULT_VAE_FOR_CKPT[ckpt_norm]
    print(f"    [{file_for_log}] inserting VAELoader('{vae_name}') for checkpoint '{ckpt}'")

    # Allocate a new node id + link id
    next_node_id = (wf.get("last_node_id") or 0) + 1
    next_link_id = (wf.get("last_link_id") or 0) + 1

    # Position: place to the right of the checkpoint loader if possible
    ck_node = next(
        (n for n in wf["nodes"] if n.get("type") in ("CheckpointLoaderSimple", "CheckpointLoader")),
        None,
    )
    pos = [0, 0]
    if ck_node and isinstance(ck_node.get("pos"), list) and len(ck_node["pos"]) >= 2:
        pos = [ck_node["pos"][0], ck_node["pos"][1] + 200]

    vae_loader = {
        "id": next_node_id,
        "type": "VAELoader",
        "pos": pos,
        "size": [315, 58],
        "flags": {},
        "order": (max((n.get("order") or 0) for n in wf["nodes"]) + 1) if wf["nodes"] else 0,
        "mode": 0,
        "inputs": [],
        "outputs": [{
            "name": "VAE",
            "type": "VAE",
            "links": [],
            "slot_index": 0,
        }],
        "properties": {"Node name for S&R": "VAELoader"},
        "widgets_values": [vae_name],
    }
    wf["nodes"].append(vae_loader)
    wf["last_node_id"] = next_node_id

    # For each VAEEncode/VAEDecode, rewrite the 'vae' input link to point at our loader
    new_link_ids: list[int] = []
    for vae_user in vae_users:
        # Find the 'vae' slot
        slot_idx = None
        for idx, inp in enumerate(vae_user.get("inputs") or []):
            if isinstance(inp, dict) and inp.get("name") == "vae":
                slot_idx = idx
                break
        if slot_idx is None:
            # Add it
            vae_user.setdefault("inputs", []).append({"name": "vae", "type": "VAE", "link": None})
            slot_idx = len(vae_user["inputs"]) - 1

        # Remove the previous link (if any) from the links table
        prev_link_id = vae_user["inputs"][slot_idx].get("link")
        if isinstance(prev_link_id, int):
            wf["links"] = [l for l in wf.get("links", []) if not (isinstance(l, list) and l[0] == prev_link_id)]

        # Create a fresh link from our loader's output 0 to this slot
        link_id = next_link_id
        next_link_id += 1
        # ComfyUI link tuple: [id, src_node, src_slot, dst_node, dst_slot, type]
        wf.setdefault("links", []).append(
            [link_id, next_node_id, 0, vae_user["id"], slot_idx, "VAE"]
        )
        vae_user["inputs"][slot_idx]["link"] = link_id
        new_link_ids.append(link_id)

    vae_loader["outputs"][0]["links"] = new_link_ids
    wf["last_link_id"] = next_link_id - 1
    return True


# ---------------------------------------------------------------------------
# Pass 3: clear pre-filled LoadImage filenames (worker overrides at run time)
# ---------------------------------------------------------------------------

COMFY_INPUT_DIR = r"D:\comfyui\resources\comfyui\inputs"


def find_placeholder_image() -> str | None:
    """Return the name of any image file already in ComfyUI's input folder,
    so we can use it as a validator-friendly placeholder for LoadImage nodes
    whose filename gets overridden at runtime by the worker."""
    if not os.path.isdir(COMFY_INPUT_DIR):
        return None
    for root, _, files in os.walk(COMFY_INPUT_DIR):
        for f in sorted(files):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                rel = os.path.relpath(os.path.join(root, f), COMFY_INPUT_DIR)
                return rel.replace(os.sep, "/")
    return None


def normalize_load_image_widgets(wf: dict, placeholder: str | None, file_for_log: str) -> int:
    """
    For every LoadImage node, replace its baked-in filename with `placeholder`
    if (a) we have one, and (b) the current value isn't already a real file in
    the input dir. This lets ComfyUI's validator pass; the worker will
    overwrite the value with the user-uploaded image at run time.

    Editor format: LoadImage's `widgets_values[0]` is the filename (often
    followed by `widgets_values[1] == "image"`).
    API format: LoadImage's `inputs.image` is the filename.
    """
    if not placeholder:
        return 0
    changes = 0

    # API format
    if "nodes" not in wf:
        for nid, node in wf.items():
            if not (isinstance(node, dict) and node.get("class_type") == "LoadImage"):
                continue
            inputs = node.setdefault("inputs", {})
            current = inputs.get("image")
            if isinstance(current, str) and current and current != placeholder:
                inputs["image"] = placeholder
                changes += 1
        if changes:
            print(f"    [{file_for_log}] LoadImage placeholder applied to {changes} node(s) ('{placeholder}')")
        return changes

    # Editor format
    for node in wf.get("nodes", []):
        if node.get("type") != "LoadImage":
            continue
        widgets = node.get("widgets_values") or []
        if not widgets:
            continue
        current = widgets[0]
        if isinstance(current, str) and current and current != placeholder:
            widgets[0] = placeholder
            changes += 1
    if changes:
        print(f"    [{file_for_log}] LoadImage placeholder applied to {changes} node(s) ('{placeholder}')")
    return changes


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    inventory = load_inventory()
    placeholder = find_placeholder_image()
    if placeholder:
        print(f"==> LoadImage placeholder: '{placeholder}' (from {COMFY_INPUT_DIR})\n")
    else:
        print(f"==> No image found in {COMFY_INPUT_DIR}; LoadImage pass disabled\n")

    files = sorted(
        os.path.join(PROVEN_DIR, f)
        for f in os.listdir(PROVEN_DIR)
        if f.lower().endswith(".json")
    )

    total_repl = 0
    total_vae = 0
    total_load_image = 0
    for path in files:
        name = os.path.basename(path)
        with open(path, encoding="utf-8") as f:
            wf = json.load(f)

        print(f"--- {name} ---")
        rep = fix_model_names(wf, inventory, name)
        vae_added = insert_vae_loader(wf, name)
        load_image_changes = normalize_load_image_widgets(wf, placeholder, name)

        if rep == 0 and not vae_added and load_image_changes == 0:
            print("    no changes")
            print()
            continue

        # Back up original (only the first time — preserves the editor file)
        bak = path + ".bak"
        if not os.path.exists(bak):
            shutil.copy2(path, bak)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)

        total_repl += rep
        if vae_added:
            total_vae += 1
        total_load_image += load_image_changes
        summary = []
        if rep:
            summary.append(f"{rep} model rename(s)")
        if vae_added:
            summary.append("+VAELoader")
        if load_image_changes:
            summary.append(f"{load_image_changes} LoadImage placeholder(s)")
        print(f"    wrote {', '.join(summary)}")
        print()

    print(
        f"==> {total_repl} model-name replacement(s) across {len(files)} files; "
        f"{total_vae} VAELoader insertion(s); "
        f"{total_load_image} LoadImage placeholder(s)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
