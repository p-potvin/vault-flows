# vault-flows · Proven_Workflows diagnostic
_Local static validator vs ComfyUI's `/object_info` (4038 node classes, live) + on-disk model inventory._  
_No jobs queued — zero GPU load._
_Total seeded workflows: **14**_

## Summary
| ID | Verdict | Probe |
|---|---|---|
| `basic-lora-text2img` | **BROKEN_WIRING** | 1 node(s) failed static validation |
| `biglove-photo` | **PASS** | static validation passed (no GPU work performed) |
| `copilot-face-paste-img2img` | **BLOCKED_UNKNOWN_PACK** | 12 node(s) failed static validation |
| `custom-realistic` | **BLOCKED_SUBGRAPH** | 2 node(s) failed static validation |
| `flux-conditioner-sampler-upscaler` | **BLOCKED_SUBGRAPH** | 1 node(s) failed static validation |
| `flux2-klein-faceswap` | **BLOCKED_UNKNOWN_PACK** | 10 node(s) failed static validation |
| `gonzalomo-dmd-v30` | **BLOCKED_SUBGRAPH** | 2 node(s) failed static validation |
| `ipadapter-faceswap` | **PASS** | static validation passed (no GPU work performed) |
| `openpose-i2i` | **BLOCKED_MISSING_MODEL** | 1 node(s) failed static validation |
| `qwen-edit-multi-angle` | **BROKEN_WIRING** | 2 node(s) failed static validation |
| `qwen-image-edit-4step` | **VALIDATION_OTHER** | 1 node(s) failed static validation |
| `qwen-image-text2img` | **BLOCKED_SUBGRAPH** | 2 node(s) failed static validation |
| `wan22-img2video` | **BLOCKED_UNKNOWN_PACK** | 9 node(s) failed static validation |
| `z-image-turbo-text2img` | **PASS** | static validation passed (no GPU work performed) |

---

## `basic-lora-text2img` — **BROKEN_WIRING**
- **Display name:** Basic · LoRA-Loaded Text-to-Image
- **Source file:** `(unknown)`
- **Total nodes:** 26  · ok: 26, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `[]`
- **ComfyUI probe:** **VALIDATION** — 1 node(s) failed static validation

