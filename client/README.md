# Scanwise - Dental Treatment Report Generator

An AI-enhanced dental treatment report generator with a modern React frontend and Express backend.

## Features

- **AI-Powered Report Generation**: Uses OpenAI GPT-3.5-turbo to generate comprehensive dental treatment reports
- **Interactive Findings Input**: Table-based interface for entering tooth conditions and treatments
- **WYSIWYG Report Editing**: Inline editing capabilities with real-time preview
- **AI Change Suggestions**: Natural language editing with speech-to-text support
- **Version History**: Track changes with undo/restore functionality
- **Export Options**: Download reports as HTML, TXT, or PDF
- **Audit Trail**: Complete logging of all changes and actions
- **Mobile Optimized**: Responsive design for all devices

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/benwebb100/scanwise.git
cd scanwise
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
bun run dev
```

5. Start the backend server (in a separate terminal):
```bash
node src/server.ts
# or
bun src/server.ts
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required for AI features)

## Usage

1. Navigate to the application in your browser
2. Enter patient information and dental findings
3. Upload OPG images (optional)
4. Generate AI-powered treatment reports
5. Edit reports inline with WYSIWYG editor
6. Use AI suggestions for natural language changes
7. Export reports in various formats
8. Track version history and audit trail

## Project Structure

```
src/
├── components/     # UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
└── server.ts      # Express backend server
```

## API Endpoints

- `POST /generate-report`: Generate dental treatment reports
- `POST /apply-suggested-changes`: Apply AI-suggested changes to reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
