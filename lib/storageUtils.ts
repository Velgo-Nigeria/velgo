import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';
import { logErrorToSupabase } from './errorLogger';

interface UploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

/**
 * Converts a Blob or File to a base64 Data URL
 */
function fileToDataUrl(blob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image to Supabase Storage with aggressive client-side compression,
 * automatic bucket failover (e.g. avatars -> task-images -> verifications),
 * instant Data URL fallback if storage buckets have RLS blocks, and silent admin error logging.
 *
 * @param file The original File object from the file input
 * @param primaryBucket The target bucket (e.g. 'avatars', 'task-images', 'verifications')
 * @param pathPrefix Prefix for the generated file name (e.g. 'portfolio', 'avatar', 'task')
 * @param options Compression constraints (defaults to 0.1MB / 1000px max dimension)
 * @returns Object with publicUrl if successful, or error if failed.
 */
export async function uploadOptimizedImage(
  file: File,
  primaryBucket: 'avatars' | 'task-images' | 'verifications' = 'avatars',
  pathPrefix: string = 'img',
  options: UploadOptions = {}
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    // 1. Aggressive Compression (Target ~80KB max, 1000px dimension)
    const compressionOptions = {
      maxSizeMB: options.maxSizeMB || 0.1, // Target ~100KB
      maxWidthOrHeight: options.maxWidthOrHeight || 1000, // Crisp HD mobile resolution
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: options.quality || 0.7
    };

    let processedFile: File | Blob;
    try {
      processedFile = await imageCompression(file, compressionOptions);
    } catch (compressionErr) {
      console.warn('Image compression fallback to raw file:', compressionErr);
      processedFile = file; // Fallback if browser worker fails
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${pathPrefix}_${timestamp}_${randomSuffix}.jpg`;

    // 2. Candidate Buckets for resilience
    const allBuckets: ('avatars' | 'task-images' | 'verifications')[] = ['avatars', 'task-images', 'verifications'];
    // Put primary bucket first, then remaining buckets
    const candidateBuckets = [
      primaryBucket,
      ...allBuckets.filter(b => b !== primaryBucket)
    ];

    let lastError: any = null;
    let successfulBucket: string | null = null;

    for (const bucket of candidateBuckets) {
      try {
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(fileName, processedFile, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!uploadErr) {
          successfulBucket = bucket;
          break;
        } else {
          lastError = uploadErr;
          console.warn(`Upload to '${bucket}' bucket failed:`, uploadErr.message);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Exception uploading to '${bucket}':`, err);
      }
    }

    // If a bucket succeeded, retrieve its public URL
    if (successfulBucket) {
      const { data } = supabase.storage
        .from(successfulBucket)
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        return {
          publicUrl: data.publicUrl,
          error: null
        };
      }
    }

    // 3. Resilience Fallback: If all Supabase storage buckets rejected the upload (e.g. RLS storage policy restriction or missing bucket)
    // Silently log the exact error to Admin Dashboard's app_errors table
    const errorMessage = `Storage Bucket Upload Failure (${primaryBucket}): ${lastError?.message || 'Bucket not found or RLS policy blocked'}`;
    logErrorToSupabase(
      errorMessage,
      `StorageBucket:${primaryBucket}`,
      undefined,
      undefined,
      lastError
    );

    // Fallback to high-efficiency compressed Data URL so the user's action ALWAYS succeeds
    try {
      const dataUrl = await fileToDataUrl(processedFile);
      return {
        publicUrl: dataUrl,
        error: null
      };
    } catch (fallbackErr: any) {
      return {
        publicUrl: null,
        error: new Error('Failed to process image file.')
      };
    }
  } catch (globalErr: any) {
    console.error('Unhandled upload error:', globalErr);
    logErrorToSupabase(
      `Image Pipeline Exception: ${globalErr?.message || 'Unknown error'}`,
      'lib/storageUtils.ts',
      undefined,
      undefined,
      globalErr
    );

    // Final safety fallback to raw file data URL
    try {
      const dataUrl = await fileToDataUrl(file);
      return {
        publicUrl: dataUrl,
        error: null
      };
    } catch (e) {
      return {
        publicUrl: null,
        error: new Error('Failed to process image.')
      };
    }
  }
}