### Required inputs that are not wired / empty
- node `101` (`ImageUpscaleWithModel`) — required input `image` is empty (current: `(missing)`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `101` (`ImageUpscaleWithModel`): Required input is missing — input 'image'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 1 | `CheckpointLoaderSimple` | ✓ |
| 2 | `LoraLoader` | ✓ |
| 3 | `CLIPTextEncode` | ✓ |
| 4 | `CLIPTextEncode` | ✓ |
| 5 | `EmptyLatentImage` | ✓ |
| 6 | `KSampler` | ✓ |
| 7 | `VAEDecode` | ✓ |
| 8 | `SaveImage` | ✓ |
| 11 | `CLIPSetLastLayer` | ✓ |
| 98 | `SaveImage` | ✓ |
| 100 | `UpscaleModelLoader` | ✓ |
| 101 | `ImageUpscaleWithModel` | ✓ |
| 118 | `LoraLoader` | ✓ |
| 120 | `CLIPSetLastLayer` | ✓ |
| 121 | `CLIPTextEncode` | ✓ |
| 122 | `CLIPTextEncode` | ✓ |
| 123 | `KSampler` | ✓ |
| 124 | `VAEDecode` | ✓ |
| 125 | `EmptyLatentImage` | ✓ |
| 128 | `LatentUpscale` | ✓ |
| 130 | `KSampler` | ✓ |
| 133 | `VAEDecode` | ✓ |
| 138 | `ImageSharpen` | ✓ |
| 139 | `SaveImage` | ✓ |
| 140 | `WorkflowPrettifier` | ✓ |
| 141 | `VAELoader` | ✓ |

---

## `biglove-photo` — **PASS**
- **Display name:** BigLove · Photo (bigLove_zt3)
- **Source file:** `(unknown)`
- **Total nodes:** 10  · ok: 10, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **PASS** — static validation passed (no GPU work performed)

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 1 | `CheckpointLoaderSimple` | ✓ |
| 3 | `CLIPTextEncode` | ✓ |
| 4 | `CLIPTextEncode` | ✓ |
| 10 | `LoraLoader` | ✓ |
| 11 | `SaveImage` | ✓ |
| 12 | `KSampler` | ✓ |
| 14 | `VAEEncode` | ✓ |
| 16 | `VAEDecode` | ✓ |
| 17 | `LoadImage` | ✓ |
| 19 | `ImageScaleBy` | ✓ |

---

## `copilot-face-paste-img2img` — **BLOCKED_UNKNOWN_PACK**
- **Display name:** Copilot · Face Paste Img2Img
- **Source file:** `(unknown)`
- **Total nodes:** 14  · ok: 9, ui-only: 0, subgraph-uuid: 0, unknown-pack: 5
- **input_paths:** `['source_image', 'target_image']`
- **image_inputs:** `['source_image', 'target_image']`
- **ComfyUI probe:** **VALIDATION** — 12 node(s) failed static validation

### Unknown class_types (not in any installed pack)
- node `3` → `FaceDetectorInsightFace`
- node `4` → `FaceDetectorInsightFace`
- node `6` → `ImagePasteFace`
- node `7` → `Flux2KleinCheckpointLoader`
- node `11` → `MaskToLatent`

_Action: either install the pack into `D:\comfyui\resources\comfyui\custom_nodes\` and restart ComfyUI, or replace the node with a registered equivalent._

### Required inputs that are not wired / empty
- node `1` (`LoadImage`) — required input `image` is empty (current: `(missing)`)
- node `2` (`LoadImage`) — required input `image` is empty (current: `(missing)`)
- node `5` (`FaceAlign`) — required input `analysis_models` is empty (current: `(missing)`)
- node `5` (`FaceAlign`) — required input `image_from` is empty (current: `(missing)`)
- node `8` (`CLIPTextEncode`) — required input `text` is empty (current: `(missing)`)
- node `8` (`CLIPTextEncode`) — required input `clip` is empty (current: `(missing)`)
- node `9` (`CLIPTextEncode`) — required input `text` is empty (current: `(missing)`)
- node `9` (`CLIPTextEncode`) — required input `clip` is empty (current: `(missing)`)
- node `10` (`VAEEncode`) — required input `pixels` is empty (current: `(missing)`)
- node `10` (`VAEEncode`) — required input `vae` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `model` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `seed` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `steps` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `cfg` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `sampler_name` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `scheduler` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `positive` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `negative` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `latent_image` is empty (current: `(missing)`)
- node `12` (`KSampler`) — required input `denoise` is empty (current: `(missing)`)
- node `13` (`VAEDecode`) — required input `samples` is empty (current: `(missing)`)
- node `13` (`VAEDecode`) — required input `vae` is empty (current: `(missing)`)
- node `14` (`SaveImage`) — required input `images` is empty (current: `(missing)`)
- node `14` (`SaveImage`) — required input `filename_prefix` is empty (current: `(missing)`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `3` (`FaceDetectorInsightFace`): missing_node_type — Node 'FaceDetectorInsightFace' not found. The custom node may not be installed.
- node `4` (`FaceDetectorInsightFace`): missing_node_type — Node 'FaceDetectorInsightFace' not found. The custom node may not be installed.
- node `5` (`FaceAlign`): Required input is missing — input 'analysis_models'
- node `5` (`FaceAlign`): Required input is missing — input 'image_from'
- node `6` (`ImagePasteFace`): missing_node_type — Node 'ImagePasteFace' not found. The custom node may not be installed.
- node `7` (`Flux2KleinCheckpointLoader`): missing_node_type — Node 'Flux2KleinCheckpointLoader' not found. The custom node may not be installed.
- node `8` (`CLIPTextEncode`): Required input is missing — input 'text'
- node `8` (`CLIPTextEncode`): Required input is missing — input 'clip'
- node `9` (`CLIPTextEncode`): Required input is missing — input 'text'
- node `9` (`CLIPTextEncode`): Required input is missing — input 'clip'
- node `10` (`VAEEncode`): Required input is missing — input 'pixels'
- node `10` (`VAEEncode`): Required input is missing — input 'vae'
- node `11` (`MaskToLatent`): missing_node_type — Node 'MaskToLatent' not found. The custom node may not be installed.
- node `12` (`KSampler`): Required input is missing — input 'model'
- node `12` (`KSampler`): Required input is missing — input 'seed'
- node `12` (`KSampler`): Required input is missing — input 'steps'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 1 | `LoadImage` | ✓ |
| 2 | `LoadImage` | ✓ |
| 3 | `FaceDetectorInsightFace` | **UNKNOWN** |
| 4 | `FaceDetectorInsightFace` | **UNKNOWN** |
| 5 | `FaceAlign` | ✓ |
| 6 | `ImagePasteFace` | **UNKNOWN** |
| 7 | `Flux2KleinCheckpointLoader` | **UNKNOWN** |
| 8 | `CLIPTextEncode` | ✓ |
| 9 | `CLIPTextEncode` | ✓ |
| 10 | `VAEEncode` | ✓ |
| 11 | `MaskToLatent` | **UNKNOWN** |
| 12 | `KSampler` | ✓ |
| 13 | `VAEDecode` | ✓ |
| 14 | `SaveImage` | ✓ |

---

## `custom-realistic` — **BLOCKED_SUBGRAPH**
- **Display name:** Custom · Realistic Workflow v1
- **Source file:** `(unknown)`
- **Total nodes:** 23  · ok: 21, ui-only: 0, subgraph-uuid: 2, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 2 node(s) failed static validation

### Subgraph references (UUID-named — need expansion)
- node `172` → subgraph `48aa749a-985d-4692-99d0-6342aabc07a1`
- node `179` → subgraph `40dd6f89-e5d9-4770-80b6-a68b12a877e9`

_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._

### Model files referenced but not on disk
- node `117` `model_name`: `sam_vit_b_01ec64.pth`
- node `118` `model_name`: `bbox/face_yolov8m.pt`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### Required inputs that are not wired / empty
- node `116` (`FaceDetailer`) — required input `wildcard` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `172` (`48aa749a-985d-4692-99d0-6342aabc07a1`): missing_node_type — Node '48aa749a-985d-4692-99d0-6342aabc07a1' not found. The custom node may not be installed.
- node `179` (`40dd6f89-e5d9-4770-80b6-a68b12a877e9`): missing_node_type — Node '40dd6f89-e5d9-4770-80b6-a68b12a877e9' not found. The custom node may not be installed.

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `CLIPTextEncode` | ✓ |
| 66 | `ModelSamplingAuraFlow` | ✓ |
| 73 | `LoraLoaderModelOnly` | ✓ |
| 82 | `LoadImage` | ✓ |
| 100 | `KSampler` | ✓ |
| 106 | `VAEDecode` | ✓ |
| 107 | `CLIPTextEncode` | ✓ |
| 108 | `CLIPTextEncode` | ✓ |
| 110 | `CheckpointLoaderSimple` | ✓ |
| 116 | `FaceDetailer` | ✓ |
| 117 | `SAMLoader` | ✓ |
| 118 | `UltralyticsDetectorProvider` | ✓ |
| 119 | `SaveImage` | ✓ |
| 127 | `SamplerCustom` | ✓ |
| 131 | `SamplerDPMPP_3M_SDE` | ✓ |
| 148 | `ManualSigmas` | ✓ |
| 161 | `PreviewAny` | ✓ |
| 172 | `48aa749a-985d-4692-99d0-6342aabc07a1` | **subgraph** |
| 179 | `40dd6f89-e5d9-4770-80b6-a68b12a877e9` | **subgraph** |
| 180 | `EmptyLatentImage` | ✓ |
| 181 | `LoraLoaderModelOnly` | ✓ |

---

## `flux-conditioner-sampler-upscaler` — **BLOCKED_SUBGRAPH**
- **Display name:** Flux · Conditioner + Sampler + Upscaler
- **Source file:** `(unknown)`
- **Total nodes:** 22  · ok: 21, ui-only: 0, subgraph-uuid: 1, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 1 node(s) failed static validation

### Subgraph references (UUID-named — need expansion)
- node `179` → subgraph `40dd6f89-e5d9-4770-80b6-a68b12a877e9`

_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._

### Model files referenced but not on disk
- node `117` `model_name`: `sam_vit_b_01ec64.pth`
- node `118` `model_name`: `bbox/face_yolov8m.pt`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### Required inputs that are not wired / empty
- node `116` (`FaceDetailer`) — required input `wildcard` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `179` (`40dd6f89-e5d9-4770-80b6-a68b12a877e9`): missing_node_type — Node '40dd6f89-e5d9-4770-80b6-a68b12a877e9' not found. The custom node may not be installed.

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `CLIPTextEncode` | ✓ |
| 66 | `ModelSamplingAuraFlow` | ✓ |
| 73 | `LoraLoaderModelOnly` | ✓ |
| 82 | `LoadImage` | ✓ |
| 100 | `KSampler` | ✓ |
| 106 | `VAEDecode` | ✓ |
| 107 | `CLIPTextEncode` | ✓ |
| 108 | `CLIPTextEncode` | ✓ |
| 110 | `CheckpointLoaderSimple` | ✓ |
| 116 | `FaceDetailer` | ✓ |
| 117 | `SAMLoader` | ✓ |
| 118 | `UltralyticsDetectorProvider` | ✓ |
| 119 | `SaveImage` | ✓ |
| 127 | `SamplerCustom` | ✓ |
| 131 | `SamplerDPMPP_3M_SDE` | ✓ |
| 148 | `ManualSigmas` | ✓ |
| 161 | `PreviewAny` | ✓ |
| 179 | `40dd6f89-e5d9-4770-80b6-a68b12a877e9` | **subgraph** |
| 180 | `EmptyLatentImage` | ✓ |
| 181 | `LoraLoaderModelOnly` | ✓ |

---

## `flux2-klein-faceswap` — **BLOCKED_UNKNOWN_PACK**
- **Display name:** Flux 2 Klein · Swap Anything Face
- **Source file:** `(unknown)`
- **Total nodes:** 34  · ok: 25, ui-only: 0, subgraph-uuid: 4, unknown-pack: 5
- **input_paths:** `['source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 10 node(s) failed static validation

### Unknown class_types (not in any installed pack)
- node `17` → `LoadImageWithFilename`
- node `222` → `Image to RGB [RvTools]`
- node `235` → `easy sam3ModelLoader`
- node `238` → `easy sam3ImageSegmentation`
- node `239` → `easy sam3ImageSegmentation`

_Action: either install the pack into `D:\comfyui\resources\comfyui\custom_nodes\` and restart ComfyUI, or replace the node with a registered equivalent._

### Subgraph references (UUID-named — need expansion)
- node `107` → subgraph `1281d878-1b10-4aca-954c-ff3b574ed964`
- node `108` → subgraph `902b498e-9da3-49d7-9e9f-ec6e6823617a`
- node `135` → subgraph `86edf968-01da-418b-9481-9b6fd5e77419`
- node `253` → subgraph `da170350-5970-41f2-9470-620ac73ce40d`

_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._

### Model files referenced but not on disk
- node `121` `unet_name`: `FluxKlein9b.safetensors`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### Required inputs that are not wired / empty
- node `16` (`easy positive`) — required input `positive` is empty (current: `""`)
- node `112` (`CLIPTextEncode`) — required input `text` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `17` (`LoadImageWithFilename`): missing_node_type — Node 'LoadImageWithFilename' not found. The custom node may not be installed.
- node `107` (`1281d878-1b10-4aca-954c-ff3b574ed964`): missing_node_type — Node '1281d878-1b10-4aca-954c-ff3b574ed964' not found. The custom node may not be installed.
- node `108` (`902b498e-9da3-49d7-9e9f-ec6e6823617a`): missing_node_type — Node '902b498e-9da3-49d7-9e9f-ec6e6823617a' not found. The custom node may not be installed.
- node `121` (`UNETLoader`): Value not in list — input 'unet_name': 'FluxKlein9b.safetensors'
- node `135` (`86edf968-01da-418b-9481-9b6fd5e77419`): missing_node_type — Node '86edf968-01da-418b-9481-9b6fd5e77419' not found. The custom node may not be installed.
- node `222` (`Image to RGB [RvTools]`): missing_node_type — Node 'Image to RGB [RvTools]' not found. The custom node may not be installed.
- node `235` (`easy sam3ModelLoader`): missing_node_type — Node 'easy sam3ModelLoader' not found. The custom node may not be installed.
- node `238` (`easy sam3ImageSegmentation`): missing_node_type — Node 'easy sam3ImageSegmentation' not found. The custom node may not be installed.
- node `239` (`easy sam3ImageSegmentation`): missing_node_type — Node 'easy sam3ImageSegmentation' not found. The custom node may not be installed.
- node `253` (`da170350-5970-41f2-9470-620ac73ce40d`): missing_node_type — Node 'da170350-5970-41f2-9470-620ac73ce40d' not found. The custom node may not be installed.

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 1 | `DrawMaskOnImage` | ✓ |
| 9 | `PreviewImage` | ✓ |
| 12 | `PreviewImage` | ✓ |
| 14 | `ImageScaleToTotalPixels` | ✓ |
| 16 | `easy positive` | ✓ |
| 17 | `LoadImageWithFilename` | **UNKNOWN** |
| 21 | `Power Lora Loader (rgthree)` | ✓ |
| 24 | `MaskComposite` | ✓ |
| 27 | `PreviewImage` | ✓ |
| 104 | `GrowMask` | ✓ |
| 107 | `1281d878-1b10-4aca-954c-ff3b574ed964` | **subgraph** |
| 108 | `902b498e-9da3-49d7-9e9f-ec6e6823617a` | **subgraph** |
| 109 | `CLIPTextEncode` | ✓ |
| 112 | `CLIPTextEncode` | ✓ |
| 113 | `VAELoader` | ✓ |
| 115 | `SaveImage` | ✓ |
| 116 | `Image Comparer (rgthree)` | ✓ |
| 117 | `PathchSageAttentionKJ` | ✓ |
| 118 | `GetImageSize` | ✓ |
| 120 | `ImageScaleToTotalPixels` | ✓ |
| 121 | `UNETLoader` | ✓ |
| 123 | `CLIPLoader` | ✓ |
| 130 | `Latent Switch (JPS)` | ✓ |
| 131 | `EmptyFlux2LatentImage` | ✓ |
| 135 | `86edf968-01da-418b-9481-9b6fd5e77419` | **subgraph** |
| 164 | `PreviewBridge` | ✓ |
| 218 | `VAEDecode` | ✓ |
| 219 | `LoadImage` | ✓ |
| 220 | `Power Lora Loader (rgthree)` | ✓ |
| 222 | `Image to RGB [RvTools]` | **UNKNOWN** |
| 235 | `easy sam3ModelLoader` | **UNKNOWN** |
| 238 | `easy sam3ImageSegmentation` | **UNKNOWN** |
| 239 | `easy sam3ImageSegmentation` | **UNKNOWN** |
| 253 | `da170350-5970-41f2-9470-620ac73ce40d` | **subgraph** |

---

## `gonzalomo-dmd-v30` — **BLOCKED_SUBGRAPH**
- **Display name:** gonzaLomo · DMD v30
- **Source file:** `(unknown)`
- **Total nodes:** 33  · ok: 32, ui-only: 0, subgraph-uuid: 1, unknown-pack: 0
- **input_paths:** `['seed', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `[]`
- **ComfyUI probe:** **VALIDATION** — 2 node(s) failed static validation

### Subgraph references (UUID-named — need expansion)
- node `197` → subgraph `c1a073ea-21de-43e0-99e9-9c5ed004b33e`

_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._

### Model files referenced but not on disk
- node `139` `model_name`: `bbox/face_yolov8m.pt`
- node `140` `model_name`: `sam_vit_b_01ec64.pth`
- node `158` `model_name`: `bbox/Eyeful_v2-Paired.pt`
- node `159` `model_name`: `sam_vit_b_01ec64.pth`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### Required inputs that are not wired / empty
- node `137` (`FaceDetailer`) — required input `wildcard` is empty (current: `""`)
- node `160` (`FaceDetailer`) — required input `wildcard` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `193` (`ControlNetLoader`): Value not in list — input 'control_net_name': 'Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors'
- node `197` (`c1a073ea-21de-43e0-99e9-9c5ed004b33e`): missing_node_type — Node 'c1a073ea-21de-43e0-99e9-9c5ed004b33e' not found. The custom node may not be installed.

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `CheckpointLoaderSimple` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `KSampler` | ✓ |
| 13 | `VAEDecode` | ✓ |
| 14 | `PreviewImage` | ✓ |
| 18 | `SDXLEmptyLatentSizePicker+` | ✓ |
| 37 | `CLIPTextEncode` | ✓ |
| 109 | `CLIPTextEncode` | ✓ |
| 128 | `SaveImage` | ✓ |
| 131 | `KSampler` | ✓ |
| 132 | `VAEEncode` | ✓ |
| 133 | `VAEDecode` | ✓ |
| 137 | `FaceDetailer` | ✓ |
| 139 | `UltralyticsDetectorProvider` | ✓ |
| 140 | `SAMLoader` | ✓ |
| 141 | `PreviewImage` | ✓ |
| 155 | `CLIPSetLastLayer` | ✓ |
| 158 | `UltralyticsDetectorProvider` | ✓ |
| 159 | `SAMLoader` | ✓ |
| 160 | `FaceDetailer` | ✓ |
| 185 | `CLIPTextEncode` | ✓ |
| 186 | `KSampler` | ✓ |
| 188 | `VAEDecode` | ✓ |
| 189 | `ConditioningZeroOut` | ✓ |
| 190 | `PreviewImage` | ✓ |
| 191 | `Power Lora Loader (rgthree)` | ✓ |
| 192 | `Lora Loader Stack (rgthree)` | ✓ |
| 193 | `ControlNetLoader` | ✓ |
| 194 | `ControlNetApplyAdvanced` | ✓ |
| 195 | `Lora Loader Stack (rgthree)` | ✓ |
| 196 | `Lora Loader Stack (rgthree)` | ✓ |
| 197 | `c1a073ea-21de-43e0-99e9-9c5ed004b33e` | **subgraph** |
| 198 | `VAELoader` | ✓ |

---

## `ipadapter-faceswap` — **PASS**
- **Display name:** IP-Adapter · Face Swap
- **Source file:** `(unknown)`
- **Total nodes:** 15  · ok: 15, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **PASS** — static validation passed (no GPU work performed)

### Required inputs that are not wired / empty
- node `44` (`CLIPTextEncode`) — required input `text` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 44 | `CLIPTextEncode` | ✓ |
| 45 | `CLIPTextEncode` | ✓ |
| 46 | `LoadImage` | ✓ |
| 50 | `VAEDecode` | ✓ |
| 61 | `IPAdapterFaceID` | ✓ |
| 63 | `IPAdapterUnifiedLoaderFaceID` | ✓ |
| 67 | `IPAdapterModelLoader` | ✓ |
| 68 | `IPAdapterInsightFaceLoader` | ✓ |
| 73 | `Checkpoint Loader (Simple)` | ✓ |
| 76 | `SaveImage` | ✓ |
| 82 | `LoraLoader` | ✓ |
| 83 | `SaveImage` | ✓ |
| 84 | `SaveImage` | ✓ |
| 85 | `KSampler` | ✓ |
| 86 | `EmptyLatentImage` | ✓ |

---

## `openpose-i2i` — **BLOCKED_MISSING_MODEL**
- **Display name:** OpenPose · Image-to-Image
- **Source file:** `(unknown)`
- **Total nodes:** 11  · ok: 11, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 1 node(s) failed static validation

### Model files referenced but not on disk
- node `4` `ckpt_name`: `SD1.5_realistic_model.safetensors`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### ComfyUI validator errors
- node `4` (`CheckpointLoaderSimple`): Value not in list — input 'ckpt_name': 'SD1.5_realistic_model.safetensors'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 4 | `CheckpointLoaderSimple` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `CLIPTextEncode` | ✓ |
| 8 | `LoadImage` | ✓ |
| 9 | `ControlNetLoader` | ✓ |
| 10 | `ControlNetApplyAdvanced` | ✓ |
| 11 | `VAEDecode` | ✓ |
| 12 | `VAEEncode` | ✓ |
| 13 | `DWPreprocessor` | ✓ |
| 14 | `SaveImage` | ✓ |

---

## `qwen-edit-multi-angle` — **BROKEN_WIRING**
- **Display name:** Qwen-Edit · Multiple Angles (VNCCS)
- **Source file:** `(unknown)`
- **Total nodes:** 19  · ok: 19, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'source_image']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 2 node(s) failed static validation

### Required inputs that are not wired / empty
- node `100` (`TextEncodeQwenImageEditPlus`) — required input `clip` is empty (current: `""`)
- node `100` (`TextEncodeQwenImageEditPlus`) — required input `prompt` is empty (current: `(missing)`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `100` (`TextEncodeQwenImageEditPlus`): Required input 'clip' (type CLIP) must be wired, got literal str
- node `100` (`TextEncodeQwenImageEditPlus`): Required input is missing — input 'prompt'
- node `112` (`TextEncodeQwenImageEditPlus`): Required input 'clip' (type CLIP) must be wired, got literal str
- node `112` (`TextEncodeQwenImageEditPlus`): Required input 'prompt' linked to missing node '114'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 9 | `SaveImage` | ✓ |
| 41 | `LoadImage` | ✓ |
| 94 | `ModelSamplingAuraFlow` | ✓ |
| 95 | `VAELoader` | ✓ |
| 98 | `CFGNorm` | ✓ |
| 100 | `TextEncodeQwenImageEditPlus` | ✓ |
| 102 | `LoraLoaderModelOnly` | ✓ |
| 103 | `VAEDecode` | ✓ |
| 105 | `VAEEncode` | ✓ |
| 106 | `KSampler` | ✓ |
| 107 | `FluxKontextImageScale` | ✓ |
| 108 | `UNETLoader` | ✓ |
| 109 | `LoraLoaderModelOnly` | ✓ |
| 112 | `TextEncodeQwenImageEditPlus` | ✓ |
| 115 | `ImageUpscaleWithModel` | ✓ |
| 116 | `UpscaleModelLoader` | ✓ |
| 120 | `ImpactConcatConditionings` | ✓ |
| 121 | `ImpactConcatConditionings` | ✓ |
| 123 | `DualClipLoaderGGUF` | ✓ |

---

## `qwen-image-edit-4step` — **VALIDATION_OTHER**
- **Display name:** Qwen-Image-Edit · 4-Step (2511)
- **Source file:** `(unknown)`
- **Total nodes:** 22  · ok: 22, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'source_image']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 1 node(s) failed static validation

### ComfyUI validator errors
- node `179` (`ReferenceLatent`): Required input 'conditioning' linked to missing node '162'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 8 | `VAEDecode` | ✓ |
| 38 | `CLIPLoader` | ✓ |
| 39 | `VAELoader` | ✓ |
| 75 | `CFGNorm` | ✓ |
| 109 | `easy cleanGpuUsed` | ✓ |
| 145 | `ModelSamplingAuraFlow` | ✓ |
| 153 | `TextEncodeQwenImageEditPlus` | ✓ |
| 154 | `TextEncodeQwenImageEditPlus` | ✓ |
| 163 | `ConditioningZeroOut` | ✓ |
| 179 | `ReferenceLatent` | ✓ |
| 180 | `VAEEncode` | ✓ |
| 182 | `LoadImage` | ✓ |
| 184 | `Any Switch (rgthree)` | ✓ |
| 195 | `FluxKontextMultiReferenceLatentMethod` | ✓ |
| 196 | `FluxKontextMultiReferenceLatentMethod` | ✓ |
| 197 | `UNETLoader` | ✓ |
| 202 | `ImageResizeKJv2` | ✓ |
| 205 | `Any Switch (rgthree)` | ✓ |
| 209 | `LoraLoaderModelOnly` | ✓ |
| 214 | `PreviewImage` | ✓ |
| 215 | `Image Comparer (rgthree)` | ✓ |

---

## `qwen-image-text2img` — **BLOCKED_SUBGRAPH**
- **Display name:** Qwen-Image · Text-to-Image
- **Source file:** `(unknown)`
- **Total nodes:** 42  · ok: 41, ui-only: 0, subgraph-uuid: 1, unknown-pack: 0
- **input_paths:** `['seed', 'source_image', 'negative_prompt', 'positive_prompt']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 2 node(s) failed static validation

### Subgraph references (UUID-named — need expansion)
- node `172` → subgraph `48aa749a-985d-4692-99d0-6342aabc07a1`

_Action: open in ComfyUI editor, right-click each subgraph node → Convert to Group / Expand, then save._

### Model files referenced but not on disk
- node `117` `model_name`: `sam_vit_b_01ec64.pth`
- node `118` `model_name`: `bbox/face_yolov8m.pt`

_Action: either download the file into the right subdir under `D:\comfyui\resources\comfyui\models\`, or edit the workflow to reference a file you do have._

### Required inputs that are not wired / empty
- node `95` (`OllamaOptionsV2`) — required input `stop` is empty (current: `""`)
- node `116` (`FaceDetailer`) — required input `wildcard` is empty (current: `""`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `84` (`OllamaConnectivityV2`): Value not in list — input 'model': 'gemma4:latest'
- node `172` (`48aa749a-985d-4692-99d0-6342aabc07a1`): missing_node_type — Node '48aa749a-985d-4692-99d0-6342aabc07a1' not found. The custom node may not be installed.

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `CLIPTextEncode` | ✓ |
| 8 | `VAEDecode` | ✓ |
| 66 | `ModelSamplingAuraFlow` | ✓ |
| 73 | `LoraLoaderModelOnly` | ✓ |
| 79 | `OllamaGenerateV2` | ✓ |
| 82 | `LoadImage` | ✓ |
| 84 | `OllamaConnectivityV2` | ✓ |
| 95 | `OllamaOptionsV2` | ✓ |
| 97 | `CheckpointLoaderSimple` | ✓ |
| 100 | `KSampler` | ✓ |
| 106 | `VAEDecode` | ✓ |
| 107 | `CLIPTextEncode` | ✓ |
| 108 | `CLIPTextEncode` | ✓ |
| 110 | `CheckpointLoaderSimple` | ✓ |
| 112 | `VAEEncode` | ✓ |
| 113 | `ImageResize+` | ✓ |
| 116 | `FaceDetailer` | ✓ |
| 117 | `SAMLoader` | ✓ |
| 118 | `UltralyticsDetectorProvider` | ✓ |
| 119 | `SaveImage` | ✓ |
| 121 | `VAEEncode` | ✓ |
| 123 | `Power Lora Loader (rgthree)` | ✓ |
| 124 | `Power Lora Loader (rgthree)` | ✓ |
| 126 | `LatentMultiply` | ✓ |
| 127 | `SamplerCustom` | ✓ |
| 128 | `ReferenceLatent` | ✓ |
| 129 | `ReferenceLatent` | ✓ |
| 131 | `SamplerDPMPP_3M_SDE` | ✓ |
| 135 | `ReferenceLatent` | ✓ |
| 136 | `ReferenceLatent` | ✓ |
| 148 | `ManualSigmas` | ✓ |
| 149 | `PreviewImage` | ✓ |
| 150 | `PreviewImage` | ✓ |
| 161 | `PreviewAny` | ✓ |
| 162 | `easy saveText` | ✓ |
| 171 | `DensePosePreprocessor` | ✓ |
| 172 | `48aa749a-985d-4692-99d0-6342aabc07a1` | **subgraph** |
| 173 | `Stats system [Crystools]` | ✓ |
| 174 | `Stats system [Crystools]` | ✓ |
| 175 | `Stats system [Crystools]` | ✓ |

---

## `wan22-img2video` — **BLOCKED_UNKNOWN_PACK**
- **Display name:** Wan 2.2 · Image-to-Video
- **Source file:** `(unknown)`
- **Total nodes:** 10  · ok: 6, ui-only: 0, subgraph-uuid: 0, unknown-pack: 4
- **input_paths:** `['source_image']`
- **image_inputs:** `['source_image']`
- **ComfyUI probe:** **VALIDATION** — 9 node(s) failed static validation

### Unknown class_types (not in any installed pack)
- node `3` → `WAN2_2_I2V_LoadModel`
- node `7` → `WAN2_2_I2V_Sampler`
- node `8` → `WAN2_2_I2V_Decode`
- node `9` → `VideoHelperSuite_ImagesToVideo`

_Action: either install the pack into `D:\comfyui\resources\comfyui\custom_nodes\` and restart ComfyUI, or replace the node with a registered equivalent._

### Required inputs that are not wired / empty
- node `1` (`LoadImage`) — required input `image` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `image` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `resize_by` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `width` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `height` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `multiplier` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `interpolation` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `fit_mode` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `bg_color` is empty (current: `(missing)`)
- node `2` (`ImageResize`) — required input `apply_type` is empty (current: `(missing)`)
- node `4` (`CLIPTextEncode`) — required input `text` is empty (current: `(missing)`)
- node `4` (`CLIPTextEncode`) — required input `clip` is empty (current: `(missing)`)
- node `5` (`CLIPTextEncode`) — required input `text` is empty (current: `(missing)`)
- node `5` (`CLIPTextEncode`) — required input `clip` is empty (current: `(missing)`)
- node `6` (`VAEEncode`) — required input `pixels` is empty (current: `(missing)`)
- node `6` (`VAEEncode`) — required input `vae` is empty (current: `(missing)`)
- node `10` (`SaveVideo`) — required input `video` is empty (current: `(missing)`)
- node `10` (`SaveVideo`) — required input `filename_prefix` is empty (current: `(missing)`)
- node `10` (`SaveVideo`) — required input `format` is empty (current: `(missing)`)
- node `10` (`SaveVideo`) — required input `codec` is empty (current: `(missing)`)

_Action: open the workflow in ComfyUI editor and connect the missing slot._

### ComfyUI validator errors
- node `2` (`ImageResize`): Required input is missing — input 'image'
- node `2` (`ImageResize`): Required input is missing — input 'resize_by'
- node `2` (`ImageResize`): Required input is missing — input 'width'
- node `3` (`WAN2_2_I2V_LoadModel`): missing_node_type — Node 'WAN2_2_I2V_LoadModel' not found. The custom node may not be installed.
- node `4` (`CLIPTextEncode`): Required input is missing — input 'text'
- node `4` (`CLIPTextEncode`): Required input is missing — input 'clip'
- node `5` (`CLIPTextEncode`): Required input is missing — input 'text'
- node `5` (`CLIPTextEncode`): Required input is missing — input 'clip'
- node `6` (`VAEEncode`): Required input is missing — input 'pixels'
- node `6` (`VAEEncode`): Required input is missing — input 'vae'
- node `7` (`WAN2_2_I2V_Sampler`): missing_node_type — Node 'WAN2_2_I2V_Sampler' not found. The custom node may not be installed.
- node `8` (`WAN2_2_I2V_Decode`): missing_node_type — Node 'WAN2_2_I2V_Decode' not found. The custom node may not be installed.
- node `9` (`VideoHelperSuite_ImagesToVideo`): missing_node_type — Node 'VideoHelperSuite_ImagesToVideo' not found. The custom node may not be installed.
- node `10` (`SaveVideo`): Required input is missing — input 'video'
- node `10` (`SaveVideo`): Required input is missing — input 'filename_prefix'
- node `10` (`SaveVideo`): Required input is missing — input 'format'

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 1 | `LoadImage` | ✓ |
| 2 | `ImageResize` | ✓ |
| 3 | `WAN2_2_I2V_LoadModel` | **UNKNOWN** |
| 4 | `CLIPTextEncode` | ✓ |
| 5 | `CLIPTextEncode` | ✓ |
| 6 | `VAEEncode` | ✓ |
| 7 | `WAN2_2_I2V_Sampler` | **UNKNOWN** |
| 8 | `WAN2_2_I2V_Decode` | **UNKNOWN** |
| 9 | `VideoHelperSuite_ImagesToVideo` | **UNKNOWN** |
| 10 | `SaveVideo` | ✓ |

---

## `z-image-turbo-text2img` — **PASS**
- **Display name:** Z-Image Turbo Text-to-Image
- **Source file:** `(unknown)`
- **Total nodes:** 7  · ok: 7, ui-only: 0, subgraph-uuid: 0, unknown-pack: 0
- **input_paths:** `['seed', 'steps', 'width', 'height', 'prompt', 'negative_prompt']`
- **image_inputs:** `[]`
- **ComfyUI probe:** **PASS** — static validation passed (no GPU work performed)

### Node inventory
| ID | class_type | kind |
|---|---|---|
| 3 | `KSampler` | ✓ |
| 4 | `CheckpointLoaderSimple` | ✓ |
| 5 | `EmptyLatentImage` | ✓ |
| 6 | `CLIPTextEncode` | ✓ |
| 7 | `CLIPTextEncode` | ✓ |
| 8 | `VAEDecode` | ✓ |
| 9 | `SaveImage` | ✓ |
