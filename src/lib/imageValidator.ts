export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const MIN_DIMENSION_PX = 64;
export const MAX_DIMENSION_PX = 4096;

export interface ValidationOutput {
  isValid: boolean;
  sha256: string;
  fileSize: number;
  imageFormat: string;
  width?: number;
  height?: number;
  failureReason?: string;
  imageElement?: HTMLImageElement;
}

export async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function validateImageFile(file: File): Promise<ValidationOutput> {
  const fileSize = file.size;
  const originalFilename = file.name || 'upload';
  const ext = originalFilename.slice(originalFilename.lastIndexOf('.')).toLowerCase();

  // 1. Read array buffer for exact byte hashing
  const arrayBuffer = await file.arrayBuffer();
  const sha256 = await computeSha256(arrayBuffer);

  // 2. Check file size
  if (fileSize === 0) {
    return {
      isValid: false,
      sha256,
      fileSize: 0,
      imageFormat: '',
      failureReason: 'Empty file uploaded (0 bytes).',
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const sizeMiB = (fileSize / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      sha256,
      fileSize,
      imageFormat: '',
      failureReason: `File size (${sizeMiB} MiB) exceeds the 5.00 MiB maximum limit.`,
    };
  }

  // 3. Check allowed extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      sha256,
      fileSize,
      imageFormat: 'UNKNOWN',
      failureReason: `Unsupported file extension '${ext}'. Allowed extensions are .jpg, .jpeg, and .png.`,
    };
  }

  // 4. Magic bytes inspection
  const bytes = new Uint8Array(arrayBuffer);
  let detectedFormat = '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detectedFormat = 'JPEG';
  } else if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    detectedFormat = 'PNG';
  }

  if (!detectedFormat) {
    return {
      isValid: false,
      sha256,
      fileSize,
      imageFormat: 'UNKNOWN',
      failureReason: `File '${originalFilename}' is not a valid decoded image (corrupted header or non-image content).`,
    };
  }

  // Extension/format mismatch check
  if ((ext === '.png' && detectedFormat !== 'PNG') || ((ext === '.jpg' || ext === '.jpeg') && detectedFormat !== 'JPEG')) {
    return {
      isValid: false,
      sha256,
      fileSize,
      imageFormat: detectedFormat,
      failureReason: `Extension/format mismatch: file extension '${ext}' does not match detected header ${detectedFormat}.`,
    };
  }

  // 5. Full pixel decoding via browser Image element
  return new Promise((resolve) => {
    const blob = new Blob([arrayBuffer], { type: file.type || (detectedFormat === 'PNG' ? 'image/png' : 'image/jpeg') });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          sha256,
          fileSize,
          imageFormat: detectedFormat,
          width,
          height,
          failureReason: `Image dimensions (${width}×${height} px) are smaller than the minimum required ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX} px.`,
        });
        return;
      }

      if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          sha256,
          fileSize,
          imageFormat: detectedFormat,
          width,
          height,
          failureReason: `Image dimensions (${width}×${height} px) exceed the maximum allowed ${MAX_DIMENSION_PX}×${MAX_DIMENSION_PX} px.`,
        });
        return;
      }

      resolve({
        isValid: true,
        sha256,
        fileSize,
        imageFormat: detectedFormat,
        width,
        height,
        imageElement: img,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        sha256,
        fileSize,
        imageFormat: detectedFormat,
        failureReason: `Corrupt or truncated pixel stream: image cannot be decoded.`,
      });
    };

    img.src = url;
  });
}
