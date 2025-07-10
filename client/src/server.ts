import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI from 'openai';

const app = express();
const port = 3001;

// CORS for local dev
app.use(cors());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI setup
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error('Warning: OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

app.use(express.json({ limit: '2mb' }));

app.post('/generate-report', upload.single('opgImage'), async (req, res) => {
  try {
    const { patientName, findings } = req.body;
    // findings is expected as a JSON string
    const findingsArr = JSON.parse(findings || '[]');
    // For now, we ignore the image, but you could process it if needed

    // Compose a prompt for OpenAI
    const prompt = `Generate a dental treatment report for patient ${patientName}.\nFindings: ${findingsArr.map(f => `Tooth ${f.tooth}: ${f.condition} - ${f.treatment}`).join('; ')}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a dental AI assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    });

    const report = completion.choices[0]?.message?.content || 'No report generated.';
    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

app.post('/apply-suggested-changes', async (req, res) => {
  try {
    const { previous_report_html, change_request_text } = req.body;
    if (!previous_report_html || !change_request_text) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const systemPrompt = `You are an expert dental assistant AI and HTML editor. You will receive:

1. An existing HTML dental treatment plan report, already formatted with inline styles and condition blocks.
2. A plain-text change request written by a dentist, describing edits they'd like made to the content.

Your task is to carefully update the HTML to reflect these requested changes.

Instructions:
- Maintain the full structure and inline styles of the HTML exactly as-is.
- Only modify the **text content inside HTML elements** when explicitly instructed.
- If the dentist asks to remove a condition entirely, you may delete that entire <div> block.
- Do not reword, reformat, or reorder any part of the document unless the change request specifies it.
- Do not add or alter colors, classes, or structure.
- The output must be a valid, continuous HTML string (starting with <div and ending with </div>).
- Do not include markdown, code fences, or JSON formatting.
- Accuracy is critical. This output will be used in patient-facing medical documents.`;
    const userPrompt = `Here is the current HTML version of the treatment report:\n${previous_report_html}\n\nHere is the dentist's change request (typed or dictated):\n${change_request_text}\n\nPlease apply the change exactly as described, keeping the HTML structure intact and updating only the necessary content.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
    });
    const updatedHtml = completion.choices[0]?.message?.content || '';
    res.json({ updated_html: updatedHtml });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply suggested changes.' });
  }
});

app.listen(port, () => {
  console.log(`Scanwise backend listening on port ${port}`);
}); 