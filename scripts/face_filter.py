#!/usr/bin/env python3
"""
face_filter.py — Scan a folder of images, detect faces, copy matches.

Uses OpenCV's DNN face detector (ResNet-SSD based, ships with opencv).
Falls back to Haar cascade if the DNN caffemodel isn't available.

Usage:
    python face_filter.py <input_folder> [output_folder]

If output_folder is omitted, defaults to <input_folder>_faces.
Images WITHOUT faces are left in place (nothing is deleted).
Images WITH faces are COPIED (not moved) to the output folder.

Requirements:
    pip install opencv-python

Optional (higher accuracy):
    pip install mediapipe
"""

import argparse
import shutil
import sys
from pathlib import Path

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.avif'}


def detect_faces_haar(img, cascade):
    """Haar cascade detection — fast, decent accuracy."""
    import cv2
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    return len(faces)


def detect_faces_mediapipe(img):
    """MediaPipe detection — more accurate, handles angles/partial faces."""
    import mediapipe as mp
    import cv2

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    with mp.face_detection.FaceDetection(
        model_selection=1, min_detection_confidence=0.5
    ) as fd:
        result = fd.process(rgb)
        if result.detections:
            return len(result.detections)
    return 0


def build_detector():
    """Pick the best available detector and return a callable(img) -> int."""
    # Prefer mediapipe if installed — better at angles and partial occlusion
    try:
        import mediapipe  # noqa: F401
        print("[detector] Using MediaPipe face detection (high accuracy)")
        return detect_faces_mediapipe
    except ImportError:
        pass

    # Fall back to OpenCV Haar cascade (always available with opencv-python)
    import cv2
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        print(f"[error] Could not load Haar cascade from {cascade_path}", file=sys.stderr)
        sys.exit(1)

    print("[detector] Using OpenCV Haar cascade (install mediapipe for better accuracy)")
    return lambda img: detect_faces_haar(img, cascade)


def main():
    parser = argparse.ArgumentParser(
        description="Filter a folder of images — keep only those containing faces."
    )
    parser.add_argument("input_folder", type=Path, help="Folder of source images")
    parser.add_argument(
        "output_folder",
        type=Path,
        nargs="?",
        default=None,
        help="Destination for images with faces (default: <input>_faces)",
    )
    parser.add_argument(
        "--move", action="store_true",
        help="Move files instead of copying them",
    )
    parser.add_argument(
        "--min-faces", type=int, default=1,
        help="Minimum face count to keep an image (default: 1)",
    )
    parser.add_argument(
        "--no-faces-dir", type=Path, default=None,
        help="Optional folder to move/copy images WITHOUT faces into",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would happen without copying/moving anything",
    )
    args = parser.parse_args()

    import cv2

    input_dir: Path = args.input_folder.resolve()
    if not input_dir.is_dir():
        print(f"[error] Not a directory: {input_dir}", file=sys.stderr)
        sys.exit(1)

    output_dir: Path = (args.output_folder or input_dir.parent / f"{input_dir.name}_faces").resolve()
    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    no_faces_dir: Path | None = None
    if args.no_faces_dir:
        no_faces_dir = args.no_faces_dir.resolve()
        if not args.dry_run:
            no_faces_dir.mkdir(parents=True, exist_ok=True)

    # Collect image paths
    images = sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )

    if not images:
        print(f"[warn] No images found in {input_dir}")
        sys.exit(0)

    print(f"[scan] {len(images)} images in {input_dir}")
    print(f"[dest] faces → {output_dir}")
    if no_faces_dir:
        print(f"[dest] no-faces → {no_faces_dir}")
    print()

    detect = build_detector()
    transfer = shutil.move if args.move else shutil.copy2
    verb = "move" if args.move else "copy"

    stats = {"faces": 0, "no_faces": 0, "errors": 0}

    for i, img_path in enumerate(images, 1):
        try:
            img = cv2.imread(str(img_path))
            if img is None:
                print(f"  [{i}/{len(images)}] SKIP (unreadable) {img_path.name}")
                stats["errors"] += 1
                continue

            count = detect(img)

            if count >= args.min_faces:
                tag = f"✓ {count} face{'s' if count != 1 else ''}"
                stats["faces"] += 1
                if not args.dry_run:
                    transfer(str(img_path), str(output_dir / img_path.name))
            else:
                tag = "✗ no face"
                stats["no_faces"] += 1
                if no_faces_dir and not args.dry_run:
                    transfer(str(img_path), str(no_faces_dir / img_path.name)) 

            print(f"  [{i}/{len(images)}] {tag:20s} {img_path.name}")

        except Exception as exc:
            print(f"  [{i}/{len(images)}] ERROR {img_path.name}: {exc}")
            stats["errors"] += 1

    print()
    print(f"[done] {stats['faces']} with faces, {stats['no_faces']} without, {stats['errors']} errors")
    if args.dry_run:
        print("[dry-run] No files were moved or copied.")


if __name__ == "__main__":
    main()
