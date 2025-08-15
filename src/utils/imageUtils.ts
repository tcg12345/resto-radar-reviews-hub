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
  
  // Process sequentially for large batches to prevent memory issues
  const results: string[] = [];
  
  if (files.length > 10) {
    // For large batches, process one at a time with delays
    for (const file of files) {
      try {
        const result = await processImage(file);
        results.push(result);
        
        // Add delay for large batches to prevent timeout
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    }
  } else {
    // For small batches, process in parallel
    const batchSize = 2;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(processImage);
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error('Error in batch processing:', error);
        throw error;
      }
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

// Image URL resolution helpers
const SUPABASE_PROJECT_REF = 'ocpmhsquwsdaauflbygf';
const EDGE_BASE = `https://${SUPABASE_PROJECT_REF}.functions.supabase.co`;

const extractGooglePhotoRef = (input: string): string | null => {
  try {
    // Direct Google Place Photo URL
    if (input.includes('maps.googleapis.com/maps/api/place/photo')) {
      const u = new URL(input);
      return (
        u.searchParams.get('photoreference') ||
        u.searchParams.get('photo_reference')
      );
    }
  } catch {}
  // Common stored reference patterns
  if (/^(gphoto:|google_photo_ref:|places_photo:)/.test(input)) {
    return input.split(':').pop() || null;
  }
  // Plain reference token (no slashes, long-ish)
  if (/^[A-Za-z0-9_-]{30,}$/.test(input) && !input.includes('/')) {
    return input;
  }
  return null;
};

const normalizeLocalUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/public/')) return url.replace(/^\/public\//, '/');
  if (url.startsWith('public/')) return '/' + url.replace(/^public\//, '');
  if (url.startsWith('/')) return url;
  return '/' + url.replace(/^\.\//, '');
};

const buildGooglePhotoProxyUrl = (
  ref: string,
  opts?: { width?: number; height?: number }
): string => {
  const url = new URL(`${EDGE_BASE}/google-photo-proxy`);
  url.searchParams.set('photoreference', ref);
  if (opts?.height) url.searchParams.set('maxheight', String(opts.height));
  else url.searchParams.set('maxwidth', String(opts?.width || 640));
  return url.toString();
};

export const resolveImageUrl = (
  input: string,
  opts?: { width?: number; height?: number }
): string => {
  if (!input) return '';
  const ref = extractGooglePhotoRef(input);
  if (ref) return buildGooglePhotoProxyUrl(ref, opts);
  return normalizeLocalUrl(input);
};

export const getLqipUrl = (input: string): string => {
  const ref = extractGooglePhotoRef(input);
  if (ref) return buildGooglePhotoProxyUrl(ref, { width: 64 });
  // For local/remote images, return the same URL (browser will downscale)
  return normalizeLocalUrl(input);
};