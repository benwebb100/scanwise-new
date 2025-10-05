"""
Treatment Plan Staging V2 - Time/Quadrant/Dependency Aware Staging System

This module provides intelligent treatment staging that respects:
- Visit time budgets
- Quadrant/side anesthesia rules  
- Clinical dependencies and healing times
- Clinic-specific configuration
"""

import logging
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import math

logger = logging.getLogger(__name__)

# Default clinic configuration
DEFAULT_CLINIC_CONFIG = {
    'VISIT_TIME_BUDGET_MIN': 90,
    'MAX_QUADRANTS_PER_VISIT': 1,
    'MAX_SIDES_PER_VISIT': 1,
    'HEALING_EXTRACTION_TO_IMPLANT_WEEKS': 10,
    'CROWN_SEAT_DELAY_DAYS': 14,
    'ALLOW_SAME_DAY_RCT_AND_BUILDUP': True,
    'ALLOW_SAME_DAY_EXTRACTION_AND_SCALING': True,
    'PROCEDURE_TIME_MIN': {
        'filling': 30,
        'root-canal-treatment': 120,
        'build-up': 30,
        'crown-prep': 90,
        'crown-seat': 30,
        'surgical-extraction': 60,
        'simple-extraction': 30,
        'implant-placement': 120,
        'bridge-prep': 120,
        'bridge-seat': 45,
        'scaling-root-planing': 60,
        'hygiene': 45,
        'scale-polish': 45,
        'whitening': 45,
        'veneer-prep': 90,
        'veneer-seat': 45
    },
    'PROCEDURE_DEPENDENCIES': {
        'extraction': ['implant-placement'],
        'root-canal-treatment': ['build-up', 'crown-prep'],
        'crown-prep': ['crown-seat'],
        'implant-placement': ['crown', 'abutment', 'bridge']
    }
}

@dataclass
class TreatmentItem:
    """Represents a single treatment item with all necessary metadata"""
    tooth: str
    procedure: str
    stage_category: int
    price: float
    condition: str
    time_estimate_min: int
    side: str  # 'L' or 'R'
    arch: str  # 'upper' or 'lower'
    quadrant: str  # 'UR', 'UL', 'LR', 'LL'
    dependencies: List[str] = None
    follow_up_treatments: List[str] = None

@dataclass
class Visit:
    """Represents a single visit within a stage"""
    visit_label: str
    treatments: List[TreatmentItem]
    visit_duration_min: int
    visit_cost: float
    explain_note: str
    side: str
    quadrant: str

@dataclass
class Stage:
    """Represents a treatment stage with multiple visits"""
    stage_number: int
    stage_title: str
    visits: List[Visit]
    total_duration_min: int
    total_cost: float

@dataclass
class FutureTask:
    """Represents a future task delayed by dependencies"""
    treatment: str
    tooth: str
    target_stage: int
    earliest_date_offset_weeks: int
    dependency_reason: str

@dataclass
class StagedPlan:
    """Complete staged treatment plan"""
    stages: List[Stage]
    future_tasks: List[FutureTask]
    meta: Dict[str, Any]

