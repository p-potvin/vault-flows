"""
Machine-local runtime bridge for Vault Flows.

This service is intended to run on the same Windows machine as ComfyUI and any
optional local video tooling such as FaceFusion. The deployed Vercel frontend
uses it as a control/data bridge for:
  - scanning the exact local model directory
  - running a local image-to-video face-swap job
  - previewing/downloading the resulting local video

It uses only the Python standard library so the repo does not gain new
dependencies.
"""

from __future__ import annotations

import argparse
import cgi
import datetime as dt
import json
import mimetypes
import shutil
import subprocess
import tempfile
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse


MODEL_GROUP_PATHS = {
    "checkpoints": Path("checkpoints"),
    "loras": Path("loras"),
    "insightface": Path("insightface"),
    "hyperswap": Path("hyperswap"),
    "reactorFaces": Path("reactor") / "faces",
    "facerestoreModels": Path("facerestore_models"),
    "ultralytics": Path("ultralytics"),
    "sams": Path("sams"),
}

ALLOWED_EXTENSIONS = {
    ".safetensors",
    ".ckpt",
    ".pt",
    ".pth",
    ".onnx",
    ".bin",
    ".json",
    ".yaml",
    ".yml",
}

JOB_ROOT = Path(tempfile.gettempdir()) / "vault-flows-local-runtime"
JOB_ROOT.mkdir(parents=True, exist_ok=True)

JOB_OUTPUTS: Dict[str, Path] = {}


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    encoded = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(encoded)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(encoded)


def error_response(handler: BaseHTTPRequestHandler, status: int, message: str) -> None:
    json_response(handler, status, {"error": message})


def scan_models(models_dir: str) -> dict:
    if not models_dir:
        raise ValueError("modelsDir is required")

    root = Path(models_dir)
    if not root.exists():
        raise FileNotFoundError(f"Model directory does not exist: {models_dir}")

    categories = {}
    warnings: List[str] = []

    for group_key, relative_path in MODEL_GROUP_PATHS.items():
        target_dir = root / relative_path
        entries = []

        if target_dir.exists():
            for file_path in sorted(target_dir.rglob("*")):
                if file_path.is_dir():
                    continue
                if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
                    continue
                relative = file_path.relative_to(root).as_posix()
                entries.append(
                    {
                        "name": file_path.name,
                        "relativePath": relative,
                        "value": file_path.stem,
                    }
                )
        else:
            warnings.append(f"Missing model subfolder: {target_dir}")

        categories[group_key] = entries

    return {
        "source": "local-bridge",
        "scannedAt": dt.datetime.utcnow().isoformat() + "Z",
        "modelsDir": str(root),
        "warnings": warnings,
        "categories": categories,
    }


def resolve_command(command: str) -> List[str]:
    command = command.strip() if command else "facefusion"
    if not command:
        command = "facefusion"
    parts = command.split()
    executable = parts[0]

    if not shutil.which(executable) and not Path(executable).exists():
        raise FileNotFoundError(
            f"Could not resolve FaceFusion command '{command}'. Install FaceFusion or update facefusionCommand."
        )

    return parts


def normalize_output_name(output_name: str, target_name: str) -> str:
    if output_name and output_name.strip():
        return output_name.strip()

    target_suffix = Path(target_name).suffix or ".mp4"
    return f"vault-faceswap-output{target_suffix}"


