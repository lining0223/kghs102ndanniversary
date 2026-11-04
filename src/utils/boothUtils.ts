/**
 * 班級排序與攤位傳單（圖片 / PDF）輔助工具函式
 */

/**
 * 提取班級編號以進行數值排序
 * 支援 "101", "102", "110", "201", "204", "高一101", "101班" 等形式
 */
export function parseClassNumber(className: string | undefined | null): number {
  if (!className) return 999999;
  const match = className.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? 999999 : num;
  }
  return 999999;
}

/**
 * 班級名稱比較函式，嚴格按照 101, 102, ... 201 升冪排列
 */
export function compareClassNames(a: string | undefined | null, b: string | undefined | null): number {
  const numA = parseClassNumber(a);
  const numB = parseClassNumber(b);
  if (numA !== numB) {
    return numA - numB;
  }
  return (a || '').localeCompare(b || '', 'zh-Hant', { numeric: true });
}

/**
 * 將攤位陣列嚴格按照班級編號排序 (101, 102, ... 201)
 */
export function sortBoothsByClass<T extends { className: string }>(booths: T[]): T[] {
  if (!Array.isArray(booths)) return [];
  return [...booths].sort((a, b) => compareClassNames(a.className, b.className));
}

/**
 * 提取 Google Drive 檔案 ID
 */
export function getGoogleDriveFileId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // 形式 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const matchFile = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) return matchFile[1];

  // 形式 2: https://drive.google.com/open?id={FILE_ID} 或 id= 參數
  const matchId = trimmed.match(/(?:drive|docs)\.google\.com\/(?:uc\?export=(?:view|download)&id=|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  return null;
}

/**
 * 判定是否為 PDF 檔案或 PDF 連結
 * 包含：
 * - Base64: data:application/pdf
 * - 結尾或參數含 .pdf
 * - 顯式指定 explicitType === 'pdf'
 */
export function isPdfFlyer(url: string | undefined | null, explicitType?: 'image' | 'pdf'): boolean {
  if (explicitType === 'pdf') return true;
  if (explicitType === 'image') return false;
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:application/pdf')) return true;
  if (/\.pdf($|[?#])/i.test(trimmed)) return true;
  if (trimmed.includes('format=pdf') || trimmed.includes('type=pdf') || trimmed.includes('/pdf')) return true;

  // Google Drive 預覽網址若包含 pdf
  if (trimmed.includes('drive.google.com') && trimmed.includes('pdf')) return true;

  return false;
}

/**
 * 取得傳單的嵌入網址 (供 iframe 預覽或 img 載入)
 */
export function getFlyerEmbedUrl(url: string | undefined | null, explicitType?: 'image' | 'pdf'): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // 若為 Base64 Data URL 或本地相對路徑
  if (trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  const driveId = getGoogleDriveFileId(trimmed);
  const isPdf = isPdfFlyer(trimmed, explicitType);

  if (driveId) {
    if (isPdf) {
      // Google Drive PDF 官方預覽嵌入網址
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }
    // Google Drive 圖片高清直連
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // Dropbox 連結轉換 (?dl=0 -> ?raw=1)
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

/**
 * 取得傳單在外部新分頁開啟或下載的原始網址
 */
export function getFlyerViewUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  const driveId = getGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
  }

  // Dropbox
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

/**
 * 標準化傳單網址儲存格式
 */
export function normalizeFlyerUrl(url: string | undefined | null, explicitType?: 'image' | 'pdf'): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  const driveId = getGoogleDriveFileId(trimmed);
  const isPdf = isPdfFlyer(trimmed, explicitType);

  if (driveId) {
    if (isPdf) {
      // 保持或轉成標準 Google Drive 分享網址，顯示時動態透過 getFlyerEmbedUrl 取得 preview
      return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
    }
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}
