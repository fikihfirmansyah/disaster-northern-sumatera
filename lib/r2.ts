// R2 Storage helpers for Cloudflare
// Note: In Cloudflare Pages/Workers, R2 is available via env.R2_STORAGE

export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options?: R2PutOptions): Promise<R2Object>;
  get(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

export interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  body: ReadableStream;
}

export interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export async function uploadImageToR2(
  r2: R2Bucket,
  imageUrl: string,
  key: string
): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Upload to R2
    await r2.put(key, imageBuffer, {
      httpMetadata: {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Return the R2 public URL (you'll need to configure this in Cloudflare)
    return `https://your-r2-domain.com/${key}`;
  } catch (error) {
    console.error('Error uploading image to R2:', error);
    throw error;
  }
}

export function generateR2Key(postUrl: string): string {
  // Extract post ID from URL
  const match = postUrl.match(/\/p\/([^\/]+)/);
  const postId = match ? match[1] : Date.now().toString();
  return `instagram-posts/${postId}.jpg`;
}