def run_faceswap_job(job: dict, source_path: Path, target_path: Path, server_host: str, server_port: int) -> dict:
    job_id = uuid.uuid4().hex
    job_dir = JOB_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_name = normalize_output_name(job.get("outputName", ""), target_path.name)
    requested_save_dir = job.get("saveDirectory", "")
    output_dir = Path(requested_save_dir) if requested_save_dir else job_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / output_name

    command = resolve_command(job.get("facefusionCommand", "facefusion"))
    processors = ["face_swapper"]
    selected_models = job.get("selectedModels", {}) or {}
    restore_model = (selected_models.get("restoreModel") or "").strip()
    swap_model = (
        (selected_models.get("alternateSwapModel") or "").strip()
        or (selected_models.get("swapModel") or "").strip()
    )

    cli = [
        *command,
        "headless-run",
        "--source-paths",
        str(source_path),
        "--target-path",
        str(target_path),
        "--output-path",
        str(output_path),
        "--processors",
        *processors,
    ]

    if swap_model:
        cli.extend(["--face-swapper-model", swap_model])

    if restore_model:
        processors.append("face_enhancer")
        cli = [
            *command,
            "headless-run",
            "--source-paths",
            str(source_path),
            "--target-path",
            str(target_path),
            "--output-path",
            str(output_path),
            "--processors",
            *processors,
            "--face-enhancer-model",
            restore_model,
        ]
        if swap_model:
            cli.extend(["--face-swapper-model", swap_model])

    process = subprocess.run(
        cli,
        capture_output=True,
        text=True,
        check=False,
    )

    if process.returncode != 0:
        raise RuntimeError(process.stderr.strip() or process.stdout.strip() or "FaceFusion exited with a non-zero code.")

    JOB_OUTPUTS[job_id] = output_path

    preview_url = f"http://{server_host}:{server_port}/jobs/{job_id}/output"

    return {
        "status": "completed",
        "jobId": job_id,
        "outputPath": str(output_path),
        "previewUrl": preview_url,
        "stdout": process.stdout[-4000:],
    }


class VaultFlowsBridgeHandler(BaseHTTPRequestHandler):
    server_version = "VaultFlowsLocalBridge/0.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            json_response(self, HTTPStatus.OK, {"status": "ok"})
            return

        if parsed.path.startswith("/jobs/") and parsed.path.endswith("/output"):
            job_id = parsed.path.split("/")[2]
            output_path = JOB_OUTPUTS.get(job_id)
            if not output_path or not output_path.exists():
                error_response(self, HTTPStatus.NOT_FOUND, "Job output not found.")
                return

            mime_type = mimetypes.guess_type(output_path.name)[0] or "application/octet-stream"
            payload = output_path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Content-Disposition", f'inline; filename="{output_path.name}"')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(payload)
            return

        error_response(self, HTTPStatus.NOT_FOUND, "Route not found.")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/models/scan":
            self.handle_model_scan()
            return

        if parsed.path == "/faceswap/run":
            self.handle_faceswap_run()
            return

        error_response(self, HTTPStatus.NOT_FOUND, "Route not found.")

    def handle_model_scan(self) -> None:
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode("utf-8") or "{}")
            result = scan_models(payload.get("modelsDir", ""))
        except Exception as exc:  # noqa: BLE001
            error_response(self, HTTPStatus.BAD_REQUEST, str(exc))
            return

        json_response(self, HTTPStatus.OK, result)

    def handle_faceswap_run(self) -> None:
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )

            job_field = form["job"] if "job" in form else None
            source_field = form["source"] if "source" in form else None
            target_field = form["target"] if "target" in form else None

            if job_field is None or source_field is None or target_field is None:
                raise ValueError("job, source, and target fields are required")

            job = json.loads(job_field.value)
            upload_dir = JOB_ROOT / f"uploads-{uuid.uuid4().hex}"
            upload_dir.mkdir(parents=True, exist_ok=True)

            source_name = Path(source_field.filename or "source.png").name
            target_name = Path(target_field.filename or "target.mp4").name

            source_path = upload_dir / source_name
            target_path = upload_dir / target_name
            source_path.write_bytes(source_field.file.read())
            target_path.write_bytes(target_field.file.read())

            result = run_faceswap_job(
                job,
                source_path,
                target_path,
                self.server.server_address[0],
                self.server.server_address[1],
            )
        except Exception as exc:  # noqa: BLE001
            error_response(self, HTTPStatus.BAD_REQUEST, str(exc))
            return

        json_response(self, HTTPStatus.OK, result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Vault Flows local runtime bridge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8484)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), VaultFlowsBridgeHandler)
    print(f"[VaultFlows local bridge] Listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[VaultFlows local bridge] Shutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