class StagingEngineV2:
    """Main staging engine implementing the V2 algorithm"""
    
    def __init__(self, clinic_config: Dict[str, Any] = None):
        self.config = {**DEFAULT_CLINIC_CONFIG, **(clinic_config or {})}
        logger.info(f"StagingEngineV2 initialized with config: {self.config}")
    
    def build_staged_plan(self, treatments: List[Dict[str, Any]], clinic_config: Dict[str, Any] = None) -> StagedPlan:
        """
        Main entry point for building a staged treatment plan
        
        Args:
            treatments: List of treatment dictionaries from frontend
            clinic_config: Optional clinic-specific configuration overrides
            
        Returns:
            StagedPlan object with stages, visits, and future tasks
        """
        if clinic_config:
            self.config.update(clinic_config)
        
        logger.info(f"Building staged plan for {len(treatments)} treatments")
        
        # Step 1: Convert and classify treatments
        treatment_items = self._convert_treatments(treatments)
        classified_treatments = self._classify_stage_categories(treatment_items)
        
        # Step 2: Expand dependencies
        expanded_treatments = self._expand_dependencies(classified_treatments)
        
        # Step 3: Group by stage and create visits
        stages = self._create_stages_with_visits(expanded_treatments)
        
        # Step 4: Generate future tasks
        future_tasks = self._generate_future_tasks(expanded_treatments)
        
        # Step 5: Calculate meta information
        meta = self._calculate_meta(stages, future_tasks)
        
        logger.info(f"Staging complete: {len(stages)} stages, {sum(len(s.visits) for s in stages)} visits")
        
        return StagedPlan(stages=stages, future_tasks=future_tasks, meta=meta)
    
    def _convert_treatments(self, treatments: List[Dict[str, Any]]) -> List[TreatmentItem]:
        """Convert frontend treatment data to TreatmentItem objects"""
        items = []
        
        for treatment in treatments:
            # Extract tooth information and derive quadrant/side
            tooth = treatment.get('tooth', '')
            side, arch, quadrant = self._derive_tooth_location(tooth)
            
            # Get time estimate
            procedure = treatment.get('treatment', '').lower()
            time_estimate = self.config['PROCEDURE_TIME_MIN'].get(procedure, 45)
            
            # Create TreatmentItem for the main treatment
            item = TreatmentItem(
                tooth=tooth,
                procedure=procedure,
                stage_category=treatment.get('stage_category', 0),
                price=treatment.get('price', 0),
                condition=treatment.get('condition', ''),
                time_estimate_min=time_estimate,
                side=side,
                arch=arch,
                quadrant=quadrant,
                dependencies=self.config['PROCEDURE_DEPENDENCIES'].get(procedure, []),
                follow_up_treatments=[]
            )
            items.append(item)
            
            # If this is an extraction with a replacement, add the replacement as a separate treatment
            if procedure == 'extraction' and treatment.get('replacement') and treatment.get('replacement') != 'none':
                replacement_procedure = treatment.get('replacement')
                replacement_time = self.config['PROCEDURE_TIME_MIN'].get(replacement_procedure, 120)
                
                # Get replacement price (default to 0 if not specified)
                replacement_price = 0
                if replacement_procedure == 'implant-placement':
                    replacement_price = 2300
                elif replacement_procedure == 'bridge':
                    replacement_price = 850
                elif replacement_procedure == 'partial-denture':
                    replacement_price = 600
                
                replacement_item = TreatmentItem(
                    tooth=tooth,
                    procedure=replacement_procedure,
                    stage_category=3,  # Prosthetics stage
                    price=replacement_price,
                    condition='post-extraction-replacement',
                    time_estimate_min=replacement_time,
                    side=side,
                    arch=arch,
                    quadrant=quadrant,
                    dependencies=[],  # Will be handled by future tasks
                    follow_up_treatments=[]
                )
                items.append(replacement_item)
        
        return items
    
    def _derive_tooth_location(self, tooth: str) -> Tuple[str, str, str]:
        """Derive side, arch, and quadrant from tooth number"""
        try:
            tooth_num = int(tooth)
            
            # FDI numbering system (1-32)
            if 1 <= tooth_num <= 32:
                if tooth_num <= 16:  # Upper arch
                    arch = 'upper'
                    if tooth_num <= 8:  # Right side
                        side = 'R'
                        quadrant = 'UR'
                    else:  # Left side
                        side = 'L'
                        quadrant = 'UL'
                else:  # Lower arch
                    arch = 'lower'
                    if tooth_num <= 24:  # Right side
                        side = 'R'
                        quadrant = 'LR'
                    else:  # Left side
                        side = 'L'
                        quadrant = 'LL'
            else:
                # Unknown numbering system, default to right upper
                side, arch, quadrant = 'R', 'upper', 'UR'
                
        except (ValueError, TypeError):
            # Non-numeric tooth, default to right upper
            side, arch, quadrant = 'R', 'upper', 'UR'
        
        return side, arch, quadrant
    
    def _classify_stage_categories(self, treatments: List[TreatmentItem]) -> List[TreatmentItem]:
        """Classify treatments into stage categories using urgency rules"""
        urgency_levels = {
            'periapical-lesion': 1,
            'cavity': 1,
            'decay': 1,
            'abscess': 1,
            'root-piece': 2,
            'fracture': 2,
            'impacted-tooth': 2,
            'missing-tooth': 3,
            'whitening': 3
        }
        
        for treatment in treatments:
            if treatment.stage_category == 0:  # Not pre-classified
                condition = treatment.condition.lower()
                treatment.stage_category = urgency_levels.get(condition, 2)
        
        return treatments
    
    def _expand_dependencies(self, treatments: List[TreatmentItem]) -> List[TreatmentItem]:
        """Expand treatments to include required follow-up procedures"""
        expanded = treatments.copy()
        
        for treatment in treatments:
            if treatment.procedure == 'root-canal-treatment':
                # Add build-up if not present
                if not any(t.procedure == 'build-up' and t.tooth == treatment.tooth for t in expanded):
                    build_up = TreatmentItem(
                        tooth=treatment.tooth,
                        procedure='build-up',
                        stage_category=2,  # Definitive restorations
                        price=0,  # Will be calculated
                        condition='post-rct-stabilization',
                        time_estimate_min=self.config['PROCEDURE_TIME_MIN']['build-up'],
                        side=treatment.side,
                        arch=treatment.arch,
                        quadrant=treatment.quadrant,
                        dependencies=[],
                        follow_up_treatments=[]
                    )
                    expanded.append(build_up)
                
                # Add crown-prep if not present
                if not any(t.procedure == 'crown-prep' and t.tooth == treatment.tooth for t in expanded):
                    crown_prep = TreatmentItem(
                        tooth=treatment.tooth,
                        procedure='crown-prep',
                        stage_category=2,
                        price=0,
                        condition='post-rct-restoration',
                        time_estimate_min=self.config['PROCEDURE_TIME_MIN']['crown-prep'],
                        side=treatment.side,
                        arch=treatment.arch,
                        quadrant=treatment.quadrant,
                        dependencies=[],
                        follow_up_treatments=[]
                    )
                    expanded.append(crown_prep)
                    
                    # Add crown-seat with delay
                    crown_seat = TreatmentItem(
                        tooth=treatment.tooth,
                        procedure='crown-seat',
                        stage_category=2,
                        price=0,
                        condition='crown-finalization',
                        time_estimate_min=self.config['PROCEDURE_TIME_MIN']['crown-seat'],
                        side=treatment.side,
                        arch=treatment.arch,
                        quadrant=treatment.quadrant,
                        dependencies=[],
                        follow_up_treatments=[]
                    )
                    expanded.append(crown_seat)
        
        return expanded
    
    def _create_stages_with_visits(self, treatments: List[TreatmentItem]) -> List[Stage]:
        """Create stages with visits based on time budget and quadrant rules"""
        stages = []
        
        # Group treatments by stage category
        stage_groups = {}
        for treatment in treatments:
            stage_num = treatment.stage_category
            if stage_num not in stage_groups:
                stage_groups[stage_num] = []
            stage_groups[stage_num].append(treatment)
        
        # Create stages in order
        stage_titles = {
            1: "Infection/Pain/Disease Control",
            2: "Definitive Restorations", 
            3: "Prosthetics",
            4: "Aesthetics"
        }
        
        for stage_num in sorted(stage_groups.keys()):
            stage_treatments = stage_groups[stage_num]
            if not stage_treatments:
                continue
                
            # Create visits for this stage
            visits = self._create_visits_for_stage(stage_treatments, stage_num)
            
            # Calculate stage totals
            total_duration = sum(v.visit_duration_min for v in visits)
            total_cost = sum(v.visit_cost for v in visits)
            
            stage = Stage(
                stage_number=stage_num,
                stage_title=stage_titles[stage_num],
                visits=visits,
                total_duration_min=total_duration,
                total_cost=total_cost
            )
            stages.append(stage)
        
        return stages
    
    def _create_visits_for_stage(self, treatments: List[TreatmentItem], stage_num: int) -> List[Visit]:
        """Create visits for a stage respecting time budget and quadrant rules"""
        visits = []
        visit_counter = 1
        
        # Group treatments by side and quadrant
        side_quadrant_groups = {}
        for treatment in treatments:
            key = (treatment.side, treatment.quadrant)
            if key not in side_quadrant_groups:
                side_quadrant_groups[key] = []
            side_quadrant_groups[key].append(treatment)
        
        # Process each side/quadrant group
        for (side, quadrant), group_treatments in side_quadrant_groups.items():
            # Sort treatments by duration (longest first for better packing)
            group_treatments.sort(key=lambda x: x.time_estimate_min, reverse=True)
            
            current_visit_treatments = []
            current_visit_duration = 0
            
            for treatment in group_treatments:
                # Check if adding this treatment would exceed time budget
                if (current_visit_duration + treatment.time_estimate_min > 
                    self.config['VISIT_TIME_BUDGET_MIN'] and current_visit_treatments):
                    
                    # Create visit with current treatments
                    visit = self._create_visit(
                        current_visit_treatments, 
                        stage_num, 
                        visit_counter, 
                        side, 
                        quadrant
                    )
                    visits.append(visit)
                    visit_counter += 1
                    
                    # Start new visit
                    current_visit_treatments = [treatment]
                    current_visit_duration = treatment.time_estimate_min
                else:
                    # Add to current visit
                    current_visit_treatments.append(treatment)
                    current_visit_duration += treatment.time_estimate_min
            
            # Create final visit for this group if there are treatments
            if current_visit_treatments:
                visit = self._create_visit(
                    current_visit_treatments,
                    stage_num,
                    visit_counter,
                    side,
                    quadrant
                )
                visits.append(visit)
                visit_counter += 1
        
        return visits
    
    def _create_visit(self, treatments: List[TreatmentItem], stage_num: int, 
                      visit_num: int, side: str, quadrant: str) -> Visit:
        """Create a single visit with explain note"""
        visit_label = f"Stage {stage_num} — Visit {visit_num}"
        visit_duration = sum(t.time_estimate_min for t in treatments)
        visit_cost = sum(t.price for t in treatments)
        
        # Generate explain note
        explain_note = self._generate_explain_note(
            treatments, stage_num, visit_duration, side, quadrant
        )
        
        return Visit(
            visit_label=visit_label,
            treatments=treatments,
            visit_duration_min=visit_duration,
            visit_cost=visit_cost,
            explain_note=explain_note,
            side=side,
            quadrant=quadrant
        )
    
    def _generate_explain_note(self, treatments: List[TreatmentItem], stage_num: int, 
                              visit_duration: int, side: str, quadrant: str) -> str:
        """Generate explanatory note for visit grouping"""
        side_label = "right" if side == 'R' else "left"
        quadrant_label = f"{'upper' if quadrant.startswith('U') else 'lower'} {side_label}"
        visit_time = f"{visit_duration} minutes"
        
        if stage_num == 1:
            return (f"Grouped urgent care on the {side_label} {quadrant_label} to control "
                   f"infection and pain first. We kept this visit under {visit_time} and "
                   f"avoided numbing both sides in one session.")
        
        elif stage_num == 2:
            rct_buildup_note = ""
            if any(t.procedure == 'root-canal-treatment' for t in treatments):
                rct_buildup_note = " Performed build-up immediately after root canal to stabilize the tooth."
            
            return (f"Restorative care grouped by quadrant ({quadrant_label}) for efficiency "
                   f"and comfort. Time limited to ~{visit_time}.{rct_buildup_note}")
        
        elif stage_num == 3:
            return (f"Prosthetic work is scheduled after healing. Earliest follow-up is "
                   f"about {self.config['HEALING_EXTRACTION_TO_IMPLANT_WEEKS']} weeks.")
        
        else:  # stage 4
            return ("Aesthetic treatments scheduled last, after disease control and "
                   "functional restorations, to ensure stability of results.")
    
    def _generate_future_tasks(self, treatments: List[TreatmentItem]) -> List[FutureTask]:
        """Generate future tasks based on dependencies and healing times"""
        future_tasks = []
        
        for treatment in treatments:
            if treatment.procedure == 'extraction':
                # Check if there's a replacement treatment for this tooth
                replacement_treatment = next((t for t in treatments if t.tooth == treatment.tooth and t.procedure in ['implant-placement', 'bridge', 'partial-denture']), None)
                
                if replacement_treatment:
                    # Create future task for the replacement
                    future_task = FutureTask(
                        treatment=replacement_treatment.procedure,
                        tooth=treatment.tooth,
                        target_stage=3,  # Prosthetics
                        earliest_date_offset_weeks=self.config['HEALING_EXTRACTION_TO_IMPLANT_WEEKS'],
                        dependency_reason=f"{replacement_treatment.procedure.replace('-', ' ').title()} follows extraction healing of tooth {treatment.tooth}"
                    )
                    future_tasks.append(future_task)
                else:
                    # No replacement specified, create generic future task
                    future_task = FutureTask(
                        treatment='replacement-consultation',
                        tooth=treatment.tooth,
                        target_stage=3,  # Prosthetics
                        earliest_date_offset_weeks=self.config['HEALING_EXTRACTION_TO_IMPLANT_WEEKS'],
                        dependency_reason=f"Replacement consultation follows extraction healing of tooth {treatment.tooth}"
                    )
                    future_tasks.append(future_task)
            
            elif treatment.procedure == 'crown-prep':
                # Schedule crown seat after lab delay
                future_task = FutureTask(
                    treatment='crown-seat',
                    tooth=treatment.tooth,
                    target_stage=2,  # Same stage but delayed
                    earliest_date_offset_weeks=math.ceil(self.config['CROWN_SEAT_DELAY_DAYS'] / 7),
                    dependency_reason=f"Crown seat planned {self.config['CROWN_SEAT_DELAY_DAYS']} days after prep"
                )
                future_tasks.append(future_task)
        
        return future_tasks
    
    def _calculate_meta(self, stages: List[Stage], future_tasks: List[FutureTask]) -> Dict[str, Any]:
        """Calculate metadata about the staged plan"""
        total_visits = sum(len(s.visits) for s in stages)
        total_treatments = sum(len(v.treatments) for s in stages for v in s.visits)
        total_duration = sum(s.total_duration_min for s in stages)
        total_cost = sum(s.total_cost for s in stages)
        
        return {
            'total_stages': len(stages),
            'total_visits': total_visits,
            'total_treatments': total_treatments,
            'total_duration_min': total_duration,
            'total_cost': total_cost,
            'staging_version': 'v2',
            'config_used': self.config
        }


