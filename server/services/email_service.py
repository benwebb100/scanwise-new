import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = os.getenv('GMAIL_EMAIL')
        self.app_password = os.getenv('GMAIL_APP_PASSWORD')
        
        # Log email configuration (without exposing password)
        logger.info(f"Email service initialized with sender: {self.sender_email}")
        logger.info(f"App password configured: {'Yes' if self.app_password else 'No'}")
        
    async def send_dental_report(self, patient_email: str, patient_name: str, report_data: dict, clinic_branding: dict):
        """
        Send dental report to patient via email with PDF attachment
        
        Args:
            patient_email: Patient's email address
            patient_name: Patient's name
            report_data: Full report data dictionary
            clinic_branding: Clinic branding information
        """
        try:
            # Create message
            msg = MIMEMultipart()
            # Use ScanWise as default if clinic_name is None or empty
            clinic_name = clinic_branding.get('clinic_name') or 'ScanWise'
            msg['From'] = f"{clinic_name} <{self.sender_email}>"
            msg['To'] = patient_email
            msg['Subject'] = f"Dental Report - {patient_name}"
            
            # Create text content
            text_content = self._create_email_text(patient_name, clinic_branding)
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
            
            # Generate PDF using HTML-preserving renderer
            try:
                from services.html_pdf_service import html_pdf_service
                from jinja2 import Environment, FileSystemLoader, select_autoescape
                from datetime import datetime

                templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
                env = Environment(
                    loader=FileSystemLoader(templates_dir),
                    autoescape=select_autoescape(['html'])
                )
                template = env.get_template('report.html')

                # Build legend if available (optional list of strings)
                legend = report_data.get('legend', [])

                # Log the annotated image URL for debugging
                annotated_url = report_data.get('annotated_image_url')
                logger.info(f"Email service - annotated_image_url: {annotated_url}")
                
                # Get report HTML and log for debugging
                report_html = report_data.get('report_html') or ''
                logger.info(f"📄 Report HTML length: {len(report_html)} characters")
                logger.info(f"📄 Report HTML starts with: {report_html[:100] if report_html else 'EMPTY'}")
                
                html = template.render(
                    clinic_name=clinic_branding.get('clinic_name') or 'ScanWise',
                    address=clinic_branding.get('address'),
                    phone=clinic_branding.get('phone'),
                    email=clinic_branding.get('email'),
                    website=clinic_branding.get('website'),
                    primary_color=clinic_branding.get('primary_color') or '#1e88e5',
                    patient_name=report_data.get('patient_name') or 'Patient',
                    report_date=report_data.get('created_at') or datetime.now().isoformat(),
                    report_html=report_html,
                    annotated_image_url=annotated_url,
                    legend=legend,
                    video_url=report_data.get('video_url'),
                    consultation_url=report_data.get('consultation_url'),
                )
                
                logger.info(f"📧 Final rendered HTML length: {len(html)} characters")
                logger.info(f"📧 Final HTML starts with: {html[:150]}")

                pdf_path = await html_pdf_service.render_html_to_pdf(html)
            except Exception as html_err:
                logger.warning(f"HTML PDF render failed ({html_err}); falling back to ReportLab.")
                from services.pdf_generator import pdf_generator
                pdf_path = pdf_generator.generate_dental_report_pdf(report_data, clinic_branding)
            
            # Attach PDF
            with open(pdf_path, 'rb') as pdf_file:
                pdf_attachment = MIMEBase('application', 'pdf')
                pdf_attachment.set_payload(pdf_file.read())
                encoders.encode_base64(pdf_attachment)
                pdf_attachment.add_header(
                    'Content-Disposition',
                    'attachment',
                    filename=f"dental_report_{patient_name.replace(' ', '_')}.pdf"
                )
                msg.attach(pdf_attachment)
            
            # Send email
            result = self._send_email(msg)
            
            # Clean up temporary PDF file
            try:
                os.unlink(pdf_path)
            except:
                pass
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending dental report email: {str(e)}")
            raise e
    
    def _create_email_text(self, patient_name: str, clinic_branding: dict) -> str:
        """
        Create simple text email content (no HTML to avoid spam)
        """
        # Use ScanWise as default if clinic_name is None or empty
        clinic_name = clinic_branding.get('clinic_name') or 'ScanWise'
        clinic_phone = clinic_branding.get('phone') or 'our office'
        clinic_website = clinic_branding.get('website') or 'our website'
        
        text_content = f"""Hi {patient_name},

Please view your treatment plan and dental report attached below.

If you have any questions about your treatment plan, please contact us at {clinic_phone} or visit {clinic_website}.

Best regards,
{clinic_name}

---
This email was sent automatically. Please do not reply to this email.
"""
        
        return text_content
    
    def _send_email(self, msg):
        """
        Send email using Gmail SMTP
        """
        try:
            # Create SMTP session
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            
            # Login
            if not self.sender_email or not self.app_password:
                raise Exception("Email credentials not configured")
            server.login(self.sender_email, self.app_password)
            
            # Send email
            text = msg.as_string()
            server.sendmail(self.sender_email, msg['To'], text)
            
            # Close connection
            server.quit()
            
            logger.info(f"Email sent successfully to {msg['To']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise e
    
    def test_connection(self):
        """
        Test email service connection
        """
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.app_password)
            server.quit()
            return True
        except Exception as e:
            logger.error(f"Email service connection test failed: {str(e)}")
            return False

# Create global instance
email_service = EmailService()
