/**
 * Hand Image Processor - Makes hand image background transparent
 * Converts PNG with white/light background to transparent background
 */

export function processHandImage(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64); // Fallback to original
          return;
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Remove white/light backgrounds by making them transparent
        // Threshold for what counts as "background" (white-ish pixels)
        const threshold = 240;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // If pixel is light (white-ish), make it transparent
          // Check if it's a light color (high R, G, B values)
          if (r > threshold && g > threshold && b > threshold && a > 200) {
            // Make transparent
            data[i + 3] = 0;
          }
          // For semi-transparent pixels near edges, reduce opacity more
          else if (r > 220 && g > 220 && b > 220 && a > 100) {
            data[i + 3] = Math.floor(a * 0.4);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert back to base64
        const transparentBase64 = canvas.toDataURL('image/png');
        resolve(transparentBase64);
      } catch (error) {
        console.error('Error processing hand image:', error);
        resolve(base64); // Fallback
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load hand image'));
    };
  });
}

/**
 * Enhanced hand image processor with better edge detection
 * Uses color distance to determine background
 */
export function processHandImageAdvanced(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Target white color (background)
        const targetR = 255, targetG = 255, targetB = 255;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Calculate color distance to white
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
          );
          
          // If very close to white, make transparent
          if (distance < 50 && a > 150) {
            data[i + 3] = 0;
          }
          // Gradient transparency for semi-white pixels
          else if (distance < 100 && a > 100) {
            const alpha = Math.max(0, a - Math.floor((100 - distance) * 1.5));
            data[i + 3] = alpha;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const result = canvas.toDataURL('image/png');
        resolve(result);
      } catch (error) {
        console.error('Error in advanced hand image processing:', error);
        resolve(base64);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load hand image'));
    };
  });
}
