# 🏥 Treatment Plan Staging V2 - Time/Quadrant/Dependency Aware Staging

## Overview

Staging V2 is an intelligent treatment planning system that automatically organizes dental treatments into realistic, clinically-sound visit schedules. It respects:

- **Visit time budgets** (default: 90 minutes)
- **Quadrant/side anesthesia rules** (no mixing left/right sides)
- **Clinical dependencies** (RCT → build-up → crown, extraction → implant healing)
- **Treatment urgency** (infection control first, aesthetics last)

## 🚀 Quick Start

### 1. Enable Staging V2

Set the environment variable:
```bash
STAGING_V2=true
```

### 2. Backend Integration

The staging V2 is automatically integrated into the `/analyze-xray` endpoint. When enabled, it will:

1. Process the treatment findings from the frontend
2. Apply intelligent staging based on time budget and quadrant rules
3. Return structured data with stages, visits, and explanatory notes

### 3. Frontend Rendering

The frontend automatically detects staging V2 data and renders:
- **Visit-based staging** instead of simple stage grouping
- **Explanatory notes** for each visit explaining the grouping logic
- **Future tasks** for dependency-driven treatments
- **Time and cost breakdowns** per visit and stage

## 📋 Configuration

### Default Clinic Settings

```python
DEFAULT_CLINIC_CONFIG = {
    'VISIT_TIME_BUDGET_MIN': 90,           # Maximum minutes per visit
    'MAX_QUADRANTS_PER_VISIT': 1,         # Max quadrants per visit
    'MAX_SIDES_PER_VISIT': 1,             # Don't mix left/right sides
    'HEALING_EXTRACTION_TO_IMPLANT_WEEKS': 10,  # Healing time for implants
    'CROWN_SEAT_DELAY_DAYS': 14,          # Lab delay for crowns
    'ALLOW_SAME_DAY_RCT_AND_BUILDUP': True,
    'ALLOW_SAME_DAY_EXTRACTION_AND_SCALING': True
}
```

### Procedure Time Estimates

```python
'PROCEDURE_TIME_MIN': {
    'filling': 30,
    'root-canal-treatment': 120,
    'crown-prep': 90,
    'crown-seat': 30,
    'surgical-extraction': 60,
    'implant-placement': 120,
    # ... more procedures
}
```

## 🔄 How It Works

### 1. Treatment Classification
- **Stage 1**: Infection/Pain/Disease Control (urgent)
- **Stage 2**: Definitive Restorations (fillings, RCT, crowns)
- **Stage 3**: Prosthetics (implants, bridges)
- **Stage 4**: Aesthetics (whitening, veneers)

### 2. Visit Creation
- Groups treatments by **side** and **quadrant**
- Respects **time budget** (splits into multiple visits if needed)
- Avoids **anesthesia conflicts** (no left+right mixing)

### 3. Dependency Management
- **RCT** → automatically adds build-up and crown-prep
- **Crown-prep** → schedules crown-seat after lab delay
- **Extraction** → schedules implant after healing period

## 📊 Output Structure

### Stages
```json
{
  "stages": [
    {
      "stage_number": 1,
      "stage_title": "Infection/Pain/Disease Control",
      "visits": [...],
      "total_duration_min": 210,
      "total_cost": 760
    }
  ]
}
```

### Visits
```json
{
  "visit_label": "Stage 1 — Visit 1",
  "treatments": [...],
  "visit_duration_min": 120,
  "visit_cost": 400,
  "explain_note": "Grouped urgent care on the left upper left...",
  "side": "L",
  "quadrant": "UL"
}
```

### Future Tasks
```json
{
  "future_tasks": [
    {
      "treatment": "crown-seat",
      "tooth": "14",
      "target_stage": 2,
      "earliest_date_offset_weeks": 2,
      "dependency_reason": "Crown seat planned 14 days after prep"
    }
  ]
}
```

## 🧪 Testing

Run the test script to verify functionality:

```bash
cd server
python3 test_staging_v2.py
```

Expected output:
- ✅ 2 stages generated
- ✅ 6 visits created
- ✅ Proper time budgeting
- ✅ Dependency management

## 🎯 Example Scenarios

### Scenario 1: Multiple Fillings + RCT
**Input**: 1 RCT (UR), 3 fillings (UR), 2 fillings (LR)
**Output**: 
- Stage 1 Visit 1: RCT + 1-2 fillings (UR, ~90 min)
- Stage 1 Visit 2: Remaining UR fillings
- Stage 2 Visit 1: LR fillings (separate side)

### Scenario 2: Extraction + Implant
**Input**: Extraction of #46, implant planned
**Output**:
- Stage 1: Extraction
- Stage 3: Implant (after 10 weeks healing)
- Future task: Implant placement scheduled

### Scenario 3: RCT + Crown
**Input**: RCT on #14
**Output**:
- Stage 1: RCT
- Stage 2: Build-up + crown-prep
- Future task: Crown-seat after 14 days

## 🔧 Customization

### Clinic-Specific Overrides

```python
clinic_config = {
    'VISIT_TIME_BUDGET_MIN': 120,  # Longer visits
    'MAX_SIDES_PER_VISIT': 2,      # Allow both sides
    'HEALING_EXTRACTION_TO_IMPLANT_WEEKS': 12  # Longer healing
}

staged_plan = build_staged_plan_v2(treatments, clinic_config)
```

### Adding New Procedures

1. Add to `PROCEDURE_TIME_MIN`:
```python
'PROCEDURE_TIME_MIN': {
    'new-procedure': 75,  # 75 minutes
    # ... existing procedures
}
```

2. Add to `PROCEDURE_DEPENDENCIES` if needed:
```python
'PROCEDURE_DEPENDENCIES': {
    'new-procedure': ['follow-up-procedure'],
    # ... existing dependencies
}
```

## 🚨 Edge Cases & Guards

- **Single long procedure**: Allowed to exceed time budget, shows warning
- **Unknown tooth numbering**: Placed in separate visit to avoid rule violations
- **Missing dependencies**: Automatically generated and scheduled
- **Empty stages**: Not rendered in final output

## 📝 Logging & Debugging

The system logs key decisions:
```
INFO: StagingEngineV2 initialized with config: {...}
INFO: Building staged plan for 5 treatments
INFO: Staging V2 applied: 2 stages, 6 visits
INFO: Staging complete: 2 stages, 6 visits
```

## 🔄 Rollback

Staging V2 is controlled by the `STAGING_V2` feature flag:
- `STAGING_V2=false` → Legacy staging behavior
- `STAGING_V2=true` → New intelligent staging

## 🎉 Benefits

1. **Realistic Scheduling**: Respects actual clinical constraints
2. **Patient Comfort**: Avoids numbing both sides in one visit
3. **Efficiency**: Groups treatments logically by quadrant
4. **Dependency Management**: Automatically handles follow-up treatments
5. **Explainability**: Clear reasoning for each visit grouping
6. **Flexibility**: Clinic-configurable parameters

## 🔮 Future Enhancements

- **Patient preferences** (morning vs afternoon appointments)
- **Clinic availability** integration
- **Insurance coverage** optimization
- **Multi-appointment** coordination
- **Emergency slot** reservation

---

**Note**: This system is designed to assist clinicians, not replace their judgment. All treatment plans should be reviewed and adjusted by qualified dental professionals.
