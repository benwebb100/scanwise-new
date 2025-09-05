import os
import tempfile
import logging
import base64
import mimetypes
import re
from typing import Optional

logger = logging.getLogger(__name__)


class HtmlPdfService:
    """Render HTML (with CSS) to PDF.

    Primary renderer: Playwright (Chromium) for full-fidelity HTML/CSS.
    Fallback: xhtml2pdf if Playwright is unavailable in the environment.
    """

    def __init__(self) -> None:
        self._playwright_available = False
        try:
            # Lazy import check so environments without Playwright still work
            import playwright  # type: ignore
            self._playwright_available = True
        except Exception:
            logger.warning("Playwright not available; will use xhtml2pdf fallback if needed.")

    def render_html_to_pdf(self, html: str, base_url: Optional[str] = None) -> str:
        """Render given HTML string to a temporary PDF file and return its path."""
        # Convert local file paths in img src attributes to data URLs
        html = self._convert_local_images_to_data_urls(html)
        
        # Write HTML to a temp file for deterministic base URL handling
        html_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".html")
        html_tmp.write(html.encode("utf-8"))
        html_tmp.close()

        try:
            if self._playwright_available:
                return self._render_with_playwright(html_tmp.name, base_url)
            return self._render_with_xhtml2pdf(html)
        finally:
            try:
                os.unlink(html_tmp.name)
            except Exception:
                pass

    def _render_with_playwright(self, html_path: str, base_url: Optional[str]) -> str:
        from playwright.sync_api import sync_playwright  # type: ignore

        pdf_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        pdf_path = pdf_tmp.name
        pdf_tmp.close()

        logger.info("Rendering PDF with Playwright…")
        with sync_playwright() as p:
            browser = p.chromium.launch(args=[
                "--no-sandbox",
                "--disable-gpu",
            ])
            try:
                page = browser.new_page()
                file_url = f"file://{html_path}"
                page.goto(file_url, wait_until="load")
                page.pdf(path=pdf_path, print_background=True, format="A4", margin={
                    "top": "14mm", "bottom": "14mm", "left": "14mm", "right": "14mm"
                })
            finally:
                browser.close()
        logger.info(f"PDF written: {pdf_path}")
        return pdf_path

    def _convert_local_images_to_data_urls(self, html: str) -> str:
        """Convert local file paths and HTTP URLs in img src attributes to data URLs."""
        def replace_src(match):
            src_value = match.group(1)
            logger.info(f"🖼️ HTML PDF service - processing image src: {src_value}")
            
            # Check if this looks like a local file path (starts with / or contains /tmp/)
            if src_value.startswith('/') or '/tmp/' in src_value:
                try:
                    if os.path.exists(src_value):
                        # Get MIME type
                        mime_type, _ = mimetypes.guess_type(src_value)
                        if not mime_type:
                            mime_type = 'image/jpeg'  # Default fallback
                        
                        # Read file and encode as base64
                        with open(src_value, 'rb') as img_file:
                            img_data = img_file.read()
                            b64_data = base64.b64encode(img_data).decode('utf-8')
                            logger.info(f"✅ Successfully converted local image to data URL: {src_value}")
                            return f'src="data:{mime_type};base64,{b64_data}"'
                    else:
                        logger.warning(f"❌ Local image file not found: {src_value}")
                        # Return a placeholder or empty src to prevent errors
                        return 'src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg=="'
                except Exception as e:
                    logger.warning(f"Failed to convert local image to data URL: {src_value}, error: {e}")
                    # Return a placeholder image to prevent errors
                    return 'src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+"'
            
            # Check if this is an HTTP/HTTPS URL (like Supabase URLs)
            elif src_value.startswith('http://') or src_value.startswith('https://'):
                try:
                    import requests
                    logger.info(f"🌐 Downloading HTTP image: {src_value}")
                    response = requests.get(src_value, timeout=30)
                    response.raise_for_status()
                    
                    # Get MIME type from response headers
                    mime_type = response.headers.get('content-type', 'image/jpeg')
                    if not mime_type.startswith('image/'):
                        mime_type = 'image/jpeg'  # Default fallback
                    
                    # Convert to base64 data URL
                    b64_data = base64.b64encode(response.content).decode('utf-8')
                    logger.info(f"✅ Successfully converted HTTP image to data URL: {src_value}")
                    return f'src="data:{mime_type};base64,{b64_data}"'
                    
                except Exception as e:
                    logger.warning(f"Failed to download HTTP image: {src_value}, error: {e}")
                    # Return a placeholder image to prevent errors
                    return 'src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+"'
            
            # Return original src if it's not a local path or HTTP URL
            return match.group(0)
        
        # Find and replace src attributes in img tags
        pattern = r'src="([^"]*)"'
        return re.sub(pattern, replace_src, html)

    def _render_with_xhtml2pdf(self, html: str) -> str:
        logger.info("Rendering PDF with xhtml2pdf fallback…")
        from xhtml2pdf import pisa  # type: ignore

        pdf_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        pdf_path = pdf_tmp.name
        pdf_tmp.close()

        with open(pdf_path, "wb") as out_file:
            pisa.CreatePDF(src=html, dest=out_file)  # Basic conversion; limited CSS support

        return pdf_path


html_pdf_service = HtmlPdfService()


