# Installing Playwright on Production Server

## The Problem
The emailed PDFs look broken (tiny boxes, missing colors) because **Playwright browsers are not installed** on your production server. The system is falling back to `xhtml2pdf`, which has very limited CSS support.

## The Solution
You need to install Playwright's Chromium browser on your production server.

### For Render.com (or similar services):

**Option 1: Add to your build command**
```bash
pip install -r requirements.txt && playwright install chromium && playwright install-deps
```

**Option 2: Create a `render-build.sh` script:**
```bash
#!/bin/bash
pip install -r requirements.txt
playwright install chromium
playwright install-deps
```

Then set your build command to:
```bash
chmod +x render-build.sh && ./render-build.sh
```

### For Ubuntu/Debian servers:

```bash
# SSH into your server
ssh your-server

# Install Playwright browsers
cd /path/to/your/app
source venv/bin/activate  # if using virtualenv
playwright install chromium
playwright install-deps
```

### For Docker:

Add to your `Dockerfile`:
```dockerfile
RUN pip install playwright==1.49.0
RUN playwright install chromium
RUN playwright install-deps
```

## How to Verify It's Working

After installation, check your backend logs when sending an email. You should see:
```
✅ Playwright library imported successfully
✅ Playwright browsers verified and working
✅ Using Playwright for PDF generation
```

Instead of:
```
⚠️ Playwright NOT available, using xhtml2pdf fallback
❌ Falling back to xhtml2pdf (LIMITED CSS SUPPORT - WILL BE UGLY)
```

## Expected Results

**Before (xhtml2pdf):**
- Tiny boxes everywhere
- Missing color legend
- No borders/shadows
- Broken layout

**After (Playwright):**
- Clean, professional PDF
- Color legend visible
- Proper spacing and layout
- Matches interface PDF exactly

## Questions?

If you're not sure how to install on your specific hosting provider, let me know which service you're using (Render, Heroku, AWS, etc.) and I can provide specific instructions.

