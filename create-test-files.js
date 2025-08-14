const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create test directory
const testDir = './test-comics';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Sample comic data
const testComics = [
  { series: 'Saga', issue: '1', year: '2012', publisher: 'Image Comics' },
  { series: 'Batman', issue: '1', year: '2016', publisher: 'DC Comics' },
  { series: 'The Amazing Spider-Man', issue: '300', year: '1988', publisher: 'Marvel Comics' },
  { series: 'Invincible', issue: '1', year: '2003', publisher: 'Image Comics' },
];

async function createTestPage(text, width = 400, height = 600) {
  // Create a simple SVG page
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
        ${text}
      </text>
      <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="none" stroke="#333" stroke-width="2"/>
    </svg>
  `;
  return Buffer.from(svg);
}

async function createTestCBZ(comic) {
  const filename = `${comic.series} #${comic.issue} (${comic.year}).cbz`;
  const filepath = path.join(testDir, filename);
  
  console.log(`Creating ${filename}...`);
  
  const output = fs.createWriteStream(filepath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✓ Created ${filename} (${archive.pointer()} bytes)`);
      resolve(filepath);
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add test pages
    for (let i = 1; i <= 5; i++) {
      const pageText = `${comic.series} #${comic.issue}\nPage ${i}\n${comic.publisher} (${comic.year})`;
      const pageBuffer = await createTestPage(pageText);
      archive.append(pageBuffer, { name: `page${i.toString().padStart(2, '0')}.svg` });
    }
    
    archive.finalize();
  });
}

async function createAllTestFiles() {
  console.log('Creating test comic files...\n');
  
  try {
    for (const comic of testComics) {
      await createTestCBZ(comic);
    }
    
    console.log(`\n✅ Created ${testComics.length} test CBZ files in ${testDir}`);
    console.log('\nTo test:');
    console.log('1. Run: npm run electron');
    console.log('2. Use File → Add Folder and select the test-comics folder');
    console.log('3. Or use the testing panel in development mode');
    
  } catch (error) {
    console.error('Error creating test files:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createAllTestFiles();
}

module.exports = { createAllTestFiles, createTestCBZ };