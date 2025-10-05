import os
import requests
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import tempfile
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PDFGenerator:
    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 0.5 * inch
        self.content_width = self.page_width - (2 * self.margin)
        
    def generate_dental_report_pdf(self, report_data: dict, clinic_branding: dict, output_path: str = None) -> str:
        """
        Generate a professional dental report PDF with clinic branding
        
        Args:
            report_data: Dictionary containing report information
            clinic_branding: Dictionary containing clinic branding information
            output_path: Optional path to save the PDF, if None creates temp file
            
        Returns:
            Path to the generated PDF file
        """
        try:
            if not output_path:
                # Create temporary file
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                output_path = temp_file.name
                temp_file.close()
            
            # Create PDF document
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=self.margin,
                leftMargin=self.margin,
                topMargin=self.margin,
                bottomMargin=self.margin
            )
            
            # Build story (content)
            story = []
            styles = getSampleStyleSheet()
            
            # Add clinic header
            story.extend(self._create_clinic_header(clinic_branding, styles))
            story.append(Spacer(1, 20))
            
            # Add patient information
            story.extend(self._create_patient_info(report_data, styles))
            story.append(Spacer(1, 20))
            
            # Add annotated X-ray image if available
            if report_data.get('annotated_image_url'):
                story.extend(self._add_annotated_image(report_data['annotated_image_url'], styles))
                story.append(Spacer(1, 20))
            
            # Add report content
            story.extend(self._create_report_content(report_data, styles))
            story.append(Spacer(1, 20))
            
            # Add interactive buttons section
            story.extend(self._create_interactive_section(report_data, styles))
            story.append(Spacer(1, 20))
            
            # Add footer
            story.extend(self._create_footer(clinic_branding, styles))
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"✅ PDF generated successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error generating PDF: {str(e)}")
            raise e
    
    def _create_clinic_header(self, clinic_branding: dict, styles) -> list:
        """Create clinic header with logo and contact information"""
        elements = []
        
        # Clinic name (large, centered)
        clinic_name = clinic_branding.get('clinic_name', 'Dental Clinic')
        clinic_style = ParagraphStyle(
            'ClinicName',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor(clinic_branding.get('primary_color', '#1e88e5')),
            alignment=TA_CENTER,
            spaceAfter=12
        )
        elements.append(Paragraph(clinic_name, clinic_style))
        
        # Contact information table
        contact_data = []
        
        # Add logo if available
        if clinic_branding.get('logo_url'):
            try:
                # Download logo and add to PDF
                logo_response = requests.get(clinic_branding['logo_url'])
                if logo_response.status_code == 200:
                    logo_path = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                    logo_path.write(logo_response.content)
                    logo_path.close()
                    
                    logo_img = Image(logo_path.name, width=1*inch, height=1*inch)
                    logo_img.hAlign = 'CENTER'
                    elements.append(logo_img)
                    elements.append(Spacer(1, 10))
                    
                    # Clean up temp file
                    os.unlink(logo_path.name)
            except Exception as e:
                logger.warning(f"Could not add logo: {str(e)}")
        
        # Add contact details
        if clinic_branding.get('address'):
            contact_data.append(['Address:', clinic_branding['address']])
        if clinic_branding.get('phone'):
            contact_data.append(['Phone:', clinic_branding['phone']])
        if clinic_branding.get('email'):
            contact_data.append(['Email:', clinic_branding['email']])
        if clinic_branding.get('website'):
            contact_data.append(['Website:', clinic_branding['website']])
        
        if contact_data:
            contact_table = Table(contact_data, colWidths=[1*inch, 4*inch])
            contact_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor(clinic_branding.get('secondary_color', '#666666'))),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(contact_table)
        
        return elements
    
    def _create_patient_info(self, report_data: dict, styles) -> list:
        """Create patient information section"""
        elements = []
        
        # Patient name
        patient_name = report_data.get('patient_name', 'Patient')
        patient_style = ParagraphStyle(
            'PatientName',
            parent=styles['Heading2'],
            fontSize=18,
            textColor=colors.black,
            spaceAfter=12
        )
        elements.append(Paragraph(f"Patient: {patient_name}", patient_style))
        
        # Report date
        report_date = report_data.get('created_at', datetime.now().isoformat())
        try:
            date_obj = datetime.fromisoformat(report_date.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime('%B %d, %Y at %I:%M %p')
        except:
            formatted_date = report_date
        
        date_style = ParagraphStyle(
            'ReportDate',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.gray,
            spaceAfter=12
        )
        elements.append(Paragraph(f"Report Generated: {formatted_date}", date_style))
        
        return elements
    
    def _add_annotated_image(self, image_url: str, styles) -> list:
        """Add annotated X-ray image to PDF"""
        elements = []
        
        try:
            # Download image
            response = requests.get(image_url)
            if response.status_code == 200:
                # Save to temp file
                temp_img = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                temp_img.write(response.content)
                temp_img.close()
                
                # Add image to PDF
                img = Image(temp_img.name, width=6*inch, height=4*inch)
                img.hAlign = 'CENTER'
                elements.append(img)
                
                # Clean up temp file
                os.unlink(temp_img.name)
                
                # Add caption
                caption_style = ParagraphStyle(
                    'ImageCaption',
                    parent=styles['Normal'],
                    fontSize=10,
                    textColor=colors.gray,
                    alignment=TA_CENTER,
                    spaceAfter=6
                )
                elements.append(Paragraph("Annotated X-ray Analysis", caption_style))
                
        except Exception as e:
            logger.warning(f"Could not add annotated image: {str(e)}")
            elements.append(Paragraph("Annotated X-ray image not available", styles['Normal']))
        
        return elements
    
    def _create_report_content(self, report_data: dict, styles) -> list:
        """Create the main report content section"""
        elements = []
        
        # Report title
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.black,
            spaceAfter=12
        )
        elements.append(Paragraph("Dental Analysis & Treatment Plan", title_style))
        
        # Report HTML content (convert to plain text for PDF)
        report_html = report_data.get('report_html', '')
        if report_html:
            # Simple HTML to text conversion
            import re
            # Remove HTML tags
            clean_text = re.sub(r'<[^>]+>', '', report_html)
            # Clean up extra whitespace
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            # Split into paragraphs and add to PDF
            paragraphs = clean_text.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    para_style = ParagraphStyle(
                        'ReportParagraph',
                        parent=styles['Normal'],
                        fontSize=11,
                        textColor=colors.black,
                        spaceAfter=8,
                        alignment=TA_LEFT
                    )
                    elements.append(Paragraph(para.strip(), para_style))
        else:
            elements.append(Paragraph("No report content available", styles['Normal']))
        
        return elements
    
    def _create_interactive_section(self, report_data: dict, styles) -> list:
        """Create section with interactive buttons/links"""
        elements = []
        
        # Section title
        title_style = ParagraphStyle(
            'InteractiveTitle',
            parent=styles['Heading3'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=12
        )
        elements.append(Paragraph("Additional Resources", title_style))
        
        # Video button
        if report_data.get('video_url'):
            video_text = f"📹 Watch Your Report Video: {report_data['video_url']}"
            video_style = ParagraphStyle(
                'VideoLink',
                parent=styles['Normal'],
                fontSize=11,
                textColor=colors.blue,
                spaceAfter=8
            )
            elements.append(Paragraph(video_text, video_style))
        
        # Consultation button
        consultation_text = "🤖 Interactive Consultation: Ask questions about your treatment plan"
        consultation_style = ParagraphStyle(
            'ConsultationText',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.green,
            spaceAfter=8
        )
        elements.append(Paragraph(consultation_text, consultation_style))
        
        # Note about interactive features
        note_style = ParagraphStyle(
            'InteractiveNote',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            fontStyle='italic',
            spaceAfter=8
        )
        elements.append(Paragraph("Note: Click the links above to access video and interactive consultation features.", note_style))
        
        return elements
    
    def _create_footer(self, clinic_branding: dict, styles) -> list:
        """Create footer with clinic information"""
        elements = []
        
        # Separator line
        elements.append(Spacer(1, 20))
        
        # Footer text
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray,
            alignment=TA_CENTER,
            spaceAfter=6
        )
        
        clinic_name = clinic_branding.get('clinic_name', 'Dental Clinic')
        elements.append(Paragraph(f"Report generated by {clinic_name}", footer_style))
        elements.append(Paragraph("This report contains confidential patient information", footer_style))
        elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", footer_style))
        
        return elements

# Create global instance
pdf_generator = PDFGenerator()
