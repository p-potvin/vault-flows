"""
Audit each Proven_Workflow .json against:
  - the on-disk model inventory at D:\\comfyui\\resources\\comfyui\\models
  - ComfyUI's /object_info (what node classes are actually registered)

Prints a per-workflow report of: unknown node types, missing model files
(with the closest on-disk alternative), and detected VAE-encode-without-VAE
patterns. Does not modify files — use this to plan fixes.
"""

import json
import os
import sys
import difflib
import urllib.request

INVENTORY_PATH = r"C:\Users\Administrator\AppData\Local\Temp\vf-fix\models_inventory.json"
PROVEN_DIR = r"C:\Users\Administrator\ComfyUI\user\default\workflows\Proven_Workflows"
COMFYUI = "http://127.0.0.1:8188"

# Maps each ComfyUI input name to which inventory subdir we should search
NAME_TO_DIR = {
    "ckpt_name": "checkpoints",
    "lora_name": "loras",
    "vae_name": "vae",
    "unet_name": "unet",
    "model_name": ["checkpoints", "unet", "diffusion_models"],
    "control_net_name": "controlnet",
    "clip_name": "clip",
    "clip_name1": "clip",
    "clip_name2": "clip",
    "clip_vision_name": "clip_vision",
    "upscale_model_name": "upscale_models",
    "ipadapter_file": "ipadapter",
    "embedding_name": "embeddings",
    "style_model_name": "style_models",
    "instantid": "instantid",
}

# Checkpoints that don't have a baked-in VAE → workflows using them must
# also load a VAE separately (and route it into VAEEncode/VAEDecode).
NO_BAKED_VAE = {
    "bigLove_zt3.safetensors",
    "other/bigLove_zt3.safetensors",
    # Some Flux2 checkpoints ship without VAE
    "Flux.2-Klein-9B-RealCoreXL-Zero.safetensors",
    "flux/Flux.2-Klein-9B-RealCoreXL-Zero.safetensors",
}


