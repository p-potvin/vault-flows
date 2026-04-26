import time
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from vaultwares_agentciation.extrovert_agent import ExtrovertAgent
from vaultwares_agentciation.enums import AgentStatus


class ImageAgent(ExtrovertAgent):
    """
    Image Generation & Manipulation Agent.

    Specializes in:
    - Image generation and editing (resize, crop, rotate, sharpen, blur)
    - Mask creation, inpainting, outpainting, and healing
    - Prompt generation and enhancement for image diffusion models
    - Workflow creation and export to ComfyUI/Diffusion formats

    Inherits the full Extrovert personality: heartbeat every 5 seconds,
    status broadcast every minute, socialization on every user interaction.
    """

    AGENT_TYPE = "image"
    SKILLS = [
        "image_generation",
        "image_editing",
        "masking",
        "inpainting",
        "outpainting",
        "prompt_generation",
        "workflow_creation",
        "comfyui_export",
        "nerf_generation",
        "comic_generation",
    ]

    def __init__(
        self,
        agent_id: str = "image-agent",
        channel: str = "tasks",
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_db: int = 0,
    ):
        super().__init__(agent_id, channel, redis_host, redis_port, redis_db)

    # ------------------------------------------------------------------
    # Task Execution
    # ------------------------------------------------------------------

    def _perform_task(self, task: str, details: dict):
        """Execute an image processing task based on the task identifier."""
        print(f"[IMAGE] [{self.agent_id}] Executing image task: {task}")

        handlers = {
            "generate_image": self._generate_image,
            "edit_image": self._edit_image,
            "create_mask": self._create_mask,
            "inpaint": self._inpaint,
            "outpaint": self._outpaint,
            "create_workflow": self._create_image_workflow,
            "export_comfyui": self._export_comfyui,
            "generate_nerf": self._generate_nerf,
            "generate_comic": self._generate_comic,
        }

        handler = handlers.get(task)
        if handler:
            handler(details)
        else:
            print(f"[WARN] [{self.agent_id}] Unknown image task: {task}. Logging and continuing.")
            self._log_unknown_task(task, details)
            super()._perform_task(task, details)

    def _generate_image(self, details: dict):
        """Generate an image from a prompt."""
        prompt = details.get("prompt", "")
        model = details.get("model", "sdxl")
        width = details.get("width", 1024)
        height = details.get("height", 1024)
        print(f"[IMAGE] [{self.agent_id}] Generating image | model={model} | {width}x{height}")
        print(f"   Prompt: '{prompt[:80]}'")
        time.sleep(2)
        result = f"[Image generated: {width}x{height} using {model} | prompt: '{prompt[:40]}...']"
        self._publish_result("generate_image", result)

    def _edit_image(self, details: dict):
        """Apply edits to an image (resize, crop, rotate, sharpen, blur, etc.)."""
        source = details.get("source", "unknown")
        operations = details.get("operations", [])
        print(f"[IMAGE] [{self.agent_id}] Editing image: {source} | operations: {operations}")
        for op in operations:
            time.sleep(0.3)
            print(f"  [DONE] Applied: {op}")
        self._publish_result("edit_image", f"Image '{source}' edited with {len(operations)} operations")

    def _create_mask(self, details: dict):
        """Create a segmentation mask for an image region."""
        source = details.get("source", "unknown")
        region = details.get("region", "auto")
        print(f"[IMAGE] [{self.agent_id}] Creating mask | source={source} | region={region}")
        time.sleep(1)
        self._publish_result("create_mask", f"Mask created for '{source}' region '{region}'")

    def _inpaint(self, details: dict):
        """Inpaint a masked region of an image."""
        source = details.get("source", "unknown")
        prompt = details.get("prompt", "")
        mask = details.get("mask", "auto")
        print(f"[IMAGE] [{self.agent_id}] Inpainting | source={source} | mask={mask}")
        print(f"   Prompt: '{prompt[:80]}'")
        time.sleep(2)
        self._publish_result("inpaint", f"Inpainting complete for '{source}'")

    def _outpaint(self, details: dict):
        """Extend an image beyond its original borders."""
        source = details.get("source", "unknown")
        direction = details.get("direction", "all")
        pixels = details.get("pixels", 256)
        print(f"[IMAGE] [{self.agent_id}] Outpainting | source={source} | direction={direction} | +{pixels}px")
        time.sleep(2)
        self._publish_result("outpaint", f"Outpainting complete for '{source}' - extended {pixels}px {direction}")

    def _create_image_workflow(self, details: dict):
        """Create an image processing workflow definition."""
        workflow_name = details.get("name", "unnamed_workflow")
        steps = details.get("steps", [])
        print(f"[IMAGE] [{self.agent_id}] Creating image workflow: {workflow_name} ({len(steps)} steps)")
        time.sleep(1)
        self._publish_result("create_workflow", f"Image workflow '{workflow_name}' created with {len(steps)} steps")

    def _export_comfyui(self, details: dict):
        """Export a workflow to ComfyUI JSON format."""
        workflow_name = details.get("workflow_name", "unnamed")

        # Security: Prevent path traversal by resolving relative to an exports directory
        base_dir = os.path.abspath("exports")
        requested_path = details.get("output_path", f"{workflow_name}.json")
        resolved_path = os.path.abspath(os.path.join(base_dir, requested_path))

        if os.path.commonpath([base_dir, resolved_path]) != base_dir:
            error_msg = "Invalid output path: Path traversal detected."
            print(f"[ERROR] [{self.agent_id}] Export failed: {error_msg}")
            self._publish_result("export_comfyui", f"Export failed: {error_msg}")
            return

        output_path = resolved_path

        print(f"[IMAGE] [{self.agent_id}] Exporting to ComfyUI: {workflow_name} -> {output_path}")
        time.sleep(1)
        self._publish_result("export_comfyui", f"ComfyUI export complete: {output_path}")

    def _generate_nerf(self, details: dict):
        """Automated generation of NeRF models from a folder of images."""
        images_dir = details.get("images_dir", "unknown")
        model = details.get("model", "instant-ngp")
        print(f"[IMAGE] [{self.agent_id}] Generating NeRF model | model={model}")
        print(f"   Images: '{images_dir}'")
        time.sleep(2)
        result = f"[NeRF model generated using {model} from '{images_dir}']"
        self._publish_result("generate_nerf", result)

    def _generate_comic(self, details: dict):
        """Automated generation of comic book scenes."""
        script = details.get("script", "unknown")
        model_type = details.get("model_type", "checkpoints")
        model_name = details.get("model_name", "comic_model.safetensors")
        print(f"[IMAGE] [{self.agent_id}] Generating comic from script | model={model_name}")
        print(f"   Script: '{script[:80]}'")
        time.sleep(2)
        result = f"[Comic scene generated from script using local model at D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\{model_name}]"
        self._publish_result("generate_comic", result)

    def _log_unknown_task(self, task: str, details: dict):
        """Log an unrecognized task for debugging."""
        print(f"[IMAGE] [{self.agent_id}] Unknown task '{task}' - details: {details}")

    def _publish_result(self, task: str, result: str):
        """Publish a task result back to the Redis channel."""
        self.coordinator.publish(
            "RESULT",
            task,
            {
                "agent": self.agent_id,
                "task": task,
                "result": result,
            },
        )
        print(f"[RESULT] [{self.agent_id}] Result published for task '{task}'")
