# SEO Audit Tool

A comprehensive SEO audit tool with a modern React frontend and Node.js backend that analyzes websites for SEO issues and generates detailed reports.

![SEO Audit Tool](https://img.shields.io/badge/SEO-Audit%20Tool-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue.svg)

## Features

### 🔍 **Comprehensive SEO Analysis**
- **Sitemap Analysis**: Automatically discovers all URLs from your sitemap
- **Meta Tag Analysis**: Checks for missing or suboptimal title tags, meta descriptions, and Open Graph tags
- **Header Tag Analysis**: Validates H1 tag usage and structure
- **Image SEO**: Analyzes all images for alt text and broken image links
- **AI-Powered Suggestions**: Uses OpenAI GPT-4 to generate SEO-friendly titles and descriptions

### 📊 **Detailed Reporting**
- **Excel Reports**: Generates comprehensive Excel files with separate sheets for pages and images
- **Real-time Dashboard**: Modern web interface showing audit progress and results
- **Visual Statistics**: Charts and metrics for quick overview of SEO health
- **Issue Prioritization**: Highlights critical SEO issues for immediate attention

### 🚀 **Modern Tech Stack**
- **Frontend**: React 18 with Tailwind CSS for responsive, modern UI
- **Backend**: Node.js with Express for robust API handling
- **AI Integration**: OpenAI GPT-4 for intelligent SEO suggestions
- **Notifications**: Telegram bot integration for audit completion alerts

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Telegram bot token (optional)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd seo-audit-tool

# Install all dependencies (backend + frontend)
npm install
```

### 2. Configuration
Create or update the `config.js` file with your settings:

```javascript
module.exports = {
  sitemapUrl: 'https://yoursite.com/sitemap.xml',
  telegram: {
    token: 'your-telegram-bot-token',
    chatId: 'your-chat-id'
  },
  openAiApiKey: 'your-openai-api-key'
};
```

### 3. Initialize Tailwind CSS (if needed)
```bash
# Tailwind is already configured, but if you need to reinitialize:
npx tailwindcss init -p
```

## Usage

### Running the Application

#### Development Mode (Recommended)
```bash
# Run both frontend and backend concurrently
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

#### Production Mode
```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

#### Individual Services
```bash
# Run only backend
npm run server

# Run only frontend
npm run client
```

### Using the Web Interface

1. **Enter Sitemap URL**: Input your website's sitemap URL (e.g., `https://yoursite.com/sitemap.xml`)

2. **Analyze Sitemap**: Click "Analyze" to discover all URLs in your sitemap

3. **Run SEO Audit**: Click "Run Audit" to start the comprehensive SEO analysis

4. **View Results**: Monitor real-time progress and view detailed results in the dashboard

5. **Download Report**: Generate and download comprehensive Excel reports

### Command Line Usage (Legacy)
You can also run the original command-line version:

```bash
node index.js
```

## Project Structure

```
seo-audit-tool/
├── src/                   # React components
│   ├── App.js             # Main application component
│   ├── index.js           # React entry point
│   └── index.css          # Tailwind CSS styles
├── public/                # Static files
│   └── index.html         # HTML template
├── build/                 # Production build (created after npm run build)
├── server.js              # Express API server
├── index.js               # Original CLI script
├── ai.js                  # OpenAI integration  
├── telegram.js            # Telegram notifications
├── googleSheet.js         # Google Sheets integration
├── config.js              # Configuration file
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── package.json           # All dependencies
└── README.md              # This file
```

## API Endpoints

### `POST /api/analyze`
Analyzes a sitemap URL and returns discovered URLs.

**Request Body:**
```json
{
  "sitemapUrl": "https://example.com/sitemap.xml"
}
```

**Response:**
```json
{
  "urls": ["https://example.com/page1", "https://example.com/page2"],
  "count": 2
}
```

### `POST /api/audit`
Runs SEO audit on provided URLs.

**Request Body:**
```json
{
  "urls": ["https://example.com/page1", "https://example.com/page2"]
}
```

**Response:**
```json
{
  "pages": [...], 
  "images": [...]
}
```

### `POST /api/generate-report`
Generates Excel report from audit results.

**Request Body:**
```json
{
  "pages": [...],
  "images": [...]
}
```

## Features Explained

### SEO Checks Performed

#### Page-Level Analysis
- **Title Tags**: Length, presence, and SEO optimization
- **Meta Descriptions**: Length, presence, and relevance
- **H1 Tags**: Proper usage (exactly one per page)
- **Open Graph Tags**: Social media optimization
- **Robots Meta**: Crawling instructions
- **HTTP Status**: Page accessibility

#### Image Analysis
- **Alt Text**: Missing or inadequate alt attributes
- **Image Status**: Broken image detection
- **AI Suggestions**: Intelligent alt text generation
- **Image Optimization**: Size and format recommendations

#### AI-Powered Suggestions
- **Smart Titles**: SEO-optimized title suggestions
- **Meta Descriptions**: Compelling description generation
- **Alt Text**: Context-aware image descriptions

### Report Generation
- **Excel Format**: Professional, filterable reports
- **Dual Sheets**: Separate analysis for pages and images
- **Visual Formatting**: Color-coded issue highlighting
- **Actionable Insights**: Clear recommendations for improvements

## Customization

### Styling
The frontend uses Tailwind CSS for styling. Customize the design by:

1. Modifying `tailwind.config.js` for theme changes
2. Updating component classes in `src/App.js`
3. Adding custom CSS in `src/index.css`

### Backend Configuration
Customize the audit logic by modifying:

- `server.js` - API endpoints and audit logic
- `ai.js` - AI suggestion prompts and models
- `config.js` - Application settings

## Dependencies

### Backend Dependencies
- **axios**: HTTP client for web requests
- **cheerio**: Server-side HTML parsing
- **express**: Web application framework
- **exceljs**: Excel file generation
- **openai**: AI-powered suggestions
- **xml2js**: XML parsing for sitemaps
- **cors**: Cross-origin resource sharing

### Frontend Dependencies
- **react**: UI library
- **axios**: HTTP client
- **lucide-react**: Icon components
- **tailwindcss**: Utility-first CSS framework

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the documentation above
- Review the code comments for implementation details

## Roadmap

### Upcoming Features
- [ ] Bulk URL import
- [ ] Scheduled audits
- [ ] Performance metrics integration
- [ ] Custom report templates
- [ ] Multi-language support
- [ ] Database storage for historical data
- [ ] User authentication and multi-tenant support

### Performance Improvements
- [ ] Parallel processing for faster audits
- [ ] Caching for repeated URLs
- [ ] Progressive web app features
- [ ] Mobile-responsive improvements

---

**Built with ❤️ for better SEO**