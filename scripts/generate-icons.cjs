const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    console.log('Generating icon.ico from icon.png...');
    
    const inputPath = path.join(__dirname, '../src-tauri/icons/icon.png');
    const outputPath = path.join(__dirname, '../src-tauri/icons/icon.ico');
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    
    // For now, copy PNG as ICO (temporary solution until we fix proper ICO generation)
    // This works for basic Tauri builds but should be replaced with proper multi-resolution ICO
    console.log('Using PNG copy as temporary ICO solution...');
    
    const pngBuffer = fs.readFileSync(inputPath);
    fs.writeFileSync(outputPath, pngBuffer);
    
    console.log('✅ Successfully generated icon.ico (temporary PNG copy)');
    console.log('📝 Note: This is a temporary fix. Proper ICO generation should be implemented later.');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();