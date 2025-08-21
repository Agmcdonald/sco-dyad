# Super Comic Organizer

A comprehensive comic book collection management application that automatically organizes digital comic files by parsing filenames, detecting metadata, and cataloging them into a structured library.

![Super Comic Organizer Dashboard](public/placeholder.svg)

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
2. **Extract** the ZIP file to your desired location (e.g., `C:\Projects\super-comic-organizer` or `~/Projects/super-comic-organizer`)

### Step 2: Install Dependencies

1. Open a terminal/command prompt
2. Navigate to the project directory:
   ```bash
   cd path/to/super-comic-organizer
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
   This process may take a few minutes as it downloads all necessary packages.

### Step 3: Start the Application

You can run the application in two modes:

**1. Web Mode (for development)**
```bash
npm run dev
```
This will start the web server, and you can open the app in your browser at `http://localhost:5173`. Note that file system features will be limited.

**2. Electron Mode (Desktop App)**
```bash
npm run electron
```
This command will start the web server and launch the native desktop application window. This is the recommended way to run the app for full functionality.

## Getting Started

### Initial Setup

1. **Launch in Electron Mode**: Use `npm run electron` to start the desktop app.
2. **Add Files/Folders**: Use the `File` menu (`Add Files...` or `Add Folder...`) to import your comic files.
3. **Process Files**: Navigate to the "Organize" page and use the "Start Processing" button.
4. **Review Results**: Check the "Learning" section for any files that need manual review.

### Basic Workflow

1. **Add Files**: Import comic files to the processing queue.
2. **Process Files**: Let the intelligent system parse and match metadata.
3. **Review & Correct**: Manually verify and correct any uncertain matches.
4. **Organize Library**: Successfully processed comics are added to your organized collection.
5. **Browse & Manage**: Use the library to search, filter, and manage your collection.

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

## Development

### Available Scripts

- `npm run dev` - Start the development server for web-only mode.
- `npm run electron` - Start the development server and launch the Electron app.
- `npm run build` - Build the application for production.
- `npm run preview` - Preview the production build locally.
- `npm run lint` - Run ESLint to check for code issues.

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
electron/
├── main.js             # Main Electron process
├── preload.js          # Electron preload script
└── ...                 # Other Electron-related files
```

## Packaging for Distribution

This project is configured to use `electron-builder` to create distributable installers for Windows, macOS, and Linux.

### Build Command

To package the application after exporting the code, run the following command in your local terminal:

```bash
npm run package
```

### What this command does:

1.  **`vite build`**: This first builds the React web application into an optimized set of static files located in the `dist/` directory.
2.  **`electron-builder`**: This tool then takes the built web app, your Electron source code (`electron/` directory), and packages them into a native application and installer.

### Output

The packaged application and installer will be created in a new `release/` directory in the project's root. For example, on Windows, you will find a `.exe` installer which can be used to install the application.

### Application Icon

The application will use a default icon. To use a custom icon:

1.  Create your icon in the required formats:
    *   **Windows**: `icon.ico` (256x256px)
    *   **macOS**: `icon.icns`
    *   **Linux**: `icon.png` (512x512px)
2.  Place these files inside a `build/` directory in the project root.
3.  Run the `npm run package` command again. `electron-builder` will automatically find and use these icons.

## Troubleshooting

### Common Issues

**Port Already in Use**
If port 5173 is already in use, Vite will automatically try the next available port. The Electron app may fail to connect. Ensure port 5173 is free before running `npm run electron`.

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

1. Check the browser's developer console for error messages (F12 or `View > Toggle Developer Tools` in Electron)
2. Review the terminal output for any error logs
3. Ensure all prerequisites are properly installed

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.