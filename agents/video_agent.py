import time
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from vaultwares_agentciation.extrovert_agent import ExtrovertAgent


class VideoAgent(ExtrovertAgent):
    """
    Video Generation & Manipulation Agent.

    Specializes in:
    - Video sampling, trimming, resizing, and frame-level processing
    - Per-frame effects, overlays, and stabilization
    - Video description and per-frame captioning
    - Workflow creation and export to ComfyUI/Diffusion formats

    Inherits the full Extrovert personality: heartbeat every 5 seconds,
    status broadcast every minute, socialization on every user interaction.
    """

    AGENT_TYPE = "video"
    SKILLS = [
        "video_trimming",
        "video_resizing",
        "frame_sampling",
        "per_frame_effects",
        "video_captioning",
        "video_analysis",
        "workflow_creation",
        "comfyui_export",
        "video_interpolation",
        "audio_reactive_visuals",
        "generate_foley",
        "motion_capture_transfer",
        "text_to_video_generation",
    ]

    def __init__(
        self,
        agent_id: str = "video-agent",
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
        """Execute a video processing task based on the task identifier."""
        print(f"[VIDEO] [{self.agent_id}] Executing video task: {task}")

        handlers = {
            "trim_video": self._trim_video,
            "resize_video": self._resize_video,
            "sample_frames": self._sample_frames,
            "apply_effects": self._apply_effects,
            "generate_caption": self._generate_video_caption,
            "analyze_video": self._analyze_video,
            "create_workflow": self._create_video_workflow,
            "export_comfyui": self._export_comfyui,
            "interpolate_video": self._interpolate_video,
            "generate_audio_reactive_visuals": self._generate_audio_reactive_visuals,
            "generate_foley": self._generate_foley,
            "motion_capture_transfer": self._motion_capture_transfer,
            "generate_video_from_text": self._generate_video_from_text,
        }

        handler = handlers.get(task)
        if handler:
            handler(details)
        else:
            print(
                f"[WARN] [{self.agent_id}] Unknown video task: {task}. Logging and continuing."
            )
            self._log_unknown_task(task, details)
            super()._perform_task(task, details)

    def _trim_video(self, details: dict):
        """Trim a video to a specified time range."""
        source = details.get("source", "unknown")
        start = details.get("start_time", 0)
        end = details.get("end_time", None)
        print(
            f"[VIDEO] [{self.agent_id}] Trimming video | source={source} | {start}s -> {end}s"
        )
        time.sleep(1)
        self._publish_result(
            "trim_video", f"Video '{source}' trimmed from {start}s to {end}s"
        )

    def _resize_video(self, details: dict):
        """Resize a video to specified dimensions."""
        source = details.get("source", "unknown")
        width = details.get("width", 1280)
        height = details.get("height", 720)
        print(
            f"[VIDEO] [{self.agent_id}] Resizing video | source={source} | {width}x{height}"
        )
        time.sleep(1)
        self._publish_result(
            "resize_video", f"Video '{source}' resized to {width}x{height}"
        )

    def _sample_frames(self, details: dict):
        """Extract a set of frames from a video at specified intervals."""
        source = details.get("source", "unknown")
        fps = details.get("fps", 1)
        count = details.get("count", None)
        print(
            f"[VIDEO] [{self.agent_id}] Sampling frames | source={source} | fps={fps} | count={count}"
        )
        time.sleep(1)
        frames_sampled = count if count else "all"
        self._publish_result(
            "sample_frames",
            f"Sampled {frames_sampled} frames from '{source}' at {fps} fps",
        )

    def _apply_effects(self, details: dict):
        """Apply per-frame effects and overlays to a video."""
        source = details.get("source", "unknown")
        effects = details.get("effects", [])
        print(
            f"[VIDEO] [{self.agent_id}] Applying effects | source={source} | effects={effects}"
        )
        for effect in effects:
            time.sleep(0.3)
            print(f"  [DONE] Applied effect: {effect}")
        self._publish_result(
            "apply_effects", f"Applied {len(effects)} effects to '{source}'"
        )

    def _generate_video_caption(self, details: dict):
        """Generate a caption or summary for a video."""
        source = details.get("source", "unknown")
        caption_style = details.get("caption_style", "detailed")
        print(
            f"[VIDEO] [{self.agent_id}] Generating video caption | source={source} | style={caption_style}"
        )
        time.sleep(1)
        result = f"[Video caption for '{source}' in '{caption_style}' style]"
        self._publish_result("generate_caption", result)

    def _analyze_video(self, details: dict):
        """Perform analysis on a video (scene detection, object tracking, etc.)."""
        source = details.get("source", "unknown")
        analysis_type = details.get("analysis_type", "general")
        print(
            f"[VIDEO] [{self.agent_id}] Analyzing video | source={source} | type={analysis_type}"
        )
        time.sleep(2)
        result = f"[Video analysis '{analysis_type}' complete for '{source}']"
        self._publish_result("analyze_video", result)

    def _create_video_workflow(self, details: dict):
        """Create a video processing workflow definition."""
        workflow_name = details.get("name", "unnamed_workflow")
        steps = details.get("steps", [])
        print(
            f"[VIDEO] [{self.agent_id}] Creating video workflow: {workflow_name} ({len(steps)} steps)"
        )
        time.sleep(1)
        self._publish_result(
            "create_workflow",
            f"Video workflow '{workflow_name}' created with {len(steps)} steps",
        )

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

        print(
            f"[VIDEO] [{self.agent_id}] Exporting to ComfyUI: {workflow_name} -> {output_path}"
        )
        time.sleep(1)
        self._publish_result(
            "export_comfyui", f"ComfyUI export complete: {output_path}"
        )

    def _interpolate_video(self, details: dict):
        """Interpolate video frames to increase framerate."""
        source = details.get("source", "unknown")
        model = details.get("model", "rife-v4.6")
        model_type = details.get("model_type", "video_models")

        print(
            f"🔄 [{self.agent_id}] Interpolating video | source={source} | model={model}"
        )
        print("   [Delegating frame extraction to ImageAgent...]")
        time.sleep(1)
        print("   [Delegating scene analysis to TextAgent...]")
        time.sleep(1)
        print(
            f"   Using local model path: D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\_{model}"
        )
        time.sleep(2)

        result = f"[Video '{source}' interpolated using {model}]"
        self._publish_result("interpolate_video", result)

    def _generate_audio_reactive_visuals(self, details: dict):
        """Generate audio-reactive visuals."""
        audio = details.get("audio", "unknown_audio")
        model = details.get("model", "audio-react-v1")
        model_type = details.get("model_type", "video_models")

        print(
            f"🎵 [{self.agent_id}] Generating audio-reactive visuals | audio={audio} | model={model}"
        )
        print("   [Delegating frame generation to ImageAgent...]")
        time.sleep(1)
        print("   [Delegating prompt refinement to TextAgent...]")
        time.sleep(1)
        print(
            f"   Using local model path: D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\_{model}"
        )
        time.sleep(2)

        result = f"[Audio-reactive visuals generated for '{audio}' using {model}]"
        self._publish_result("generate_audio_reactive_visuals", result)

    def _generate_foley(self, details: dict):
        """Generate foley sounds and reduce noise."""
        source = details.get("source", "unknown_audio")
        model = details.get("model", "foley-gen-v1")
        model_type = details.get("model_type", "audio_models")

        print(
            f"🔊 [{self.agent_id}] Reducing noise & generating foley | source={source} | model={model}"
        )
        time.sleep(1)
        print(
            f"   Using local model path: D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\_{model}"
        )
        time.sleep(2)

        result = f"[Foley generated & noise reduced for '{source}' using {model}]"
        self._publish_result("generate_foley", result)

    def _generate_video_from_text(self, details: dict):
        """Generates a video from a text prompt using local models."""
        prompt = details.get("prompt", "unknown prompt")
        model_type = details.get("model_type", "diffusion")
        model_name = details.get("model_name", "model_v1")

        print(
            f"🎬 [{self.agent_id}] Generating video from text | prompt={prompt} | Using local model at D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\{model_name}"
        )
        time.sleep(1)
        print(f"✅ [{self.agent_id}] Video generation complete.")

    def _motion_capture_transfer(self, details: dict):
        """Automated human pose transfer, hand-tracking refinement, and facial re-targeting."""
        source = details.get("source", "unknown_video")
        model = details.get("model", "pose-transfer-v1.safetensors")
        model_type = details.get("model_type", "motion_capture")

        print(
            f"🏃 [{self.agent_id}] Transferring motion & pose | source={source} | model={model}"
        )
        time.sleep(1)
        print(
            f"   Using local model path: D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\_{model}"
        )
        time.sleep(2)

        result = f"[Motion capture and pose transferred for '{source}' using local model at D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\_{model}]"
        self._publish_result("motion_capture_transfer", result)

    def _log_unknown_task(self, task: str, details: dict):
        """Log an unrecognized task for debugging."""
        print(f"[VIDEO] [{self.agent_id}] Unknown task '{task}' - details: {details}")

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
