const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');

async function processLogos() {
  const inputPath = 'frontend/public/brand/optrip-logo.png';
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  
  // Buffer for transparent light logo (navy text, transparent bg)
  const lightBuffer = Buffer.from(data);
  // Buffer for transparent dark logo (white text, vibrant blue O, gold plane, transparent bg)
  const darkBuffer = Buffer.from(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate brightness / distance from pure white (255, 255, 255)
    // Anti-aliased alpha calculation
    const brightness = (r + g + b) / 3;
    
    if (brightness > 248 && Math.min(r, g, b) > 242) {
      // 100% transparent background
      lightBuffer[i + 3] = 0;
      darkBuffer[i + 3] = 0;
    } else if (brightness > 230 && Math.min(r, g, b) > 220) {
      // Smooth alpha transition edge for anti-aliasing
      const alpha = Math.max(0, Math.min(255, Math.round((255 - brightness) / 25 * 255)));
      lightBuffer[i + 3] = alpha;
      darkBuffer[i + 3] = alpha;
    }
    
    // For darkBuffer: if it's text (Navy or gray subtext), convert to crisp white
    if (darkBuffer[i + 3] > 0) {
      // Check if pixel is part of the golden airplane or 'I' dot
      const isGold = (r > 170 && g > 130 && b < 100);
      // Check if pixel is part of the blue 'O' arc
      const isBlue = (b > 110 && b > r + 30);
      
      if (!isGold && !isBlue) {
        // It's part of the text ('P T R I P' or the subtitle 'Travel Operations Platform...')
        // Preserve original alpha and convert RGB to pure white / light silver
        darkBuffer[i] = 255;
        darkBuffer[i + 1] = 255;
        darkBuffer[i + 2] = 255;
        
        // If it was a faint subtext pixel (originally gray, brightness > 80), soften the white slightly
        if (brightness > 80 && brightness < 220) {
          darkBuffer[i + 3] = Math.round(darkBuffer[i + 3] * 0.85);
        }
      } else if (isBlue) {
        // Boost blue saturation slightly for dark backgrounds so it shines brilliantly
        darkBuffer[i] = Math.min(255, Math.round(r * 1.1 + 10));
        darkBuffer[i + 1] = Math.min(255, Math.round(g * 1.1 + 25));
        darkBuffer[i + 2] = Math.min(255, Math.round(b * 1.15 + 20));
      }
    }
  }
  
  // Save light transparent logo
  await sharp(lightBuffer, { raw: { width, height, channels: 4 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('frontend/public/brand/optrip-logo-transparent.png');
    
  // Save dark transparent logo (white text)
  await sharp(darkBuffer, { raw: { width, height, channels: 4 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('frontend/public/brand/optrip-logo-dark.png');
    
  console.log('Successfully generated transparent light & dark brand logos!');
}

processLogos().catch(console.error);
