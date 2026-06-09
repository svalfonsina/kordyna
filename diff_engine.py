import io
import os
import uuid
from typing import Any

import cv2
import numpy as np
from PIL import Image


def _load_image(file_bytes: bytes, filename: str) -> np.ndarray:
    if filename.lower().endswith(".pdf"):
        from pdf2image import convert_from_bytes

        pages = convert_from_bytes(file_bytes, first_page=1, last_page=1, dpi=150)
        img = np.array(pages[0])
        return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = np.array(pil_img)
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


def _classify_severity(area: int, total_area: int) -> str:
    ratio = area / total_area if total_area > 0 else 0
    if ratio > 0.05:
        return "major"
    if ratio > 0.01:
        return "moderate"
    return "minor"


SEVERITY_COLORS = {
    "minor": (0, 255, 0),
    "moderate": (0, 165, 255),
    "major": (0, 0, 255),
}


def compare_drawings(
    old_bytes: bytes,
    old_filename: str,
    new_bytes: bytes,
    new_filename: str,
) -> dict[str, Any]:
    old_img = _load_image(old_bytes, old_filename)
    new_img = _load_image(new_bytes, new_filename)

    h = min(old_img.shape[0], new_img.shape[0])
    w = min(old_img.shape[1], new_img.shape[1])
    old_img = cv2.resize(old_img, (w, h))
    new_img = cv2.resize(new_img, (w, h))

    old_gray = cv2.cvtColor(old_img, cv2.COLOR_BGR2GRAY)
    new_gray = cv2.cvtColor(new_img, cv2.COLOR_BGR2GRAY)

    diff = cv2.absdiff(old_gray, new_gray)
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh = cv2.dilate(thresh, kernel, iterations=2)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    total_area = h * w
    overlay = new_img.copy()
    regions: list[dict[str, Any]] = []

    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        area = bw * bh
        if area < 100:
            continue
        severity = _classify_severity(area, total_area)
        color = SEVERITY_COLORS[severity]
        cv2.rectangle(overlay, (x, y), (x + bw, y + bh), color, 2)
        label = f"{severity.upper()}"
        cv2.putText(overlay, label, (x, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        regions.append({
            "x": x,
            "y": y,
            "width": bw,
            "height": bh,
            "area": area,
            "severity": severity,
        })

    overlay_filename = f"diff_{uuid.uuid4().hex[:12]}.png"
    overlay_path = os.path.join("/tmp", overlay_filename)
    cv2.imwrite(overlay_path, overlay)

    return {
        "regions": regions,
        "region_count": len(regions),
        "overlay_path": overlay_path,
        "overlay_filename": overlay_filename,
    }
