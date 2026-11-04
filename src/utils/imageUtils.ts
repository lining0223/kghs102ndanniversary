/**
 * 圖片網址標準化處理工具
 * 自動將 Google Drive 分享連結或 Dropbox 連結轉換為可以直接在網頁 <img> 標籤中載入的高清直連網址
 */
import { getGoogleDriveFileId, isPdfFlyer } from './boothUtils';

export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // 若為 Base64 Data URL 或一般本地路徑，直接返回
  if (trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  // 若已判定為 PDF 連結，不轉換為 lh3 圖片網址，保留原始或分享網址
  if (isPdfFlyer(trimmed)) {
    return trimmed;
  }

  // 1. Google Drive 分享連結轉換為圖片直連
  const driveId = getGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // 2. Dropbox 連結轉換 (?dl=0 -> ?raw=1)
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

export * from './boothUtils';
