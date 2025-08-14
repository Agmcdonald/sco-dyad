# Comic Organizer

A comprehensive comic book collection management application that automatically organizes digital comic files by parsing filenames, detecting metadata, and cataloging them into a structured library.

![Comic Organizer Dashboard](public/placeholder.svg)

## Features

### 🗂️ **Intelligent File Processing**
- **Smart Filename Parsing**: Automatically extracts series name, issue number, year, and volume from comic filenames
- **Knowledge Base Matching**: Uses a preseeded database of comic series to intelligently match and fill missing metadata
- **Confidence Scoring**: Rates matches as High/Medium/Low confidence to help users identify uncertain results
- **Batch Processing**: Process multiple files simultaneously with progress tracking

### 📚 **Library Management**
- **Organized Collection**: Browse comics in grid or series-grouped views
- **Advanced Search & Filtering**: Search by series, publisher, or use advanced filters
- **Metadata Editing**: Correct and update comic information with intelligent suggestions
- **Duplicate Detection**: Automatically identifies potential duplicate comics

### 🎯 **Manual Learning System**
- **Review Interface**: Manually map files that couldn't be processed automatically
- **Smart Suggestions**: Get intelligent recommendations based on filename analysis and knowledge base
- **Knowledge Base Integration**: Leverages extensive comic series database for accurate suggestions

### 📊 **Analytics & Insights**
- **Collection Statistics**: View publisher breakdowns, decade analysis, and completion metrics
- **Processing Metrics**: Track success rates, confidence levels, and processing progress
- **Library Health**: Monitor collection quality and get recommendations for improvements
- **Visual Charts**: Interactive charts showing collection trends and patterns

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18.0 or higher)
- **npm** (comes with Node.js)

### Installing Node.js

1. Visit [nodejs.org](https://nodejs.org)
2. Download the **LTS version** (recommended for most users)
3. Run the installer and follow the installation prompts
4. Verify the installation by opening a terminal/command prompt and running:
   ```bash
   node --version
   npm --version
   ```

## Installation

### Step 1: Download the Project

1. **From Dyad**: Export/download the project as a ZIP file
2. **Extract** the ZIP file to your desired location (e.g., `C:\Projects\comic-organizer` or `~/Projects/comic-organizer`)

### Step 2: Install Dependencies

1. Open a terminal/command prompt
2. Navigate to the project directory:
   ```bash
   cd path/to/comic-organizer
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
   This process may take a few minutes as it downloads all necessary packages.

### Step 3: Start the Development Server

Run the following command to start the application:
```bash
npm run dev
```

The terminal will display output similar to:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Open the Application

1. Open your web browser
2. Navigate to `http://localhost:5173`
3. The Comic Organizer application should now be running!

## Getting Started

### Initial Setup

1. **Explore the Dashboard**: The app starts with sample data including 5 comics in the library
2. **Add Mock Files**: Click "Scan Folder" or "Add Files" to simulate adding comic files to the processing queue
3. **Test Processing**: Use the "Start Processing" button to see how the intelligent detection works
4. **Review Results**: Check the Learning section for files that need manual review

### Basic Workflow

1. **Add Files**: Import comic files to the processing queue
2. **Process Files**: Let the intelligent system parse and match metadata
3. **Review & Correct**: Manually verify and correct any uncertain matches
4. **Organize Library**: Successfully processed comics are added to your organized collection
5. **Browse & Manage**: Use the library to search, filter, and manage your collection

## Configuration

### Settings

Access the Settings page to configure:

- **Theme**: Choose between light, dark, or system theme
- **File Handling**: Configure how original files are managed
- **Naming Conventions**: Customize folder and file naming patterns
- **API Integration**: Connect to Comic Vine API for enhanced metadata
- **Knowledge Base**: Manage the comic series database

### Comic Vine API (Optional)

To enable enhanced metadata fetching:

1. Sign up for a free account at [Comic Vine](https://comicvine.gamespot.com/api/)
2. Generate an API key
3. Enter the API key in Settings > Scrapers > Comic Vine API
4. Test the connection using the "Test Connection" button

## Current Limitations

Since this is a web-based application running in the browser, some features are currently simulated:

- **File System Access**: Cannot directly read/write files from your computer
- **Real File Processing**: Uses mock data instead of actual comic files
- **File Operations**: Moving/copying files is simulated

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── context/            # React context providers
├── lib/                # Utility functions and core logic
├── data/               # Static data and knowledge base
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

## Troubleshooting

### Common Issues

**Port Already in Use**
If port 5173 is already in use, Vite will automatically try the next available port (5174, 5175, etc.).

**Dependencies Installation Fails**
- Ensure you have Node.js 18+ installed
- Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again
- Check your internet connection

**Application Won't Start**
- Verify all dependencies are installed: `npm install`
- Check the terminal for error messages
- Ensure no other applications are using the same port

### Getting Help

If you encounter issues:

1. Check the browser's developer console for error messages (F12)
2. Review the terminal output for any error logs
3. Ensure all prerequisites are properly installed

## Future Enhancements

To make this work with actual comic files, potential next steps include:

1. **Desktop Application**: Convert to Electron app for full file system access
2. **Backend Server**: Add Node.js backend to handle file operations
3. **File System Access API**: Utilize modern browser APIs for limited file access
4. **Cloud Integration**: Add cloud storage support for cross-device access

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Note**: This application is currently in development and optimized for demonstration and testing purposes. For production use with actual comic files, additional development would be required to handle real file system operations.