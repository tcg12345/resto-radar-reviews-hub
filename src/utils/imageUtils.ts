/**
 * Utility functions for image processing and optimization
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.6,
  format: 'jpeg'
};

/**
 * Compress and resize an image file
 */
export const compressImage = async (
  file: File, 
  options: ImageCompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = opts.maxWidth;
          height = width / aspectRatio;
        } else {
          height = opts.maxHeight;
          width = height * aspectRatio;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed data URL
      const compressedDataUrl = canvas.toDataURL(
        `image/${opts.format}`, 
        opts.quality
      );
      
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Process multiple images in parallel with progress tracking
 */
export const processImagesInParallel = async (
  files: File[],
  options: ImageCompressionOptions = {},
  onProgress?: (processed: number, total: number) => void
): Promise<string[]> => {
  const total = files.length;
  let processed = 0;
  
  const processImage = async (file: File): Promise<string> => {
    try {
      const compressed = await compressImage(file, options);
      processed++;
      onProgress?.(processed, total);
      return compressed;
    } catch (error) {
      console.error('Error processing image:', error);
      processed++;
      onProgress?.(processed, total);
      throw error;
    }
  };
  
  // Process in smaller batches to avoid overwhelming the browser
  const batchSize = 2; // Reduced batch size for better performance
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(processImage);
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent UI blocking
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }
  }
  
  return results;
};

/**
 * Create a thumbnail for quick preview
 */
export const createThumbnail = async (file: File): Promise<string> => {
  return compressImage(file, {
    maxWidth: 120,
    maxHeight: 120,
    quality: 0.5,
    format: 'jpeg'
  });
};