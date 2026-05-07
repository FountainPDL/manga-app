import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ==================== SCREENSHOT UTILS ====================

export async function captureScreenshot(elementId = null) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const element = elementId 
      ? document.getElementById(elementId)
      : document.documentElement;
    
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: null,
    });
    
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Screenshot error:', err);
    return null;
  }
}

export async function captureExtendedScreenshot(containerId) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const element = document.getElementById(containerId);
    if (!element) return null;

    // Temporarily expand to full scroll height
    const originalOverflow = element.style.overflow;
    element.style.overflow = 'visible';

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      height: element.scrollHeight,
      windowHeight: element.scrollHeight,
      backgroundColor: '#000000',
    });

    element.style.overflow = originalOverflow;
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Extended screenshot error:', err);
    return null;
  }
}

export async function saveImageToDevice(dataUrl, filename = 'manga-page.png') {
  try {
    const base64Data = dataUrl.split(',')[1];
    
    await Filesystem.writeFile({
      path: `ComiFountain/${filename}`,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    return { success: true, path: `ComiFountain/${filename}` };
  } catch (err) {
    console.error('Save image error:', err);
    // Fallback: trigger browser download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return { success: true, path: filename };
  }
}

export async function shareImage(dataUrl, title = 'Manga Page') {
  try {
    const filename = `manga-${Date.now()}.png`;
    const result = await saveImageToDevice(dataUrl, filename);
    
    await Share.share({
      title,
      url: result.path,
      dialogTitle: 'Share manga page',
    });
    
    return true;
  } catch (err) {
    console.error('Share error:', err);
    return false;
  }
}

export async function downloadMangaPage(imageUrl, mangaTitle, chapterTitle, pageNum) {
  try {
    // Fetch image as blob
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const filename = `${sanitizeFilename(mangaTitle)}/${sanitizeFilename(chapterTitle)}/page-${String(pageNum).padStart(3, '0')}.jpg`;
        
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });
          resolve({ success: true, path: filename });
        } catch {
          resolve({ success: false });
        }
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').substr(0, 50);
}

// ==================== DOWNLOAD CHAPTER ====================
export async function downloadChapter(chapter, pages, mangaTitle, quality = 'high', onProgress) {
  const results = [];
  let completed = 0;

  // Quality settings
  const qualityMap = { low: 0.5, medium: 0.75, high: 1.0 };
  const q = qualityMap[quality] || 1.0;

  for (const page of pages) {
    try {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(page.url)}`);
      const blob = await response.blob();
      
      // Compress if needed
      const finalBlob = q < 1.0 ? await compressImage(blob, q) : blob;
      
      const reader = new FileReader();
      const base64 = await new Promise((res) => {
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(finalBlob);
      });

      const filename = `ComiFountain/${sanitizeFilename(mangaTitle)}/${sanitizeFilename(chapter.title)}/page-${String(page.index + 1).padStart(3, '0')}.jpg`;

      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      results.push({ page: page.index, path: filename, success: true });
    } catch {
      results.push({ page: page.index, success: false });
    }

    completed++;
    onProgress?.(completed / pages.length);
  }

  return results;
}

async function compressImage(blob, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((compressed) => {
        URL.revokeObjectURL(url);
        resolve(compressed || blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}
