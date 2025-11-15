"""
Follow-up Email Service
Handles automated follow-up emails and team notifications for unopened reports
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class FollowUpEmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = os.getenv('GMAIL_EMAIL')
        self.app_password = os.getenv('GMAIL_APP_PASSWORD')
        self.team_notification_email = os.getenv('TEAM_NOTIFICATION_EMAIL', 'team@scan-wise.com')
        
        logger.info(f"Follow-up email service initialized with sender: {self.sender_email}")
    
    async def send_patient_followup(
        self,
        patient_email: str,
        patient_name: str,
        clinic_name: str,
        clinic_phone: str,
        clinic_website: str,
        report_id: str,
        urgency_level: str,
        original_message_id: str = None
    ):
        """
        Send automated follow-up email to patient
        
        Args:
            patient_email: Patient's email
            patient_name: Patient's name
            clinic_name: Clinic name
            clinic_phone: Clinic phone
            clinic_website: Clinic website
            report_id: Report ID for tracking
            urgency_level: 'high', 'medium', or 'low'
            original_message_id: Message-ID from original email for threading
        """
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{clinic_name} <{self.sender_email}>"
            msg['To'] = patient_email
            
            # Set subject based on urgency
            if urgency_level == 'high':
                msg['Subject'] = f"URGENT: Your Dental Treatment Plan - {patient_name}"
            elif urgency_level == 'medium':
                msg['Subject'] = f"Follow-up: Your Dental Treatment Plan - {patient_name}"
            else:
                msg['Subject'] = f"Reminder: Your Dental Treatment Plan - {patient_name}"
            
            # Thread with original email if we have message ID
            if original_message_id:
                msg['In-Reply-To'] = original_message_id
                msg['References'] = original_message_id
            
            # Create email content based on urgency
            text_content = self._create_followup_text(
                patient_name,
                clinic_name,
                clinic_phone,
                clinic_website,
                urgency_level
            )
            
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
            
            # Send email
            result = self._send_email(msg)
            
            if result:
                logger.info(f"✅ Follow-up email sent to {patient_email} (urgency: {urgency_level})")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error sending follow-up email: {str(e)}")
            raise e
    
    async def send_team_notification(
        self,
        clinic_admin_email: str,
        patient_name: str,
        patient_email: str,
        clinic_name: str,
        report_id: str,
        urgency_level: str,
        hours_since_sent: float
    ):
        """
        Send team notification to clinic admin about unopened report
        
        Args:
            clinic_admin_email: Clinic admin's email
            patient_name: Patient's name
            patient_email: Patient's email
            clinic_name: Clinic name
            report_id: Report ID
            urgency_level: 'high', 'medium', or 'low'
            hours_since_sent: Hours since report was sent
        """
        try:
            msg = MIMEMultipart()
            msg['From'] = f"ScanWise Follow-Ups <{self.sender_email}>"
            msg['To'] = clinic_admin_email
            
            # Set subject based on urgency
            urgency_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(urgency_level, '⚪')
            msg['Subject'] = f"{urgency_emoji} Follow-Up Needed: {patient_name} hasn't opened their report"
            
            # Create notification content
            text_content = self._create_team_notification_text(
                patient_name,
                patient_email,
                clinic_name,
                urgency_level,
                hours_since_sent,
                report_id
            )
            
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
            
            # Send email
            result = self._send_email(msg)
            
            if result:
                logger.info(f"✅ Team notification sent to {clinic_admin_email} for report {report_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error sending team notification: {str(e)}")
            raise e
    
    def _create_followup_text(
        self,
        patient_name: str,
        clinic_name: str,
        clinic_phone: str,
        clinic_website: str,
        urgency_level: str
    ) -> str:
        """Create follow-up email text content based on urgency"""
        
        if urgency_level == 'high':
            # Emergency follow-up (24 hours)
            return f"""Hi {patient_name},

We wanted to follow up on your dental treatment plan that we sent recently.

IMPORTANT: Your dental scan identified conditions that require prompt attention. Early treatment prevents complications and ensures the best outcomes for your oral health.

We understand you may have questions or concerns about your treatment plan. Our team is here to help you understand your options and schedule your next appointment.

Please contact us at {clinic_phone} or visit {clinic_website} to:
• Discuss your treatment plan
• Ask any questions
• Schedule your next appointment
• Explore payment options

Your oral health is our priority, and we're here to support you every step of the way.

Best regards,
{clinic_name}

---
Questions? Call us at {clinic_phone}
"""
        
        elif urgency_level == 'medium':
            # Complex treatment follow-up (48 hours)
            return f"""Hi {patient_name},

We wanted to follow up on your dental treatment plan that we sent a couple of days ago.

Your dental scan identified conditions that would benefit from timely treatment. Addressing these issues now helps prevent them from becoming more complex and costly in the future.

We understand that reviewing dental treatment plans can bring up questions. Our team is happy to:
• Walk you through your treatment plan
• Answer any questions you have
• Discuss scheduling and payment options
• Help you feel confident about your next steps

Please reach out to us at {clinic_phone} or visit {clinic_website} to schedule a consultation.

Looking forward to helping you achieve optimal oral health!

Best regards,
{clinic_name}

---
Contact us: {clinic_phone}
"""
        
        else:
            # Routine follow-up (72 hours)
            return f"""Hi {patient_name},

We hope you've had a chance to review the dental treatment plan we sent last week.

We're here to answer any questions you may have and help you schedule your next appointment at your convenience.

Feel free to contact us at {clinic_phone} or visit {clinic_website} whenever you're ready to:
• Discuss your treatment options
• Schedule an appointment
• Learn more about your oral health

We look forward to seeing you!

Best regards,
{clinic_name}

---
Reach us at: {clinic_phone}
"""
    
    def _create_team_notification_text(
        self,
        patient_name: str,
        patient_email: str,
        clinic_name: str,
        urgency_level: str,
        hours_since_sent: float,
        report_id: str
    ) -> str:
        """Create team notification text"""
        
        urgency_text = {
            'high': 'HIGH PRIORITY - Emergency conditions detected',
            'medium': 'MEDIUM PRIORITY - Complex treatment required',
            'low': 'Routine follow-up'
        }.get(urgency_level, 'Follow-up needed')
        
        days_since = hours_since_sent / 24
        days_text = f"{days_since:.1f} days" if days_since >= 1 else f"{hours_since:.0f} hours"
        
        return f"""Follow-Up Needed

Clinic: {clinic_name}
Patient: {patient_name}
Email: {patient_email}
Report ID: {report_id}

Status: Report NOT opened after {days_text}
Priority: {urgency_text}

ACTION REQUIRED:
Please contact this patient to:
1. Ensure they received their treatment plan
2. Answer any questions they may have
3. Help them schedule their next appointment

An automated follow-up email has already been sent to the patient.

View full report details in your ScanWise dashboard:
https://scan-wise.com/dashboard

---
This is an automated notification from ScanWise
"""
    
    def _send_email(self, msg):
        """Send email using Gmail SMTP"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            
            if not self.sender_email or not self.app_password:
                raise Exception("Email credentials not configured")
            
            server.login(self.sender_email, self.app_password)
            text = msg.as_string()
            server.sendmail(self.sender_email, msg['To'], text)
            server.quit()
            
            logger.info(f"Email sent successfully to {msg['To']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise e


# Create global instance
followup_email_service = FollowUpEmailService()

