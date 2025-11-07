import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from shapely.geometry import Polygon

from .tooth_mapping import ToothMapping, MappingResult

logger = logging.getLogger(__name__)


@dataclass
class SegTooth:
    tooth_id_fdi: int
    poly: Polygon
    bbox: Tuple[float, float, float, float]  # x, y, w, h (center-based like RF)
    confidence: float


def _poly_from_points(points: List[Dict[str, float]]) -> Optional[Polygon]:
    if not points:
        return None
    try:
        coords = [(p["x"], p["y"]) for p in points if "x" in p and "y" in p]
        if len(coords) < 3:
            return None
        return Polygon(coords)
    except Exception:
        return None


def _build_teeth_from_seg(seg_json: Dict, image_width: Optional[int] = None) -> List[SegTooth]:
    teeth: List[SegTooth] = []
    preds = (seg_json or {}).get("predictions", [])
    mid_x = (image_width or 0) / 2 if image_width else None
    for pred in preds:
        try:
            cls = str(pred.get("class", "")).strip()
            tooth_id = int(cls) if cls.isdigit() else None
            if tooth_id is None:
                continue
            # Optional left/right correction similar to _correctTooth in Dart
            x = float(pred.get("x", 0.0))
            y = float(pred.get("y", 0.0))
            w = float(pred.get("width", 0.0))
            h = float(pred.get("height", 0.0))
            poly = _poly_from_points(pred.get("points") or [])
            confidence = float(pred.get("confidence", 0.0))
            # If midline known, try simple quadrant sanity like Dart version
            if mid_x is not None and 11 <= tooth_id <= 48:
                tooth_id = _quadrant_correct_fdi(tooth_id, mid_x, x)
            if poly is None:
                # Build rectangle if polygon missing
                half_w, half_h = w / 2.0, h / 2.0
                rect = Polygon(
                    [
                        (x - half_w, y - half_h),
                        (x + half_w, y - half_h),
                        (x + half_w, y + half_h),
                        (x - half_w, y + half_h),
                    ]
                )
                poly = rect
            teeth.append(SegTooth(tooth_id_fdi=tooth_id, poly=poly, bbox=(x, y, w, h), confidence=confidence))
        except Exception as e:
            logger.warning(f"Skipping seg pred due to error: {e}")
    return teeth


def _quadrant_correct_fdi(tooth_id: int, center_x: float, x: float) -> int:
    # Mirrors the Dart logic that nudges 11–18/21–28 and 31–38/41–48 across the midline if needed
    if 11 <= tooth_id <= 18:
        return tooth_id if x < center_x else tooth_id + 10
    if 21 <= tooth_id <= 28:
        return tooth_id if x > center_x else tooth_id - 10
    if 41 <= tooth_id <= 48:
        return tooth_id if x < center_x else tooth_id - 10
    if 31 <= tooth_id <= 38:
        return tooth_id if x > center_x else tooth_id + 10
    return tooth_id


def _largest_overlap_tooth(detection_poly: Polygon, teeth: List[SegTooth]) -> Optional[SegTooth]:
    best: Optional[SegTooth] = None
    best_area = 0.0
    for tooth in teeth:
        try:
            inter = detection_poly.intersection(tooth.poly)
            area = inter.area if not inter.is_empty else 0.0
            if area > best_area:
                best_area = area
                best = tooth
        except Exception:
            continue
    return best


def _normalize_detection_polygon(pred: Dict) -> Polygon:
    # Prefer explicit points; otherwise build from bbox
    pts = pred.get("points") or []
    if pts:
        poly = _poly_from_points(pts)
        if poly is not None:
            return poly
    x = float(pred.get("x", 0.0))
    y = float(pred.get("y", 0.0))
    w = float(pred.get("width", 0.0))
    h = float(pred.get("height", 0.0))
    half_w, half_h = w / 2.0, h / 2.0
    return Polygon(
        [
            (x - half_w, y - half_h),
            (x + half_w, y - half_h),
            (x + half_w, y + half_h),
            (x - half_w, y + half_h),
        ]
    )


def map_with_segmentation(
    image_width: Optional[int],
    condition_detections: Dict,
    seg_detections: Dict,
    numbering_system: str,
) -> MappingResult:
    # Build teeth set
    teeth = _build_teeth_from_seg(seg_detections, image_width)
    mappings: List[ToothMapping] = []

    preds = (condition_detections or {}).get("predictions", [])
    for i, pred in enumerate(preds):
        det_poly = _normalize_detection_polygon(pred)
        best = _largest_overlap_tooth(det_poly, teeth)
        if best is None:
            # no overlap → leave unmapped with low confidence
            mappings.append(
                ToothMapping(
                    detection_id=i,
                    tooth_number="",
                    universal_number="",
                    confidence=0.1,
                    method="april_vision_no_overlap",
                    reasoning="No polygon overlap with any tooth",
                )
            )
            continue

        # Prepare numbering (local helpers mirror existing logic)
        fdi = str(best.tooth_id_fdi)
        universal = _fdi_to_universal(fdi)
        final_tooth = universal if numbering_system == "Universal" else fdi

        mappings.append(
            ToothMapping(
                detection_id=i,
                tooth_number=final_tooth,
                universal_number=universal,
                confidence=min(0.95, 0.5 + best.confidence * 0.5),
                method="april_vision_seg_overlap",
                reasoning="Assigned by maximum polygon overlap with segmented tooth",
                grid_prediction=final_tooth,
            )
        )

    overall = sum(m.confidence for m in mappings) / len(mappings) if mappings else 0.0
    return MappingResult(
        mappings=mappings,
        overall_confidence=overall,
        processing_time=0.0,
        method_used="april_vision_seg_overlap",
    )


def _fdi_to_universal(fdi_number: str) -> str:
    try:
        f = int(fdi_number)
        if 11 <= f <= 18:  # Upper right, 11..18 maps to 8..1
            mapping = {11: 8, 12: 7, 13: 6, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1}
            return str(mapping[f])
        if 21 <= f <= 28:  # Upper left, 21..28 maps to 9..16
            return str(8 + (f - 20))  # 9..16
        if 31 <= f <= 38:  # Lower left, 31..38 maps to 24..17
            mapping = {31: 24, 32: 23, 33: 22, 34: 21, 35: 20, 36: 19, 37: 18, 38: 17}
            return str(mapping[f])
        if 41 <= f <= 48:  # Lower right, 41..48 maps to 25..32
            return str(24 + (f - 40))  # 25..32
        return fdi_number
    except ValueError:
        return fdi_number


