"""
Email Tracking Service
Handles urgency calculation and email tracking logic
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Emergency conditions requiring immediate attention
EMERGENCY_CONDITIONS = [
    # Abscesses and infections
    'periapical-lesion',  # Shows infection/inflammation at root tip
    'abscess',
    'periapical_abscess',
    'periodontal_abscess',
    'irreversible_pulpitis',
    'necrotic_pulp',
    'symptomatic_apical_periodontitis',
    'pericoronitis',  # Can spread to throat/neck
    
    # Trauma and fractures
    'fracture',
    'crown-fracture', 
    'root-fracture',
    'trauma_avulsion',
    'trauma_fracture_crown',
    'trauma_luxation',
    
    # Severe caries
    'caries',  # Any caries can become urgent if deep
    'caries_dentine',  # Deep caries
    'caries_root',     # Root caries
    
    # Non-restorable conditions
    'tooth_nonrestorable',
    'root-piece',  # Broken root fragments
]

# Complex treatments indicating medium urgency
COMPLEX_TREATMENTS = [
    'endo_rct_prep_1',
    'endo_rct_prep_addl',
    'endo_rct_obt_1',
    'endo_rct_obt_addl',
    'surg_surgical_extraction',
    'implant_placement_simple',
    'implant_placement_complex',
    'endo_apicectomy_per_root',
    'crown_full_tooth_coloured',
    'perio_flap_surgery_quadrant',
]


def calculate_urgency_level(findings: List[Dict]) -> tuple[str, bool]:
    """
    Calculate urgency level from report findings
    
    Args:
        findings: List of finding dicts with 'condition' and 'treatment' keys
        
    Returns:
        Tuple of (urgency_level, has_emergency_conditions)
        urgency_level: 'high', 'medium', or 'low'
        has_emergency_conditions: Boolean
    """
    if not findings:
        return ('low', False)
    
    # Check for emergency conditions
    has_emergency = any(
        finding.get('condition') in EMERGENCY_CONDITIONS 
        for finding in findings
    )
    
    if has_emergency:
        logger.info(f"🔴 HIGH urgency: Emergency condition found")
        return ('high', True)
    
    # Check for complex treatments
    has_complex = any(
        finding.get('treatment') in COMPLEX_TREATMENTS 
        for finding in findings
    )
    
    if has_complex:
        logger.info(f"🟡 MEDIUM urgency: Complex treatment required")
        return ('medium', False)
    
    # Default to low urgency for routine treatments
    logger.info(f"🟢 LOW urgency: Routine treatment")
    return ('low', False)


def should_send_auto_followup(tracking: Dict) -> bool:
    """
    Determine if automatic follow-up email should be sent
    
    Rules:
    - High urgency: 24 hours after sent
    - Medium urgency: 48 hours after sent
    - Low urgency: 72 hours after sent
    - Only if not already opened
    - Only if not already sent
    
    Args:
        tracking: Email tracking dict
        
    Returns:
        Boolean indicating if auto follow-up should be sent
    """
    # Already opened? No need for follow-up
    if tracking.get('first_opened_at'):
        return False
    
    # Already sent auto follow-up? Don't send again
    if tracking.get('auto_followup_sent_at'):
        return False
    
    # Calculate hours since sent
    sent_at = tracking.get('sent_at')
    if not sent_at:
        return False
    
    if isinstance(sent_at, str):
        sent_at = datetime.fromisoformat(sent_at.replace('Z', '+00:00'))
    
    hours_since_sent = (datetime.now() - sent_at).total_seconds() / 3600
    
    urgency = tracking.get('urgency_level', 'low')
    
    # Check thresholds
    if urgency == 'high' and hours_since_sent >= 24:
        logger.info(f"⏰ High urgency: {hours_since_sent:.1f}h since sent (threshold: 24h)")
        return True
    elif urgency == 'medium' and hours_since_sent >= 48:
        logger.info(f"⏰ Medium urgency: {hours_since_sent:.1f}h since sent (threshold: 48h)")
        return True
    elif urgency == 'low' and hours_since_sent >= 72:
        logger.info(f"⏰ Low urgency: {hours_since_sent:.1f}h since sent (threshold: 72h)")
        return True
    
    return False


def should_send_team_notification(tracking: Dict) -> bool:
    """
    Determine if team notification email should be sent to clinic admin
    
    Rules:
    - High urgency: 48 hours after sent (24h after auto follow-up)
    - Medium urgency: 96 hours after sent (48h after auto follow-up)
    - Low urgency: 168 hours after sent (96h after auto follow-up)
    - Only if not already opened
    - Only if not already sent
    
    Args:
        tracking: Email tracking dict
        
    Returns:
        Boolean indicating if team notification should be sent
    """
    # Already opened? No need for notification
    if tracking.get('first_opened_at'):
        return False
    
    # Already sent team notification? Don't send again
    if tracking.get('team_notification_sent_at'):
        return False
    
    # Calculate hours since sent
    sent_at = tracking.get('sent_at')
    if not sent_at:
        return False
    
    if isinstance(sent_at, str):
        sent_at = datetime.fromisoformat(sent_at.replace('Z', '+00:00'))
    
    hours_since_sent = (datetime.now() - sent_at).total_seconds() / 3600
    
    urgency = tracking.get('urgency_level', 'low')
    
    # Check thresholds
    if urgency == 'high' and hours_since_sent >= 48:
        logger.info(f"📧 High urgency team notification: {hours_since_sent:.1f}h since sent (threshold: 48h)")
        return True
    elif urgency == 'medium' and hours_since_sent >= 96:
        logger.info(f"📧 Medium urgency team notification: {hours_since_sent:.1f}h since sent (threshold: 96h)")
        return True
    elif urgency == 'low' and hours_since_sent >= 168:
        logger.info(f"📧 Low urgency team notification: {hours_since_sent:.1f}h since sent (threshold: 168h)")
        return True
    
    return False


def format_urgency_emoji(urgency_level: str) -> str:
    """Get emoji for urgency level"""
    return {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
    }.get(urgency_level, '⚪')


def format_time_since(timestamp: Optional[str]) -> str:
    """Format time since timestamp in human-readable form"""
    if not timestamp:
        return "Unknown"
    
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    
    delta = datetime.now() - timestamp
    
    if delta.days > 0:
        return f"{delta.days} day{'s' if delta.days != 1 else ''} ago"
    
    hours = delta.seconds // 3600
    if hours > 0:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    
    minutes = (delta.seconds % 3600) // 60
    return f"{minutes} minute{'s' if minutes != 1 else ''} ago"