def build_staged_plan_v2(treatments: List[Dict[str, Any]], 
                         clinic_config: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Main function to build staged plan V2
    
    Args:
        treatments: List of treatment dictionaries
        clinic_config: Optional clinic configuration overrides
        
    Returns:
        Dictionary with stages, future_tasks, and meta
    """
    engine = StagingEngineV2(clinic_config)
    plan = engine.build_staged_plan(treatments, clinic_config)
    
    # Convert to dictionary format for JSON serialization
    return {
        'stages': [
            {
                'stage_number': stage.stage_number,
                'stage_title': stage.stage_title,
                'visits': [
                    {
                        'visit_label': visit.visit_label,
                        'treatments': [
                            {
                                'tooth': t.tooth,
                                'procedure': t.procedure,
                                'condition': t.condition,
                                'time_estimate_min': t.time_estimate_min,
                                'price': t.price,
                                'side': t.side,
                                'quadrant': t.quadrant
                            } for t in visit.treatments
                        ],
                        'visit_duration_min': visit.visit_duration_min,
                        'visit_cost': visit.visit_cost,
                        'explain_note': visit.explain_note,
                        'side': visit.side,
                        'quadrant': visit.quadrant
                    } for visit in stage.visits
                ],
                'total_duration_min': stage.total_duration_min,
                'total_cost': stage.total_cost
            } for stage in plan.stages
        ],
        'future_tasks': [
            {
                'treatment': task.treatment,
                'tooth': task.tooth,
                'target_stage': task.target_stage,
                'earliest_date_offset_weeks': task.earliest_date_offset_weeks,
                'dependency_reason': task.dependency_reason
            } for task in plan.future_tasks
        ],
        'meta': plan.meta
    }