def load_inventory() -> dict:
    with open(INVENTORY_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_object_info() -> dict:
    return json.loads(urllib.request.urlopen(f"{COMFYUI}/object_info", timeout=15).read())


def closest_in(inventory: dict, subdir, name: str) -> str | None:
    """Return the closest filename in inventory[subdir] to `name`, or None."""
    if isinstance(subdir, list):
        all_files = []
        for s in subdir:
            all_files.extend(inventory.get(s, []))
    else:
        all_files = inventory.get(subdir, [])
    if not all_files:
        return None
    matches = difflib.get_close_matches(name, all_files, n=1, cutoff=0.4)
    if matches:
        return matches[0]
    # Also try matching just the basename (no path)
    base = os.path.basename(name)
    basenames = [(os.path.basename(f), f) for f in all_files]
    matches = difflib.get_close_matches(base, [b[0] for b in basenames], n=1, cutoff=0.4)
    if matches:
        for bn, full in basenames:
            if bn == matches[0]:
                return full
    return None


def audit_workflow(path: str, inventory: dict, object_info: dict) -> dict:
    with open(path, encoding="utf-8") as f:
        wf = json.load(f)

    is_api_format = "nodes" not in wf and any(
        isinstance(v, dict) and "class_type" in v for v in wf.values()
    )

    nodes_iter = []
    if is_api_format:
        for nid, n in wf.items():
            nodes_iter.append((nid, n.get("class_type"), n.get("inputs", {})))
    else:
        for n in wf.get("nodes", []):
            ntype = n.get("type")
            # Collect widget inputs as named where possible. For audit we only
            # care about model-name string widgets, so scan widgets_values for
            # strings ending in .safetensors / .gguf / .pt / .ckpt / .bin
            inputs = {}
            for w in (n.get("widgets_values") or []):
                if isinstance(w, str) and any(
                    w.lower().endswith(ext)
                    for ext in (".safetensors", ".gguf", ".pt", ".ckpt", ".bin", ".pth")
                ):
                    inputs.setdefault("_files", []).append(w)
            nodes_iter.append((str(n.get("id")), ntype, inputs))

    unknown_types: list[str] = []
    missing_files: list[tuple[str, str, str, str | None]] = []   # (ntype, key, value, closest)
    checkpoints_used: list[str] = []
    has_vae_encode_or_decode = False
    has_vae_loader = False

    for nid, ntype, inputs in nodes_iter:
        if not ntype:
            continue
        if ntype not in object_info and ntype not in (
            "Note", "MarkdownNote", "Reroute", "RerouteNode",
            "PrimitiveNode", "PrimitiveBoolean", "PrimitiveInt", "PrimitiveFloat",
            "PrimitiveString", "PrimitiveStringMultiline", "Anchor",
        ):
            unknown_types.append(ntype)

        if ntype in ("VAEEncode", "VAEDecode"):
            has_vae_encode_or_decode = True
        if ntype in ("VAELoader", "VAELoaderGGUF"):
            has_vae_loader = True

        # Walk inputs/widgets for model-file strings
        if is_api_format:
            for key, value in inputs.items():
                if not isinstance(value, str):
                    continue
                if not any(
                    value.lower().endswith(ext)
                    for ext in (".safetensors", ".gguf", ".pt", ".ckpt", ".bin", ".pth")
                ):
                    continue
                subdir = NAME_TO_DIR.get(key, "checkpoints")
                files = (
                    inventory.get(subdir, [])
                    if not isinstance(subdir, list)
                    else sum((inventory.get(s, []) for s in subdir), [])
                )
                if value not in files:
                    norm = value.replace("\\", "/")
                    if norm not in files:
                        closest = closest_in(inventory, subdir, value)
                        missing_files.append((ntype, key, value, closest))
                if key == "ckpt_name":
                    checkpoints_used.append(value)
        else:
            for v in inputs.get("_files", []):
                # Pick the subdir based on node type
                subdir = "checkpoints"
                if ntype in ("VAELoader", "VAELoaderGGUF"):
                    subdir = "vae"
                elif ntype in ("LoraLoader", "LoraLoaderModelOnly", "LoraLoaderTagsQuery"):
                    subdir = "loras"
                elif "Unet" in ntype or "UNET" in ntype:
                    subdir = "unet"
                elif "ControlNet" in ntype:
                    subdir = "controlnet"
                elif "Upscale" in ntype:
                    subdir = "upscale_models"
                files = inventory.get(subdir, [])
                norm = v.replace("\\", "/")
                if v not in files and norm not in files:
                    closest = closest_in(inventory, subdir, v)
                    missing_files.append((ntype, subdir, v, closest))
                if ntype in ("CheckpointLoaderSimple", "CheckpointLoader"):
                    checkpoints_used.append(v)

    needs_vae_loader_inserted = (
        has_vae_encode_or_decode
        and not has_vae_loader
        and any(c.replace("\\", "/") in NO_BAKED_VAE for c in checkpoints_used)
    )

    return {
        "file": os.path.basename(path),
        "format": "api" if is_api_format else "editor",
        "node_count": len(nodes_iter),
        "unknown_types": sorted(set(unknown_types)),
        "missing_files": missing_files,
        "checkpoints_used": sorted(set(checkpoints_used)),
        "needs_vae_loader_inserted": needs_vae_loader_inserted,
    }


def main() -> int:
    inventory = load_inventory()
    object_info = load_object_info()
    files = sorted(
        os.path.join(PROVEN_DIR, f)
        for f in os.listdir(PROVEN_DIR)
        if f.lower().endswith(".json")
    )
    print(f"Auditing {len(files)} workflows against {len(object_info)} ComfyUI node classes\n")

    for f in files:
        a = audit_workflow(f, inventory, object_info)
        print(f"=== {a['file']}  ({a['format']}, {a['node_count']} nodes) ===")
        if a["checkpoints_used"]:
            print(f"  ckpt: {', '.join(a['checkpoints_used'])}")
        if a["unknown_types"]:
            print(f"  UNKNOWN node types: {a['unknown_types']}")
        if a["missing_files"]:
            for ntype, key, val, closest in a["missing_files"]:
                marker = "→ " + closest if closest else "(NO CLOSE MATCH)"
                print(f"  MISSING FILE [{ntype}/{key}]: {val}  {marker}")
        if a["needs_vae_loader_inserted"]:
            print(f"  [!] VAEEncode/Decode present but no VAELoader, and checkpoint has no baked-in VAE")
        if not a["unknown_types"] and not a["missing_files"] and not a["needs_vae_loader_inserted"]:
            print("  [OK] clean")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
