const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Icon sizes for PWA
const iconSizes = [
  16, 32, 48, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024
];

// iOS splash screen sizes
const splashScreens = [
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' },
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' },
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' },
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  // Create directories if they don't exist
  const iconsDir = path.join(__dirname, '../public/icons');
  const splashDir = path.join(__dirname, '../public/splash');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
  }

  // Create a simple SVG icon as a placeholder
  const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#87CEEB"/>
  <circle cx="256" cy="200" r="80" fill="#FFFFFF"/>
  <ellipse cx="256" cy="320" rx="120" ry="100" fill="#FFFFFF"/>
  <circle cx="220" cy="180" r="10" fill="#000000"/>
  <circle cx="292" cy="180" r="10" fill="#000000"/>
  <path d="M 236 200 Q 256 220 276 200" stroke="#000000" stroke-width="3" fill="none"/>
  <text x="256" y="420" font-family="Arial" font-size="60" text-anchor="middle" fill="#4A90E2">LLAMA</text>
</svg>
`;

  // Generate icons
  console.log('Generating PWA icons...');
  
  for (const size of iconSizes) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }

  // Also create specific named versions
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
    
  await sharp(Buffer.from(svgIcon))
    .resize(16, 16)
    .png()
    .toFile(path.join(iconsDir, 'icon-16x16.png'));
    
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'icon-32x32.png'));
    
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'icon-180x180.png'));
  
  // Create a favicon.ico
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .toFile(path.join(__dirname, '../public/favicon.ico'));

  console.log('Icons generated successfully!');

  // Generate splash screens for iOS
  console.log('Generating splash screens...');

  for (const splash of splashScreens) {
    const splashSvg = `
    <svg width="${splash.width}" height="${splash.height}" viewBox="0 0 ${splash.width} ${splash.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${splash.width}" height="${splash.height}" fill="#87CEEB"/>
      <circle cx="${splash.width/2}" cy="${splash.height/2 - 100}" r="150" fill="#FFFFFF"/>
      <ellipse cx="${splash.width/2}" cy="${splash.height/2 + 100}" rx="200" ry="180" fill="#FFFFFF"/>
      <circle cx="${splash.width/2 - 60}" cy="${splash.height/2 - 140}" r="20" fill="#000000"/>
      <circle cx="${splash.width/2 + 60}" cy="${splash.height/2 - 140}" r="20" fill="#000000"/>
      <path d="M ${splash.width/2 - 40} ${splash.height/2 - 80} Q ${splash.width/2} ${splash.height/2 - 40} ${splash.width/2 + 40} ${splash.height/2 - 80}" stroke="#000000" stroke-width="5" fill="none"/>
      <text x="${splash.width/2}" y="${splash.height/2 + 300}" font-family="Arial" font-size="120" text-anchor="middle" fill="#4A90E2">LLAMA WOOL FARM</text>
    </svg>
    `;

    await sharp(Buffer.from(splashSvg))
      .png()
      .toFile(path.join(splashDir, splash.name));
    console.log(`Created ${splash.name}`);
  }

  console.log('Splash screens generated successfully!');
}

// Run the generator
generateIcons().catch(console.error);