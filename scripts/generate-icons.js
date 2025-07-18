const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Icon sizes for PWA
const iconSizes = [
  16, 32, 48, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024
];

// iOS splash screen sizes
const splashScreens = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' },
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' },
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' },
  { width: 1668, height: 2224, name: 'splash-1668x2224.png' },
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' },
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
  
  // Generate a simple llama icon as base
  const baseCanvas = createCanvas(1024, 1024);
  const ctx = baseCanvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Draw a simple llama shape
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  
  // Llama body (simplified)
  ctx.ellipse(512, 600, 250, 200, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Llama neck
  ctx.beginPath();
  ctx.ellipse(512, 400, 100, 150, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Llama head
  ctx.beginPath();
  ctx.ellipse(512, 280, 80, 100, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Llama ears
  ctx.beginPath();
  ctx.moveTo(462, 230);
  ctx.lineTo(452, 180);
  ctx.lineTo(482, 200);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(562, 230);
  ctx.lineTo(572, 180);
  ctx.lineTo(542, 200);
  ctx.closePath();
  ctx.fill();
  
  // Llama legs (simplified)
  for (let i = 0; i < 4; i++) {
    const x = 362 + (i * 100);
    ctx.fillRect(x, 700, 40, 150);
  }
  
  // Add some wool texture
  ctx.fillStyle = '#F0F0F0';
  for (let i = 0; i < 20; i++) {
    const x = 300 + Math.random() * 424;
    const y = 450 + Math.random() * 300;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add text
  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LLAMA', 512, 900);
  ctx.font = 'bold 80px Arial';
  ctx.fillText('WOOL FARM', 512, 980);
  
  // Save base icon
  const baseIconPath = path.join(iconsDir, 'icon-base.png');
  const buffer = baseCanvas.toBuffer('image/png');
  fs.writeFileSync(baseIconPath, buffer);
  console.log('✅ Base icon generated');
  
  // Generate all icon sizes
  for (const size of iconSizes) {
    const iconCanvas = createCanvas(size, size);
    const iconCtx = iconCanvas.getContext('2d');
    
    // Scale and draw the base icon
    iconCtx.drawImage(baseCanvas, 0, 0, size, size);
    
    // Save icon
    const iconPath = path.join(iconsDir, `icon-${size}.png`);
    const iconBuffer = iconCanvas.toBuffer('image/png');
    fs.writeFileSync(iconPath, iconBuffer);
    
    // Also save Apple-specific icons
    if ([57, 60, 72, 76, 114, 120, 144, 152, 180].includes(size)) {
      const appleIconPath = path.join(iconsDir, `apple-icon-${size}x${size}.png`);
      fs.writeFileSync(appleIconPath, iconBuffer);
    }
  }
  
  console.log(`✅ Generated ${iconSizes.length} icon sizes`);
  
  // Generate favicon
  const faviconSizes = [16, 32];
  for (const size of faviconSizes) {
    const faviconCanvas = createCanvas(size, size);
    const faviconCtx = faviconCanvas.getContext('2d');
    faviconCtx.drawImage(baseCanvas, 0, 0, size, size);
    
    const faviconPath = path.join(iconsDir, `favicon-${size}x${size}.png`);
    const faviconBuffer = faviconCanvas.toBuffer('image/png');
    fs.writeFileSync(faviconPath, faviconBuffer);
  }
  
  console.log('✅ Favicons generated');
  
  // Generate splash screens
  for (const splash of splashScreens) {
    const splashCanvas = createCanvas(splash.width, splash.height);
    const splashCtx = splashCanvas.getContext('2d');
    
    // Background gradient
    const gradient = splashCtx.createLinearGradient(0, 0, splash.width, splash.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8E8');
    splashCtx.fillStyle = gradient;
    splashCtx.fillRect(0, 0, splash.width, splash.height);
    
    // Draw centered icon
    const iconSize = Math.min(splash.width, splash.height) * 0.3;
    const iconX = (splash.width - iconSize) / 2;
    const iconY = (splash.height - iconSize) / 2 - 50;
    
    splashCtx.drawImage(baseCanvas, iconX, iconY, iconSize, iconSize);
    
    // Add loading text
    splashCtx.fillStyle = '#2C3E50';
    splashCtx.font = `bold ${iconSize * 0.1}px Arial`;
    splashCtx.textAlign = 'center';
    splashCtx.fillText('Loading...', splash.width / 2, iconY + iconSize + 50);
    
    // Save splash screen
    const splashPath = path.join(splashDir, splash.name);
    const splashBuffer = splashCanvas.toBuffer('image/png');
    fs.writeFileSync(splashPath, splashBuffer);
  }
  
  console.log(`✅ Generated ${splashScreens.length} splash screens`);
  
  // Generate OG and Twitter images
  const socialCanvas = createCanvas(1200, 630);
  const socialCtx = socialCanvas.getContext('2d');
  
  // Background
  const socialGradient = socialCtx.createLinearGradient(0, 0, 1200, 630);
  socialGradient.addColorStop(0, '#87CEEB');
  socialGradient.addColorStop(1, '#98D8E8');
  socialCtx.fillStyle = socialGradient;
  socialCtx.fillRect(0, 0, 1200, 630);
  
  // Draw icon
  socialCtx.drawImage(baseCanvas, 100, 115, 400, 400);
  
  // Add text
  socialCtx.fillStyle = '#2C3E50';
  socialCtx.font = 'bold 80px Arial';
  socialCtx.textAlign = 'left';
  socialCtx.fillText('Llama Wool Farm', 550, 250);
  
  socialCtx.font = '40px Arial';
  socialCtx.fillText('Build your wool empire!', 550, 320);
  
  socialCtx.font = '30px Arial';
  socialCtx.fillStyle = '#555';
  socialCtx.fillText('🎮 Idle Clicker Game', 550, 380);
  socialCtx.fillText('🦙 Manage Your Llama Farm', 550, 420);
  socialCtx.fillText('💰 Produce Premium Wool', 550, 460);
  
  // Save social images
  const ogImagePath = path.join(iconsDir, 'og-image.png');
  const twitterImagePath = path.join(iconsDir, 'twitter-image.png');
  const socialBuffer = socialCanvas.toBuffer('image/png');
  fs.writeFileSync(ogImagePath, socialBuffer);
  fs.writeFileSync(twitterImagePath, socialBuffer);
  
  console.log('✅ Social media images generated');
  console.log('🎉 All icons generated successfully!');
}

// Run the generator
generateIcons().catch(console.error);