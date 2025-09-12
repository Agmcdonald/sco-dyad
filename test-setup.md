# Testing Comic File Processing

## Method 1: Create Test Files

### Create Mock CBZ Files
```bash
# Create a test directory
mkdir test-comics
cd test-comics

# Create some test CBZ files (these are just ZIP files with images)
mkdir "Saga #1 (2012)"
cd "Saga #1 (2012)"

# Add some test images (you can use any JPG/PNG files)
# Or create simple test images:
echo "Test page 1" > page01.txt && convert -size 400x600 xc:white -pointsize 20 -annotate +50+300 "Saga #1 - Page 1" page01.jpg
echo "Test page 2" > page02.txt && convert -size 400x600 xc:lightblue -pointsize 20 -annotate +50+300 "Saga #1 - Page 2" page02.jpg

# Create CBZ file (ZIP with comic pages)
zip "../Saga #1 (2012).cbz" *.jpg
cd ..

# Create more test files
mkdir "Batman #1 (2016)"
cd "Batman #1 (2016)"
# Add test images and zip as "Batman #1 (2016).cbz"
# ... repeat process
```

### Or Download Sample Comics
- Download free comics from [Comic Book Plus](https://comicbookplus.com/)
- Use public domain comics
- Create your own test archives

## Method 2: Test in Development

### Start the Electron App
```bash
# Install dependencies if not done
npm install

# Start in Electron mode
npm run electron
```

### Test File Operations
1. **Menu Testing**: Use `File → Add Files...` or `File → Add Folder...`
2. **Drag & Drop**: (We'll implement this next)
3. **Mock Files**: Use the existing "Scan Folder" button for mock data

## Method 3: Direct API Testing

### Test Individual Functions
Create a test script to verify the backend works:

```javascript
// test-file-handler.js
const ComicFileHandler = require('./electron/fileHandler');
const path = require('path');

async function testFileHandler() {
  const handler = new ComicFileHandler();
  
  // Test file scanning
  const testFolder = './test-comics';
  try {
    const files = await handler.scanFolder(testFolder);
    console.log('Found files:', files);
    
    if (files.length > 0) {
      // Test reading a file
      const fileInfo = await handler.readComicFile(files[0].path);
      console.log('File info:', fileInfo);
      
      // Test cover extraction
      const coverPath = await handler.extractCover(files[0].path, './test-covers');
      console.log('Cover extracted to:', coverPath);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFileHandler();
```

## Method 4: Browser DevTools Testing

When running the Electron app:
1. Open DevTools (F12)
2. Check the Console for logs
3. Test the Electron API in the console:

```javascript
// Test if Electron API is available
console.log('Electron API:', window.electronAPI);

// Test file operations (if you have test files)
window.electronAPI.scanFolder('/path/to/test/folder')
  .then(files => console.log('Scanned files:', files));