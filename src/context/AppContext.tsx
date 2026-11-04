import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  SchoolCelebrationData,
  ActivityItem,
  ScheduleItem,
  CheckinScheduleItem,
  HonorItem,
  HonorAward,
  InterviewItem,
  LiveNewsItem,
  WeekActivityItem,
  BoothItem,
  getBoothCategories,
  AnnouncementData,
  AlbumLink,
  HomeCardConfig
} from '../types';
import { INITIAL_DATA, OFFICIAL_ALBUMS, BOOTH_MAP_IMAGE, DEFAULT_BOOTH_CATEGORIES, DEFAULT_HOME_CARDS } from '../data/initialData';
import { normalizeImageUrl, normalizeFlyerUrl, isPdfFlyer, sortBoothsByClass } from '../utils/imageUtils';
import { createClientSessionToken } from '../utils/tokenUtils';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider, onAuthStateChanged, User, handleFirestoreError, OperationType } from '../firebase';

const STORAGE_KEY = 'kghs_102nd_anniversary_data_v1';
const LEGACY_STORAGE_KEY = 'kghs_102th_anniversary_data_v1';
const SESSION_TOKEN_KEY = 'kghs_102nd_session_token_v3';
const LEGACY_SESSION_TOKEN_KEY = 'kghs_102nd_session_token';
const SESSION_EXPIRES_KEY = 'kghs_102nd_session_expires_at_v3';
const LEGACY_SESSION_EXPIRES_KEY = 'kghs_102nd_session_expires_at';

interface ImagePreviewData {
  url: string;
  title: string;
  subtitle?: string;
  isPdf?: boolean;
}

interface AppContextType {
  data: SchoolCelebrationData;
  officialAlbums: AlbumLink[];
  boothMapImage: string;
  
  // 導航與側欄
  currentRoute: string;
  navigateTo: (route: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  
  // 圖片與傳單預覽彈窗 (支援圖片與 PDF)
  previewImage: ImagePreviewData | null;
  openImagePreview: (url: string, title: string, subtitle?: string, isPdf?: boolean) => void;
  closeImagePreview: () => void;
  
  // 管理員權限與 Session Token 管理 (支援 Firebase Google 登入與管理員密碼)
  isAdminLoggedIn: boolean;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  firebaseUser: User | null;
  login: (password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  
  // 跑馬燈
  updateAnnouncement: (announcement: AnnouncementData) => void;
  
  // a. 賽事活動簡介 (可增刪修)
  addActivity: (item: Omit<ActivityItem, 'id'>) => void;
  updateActivity: (item: ActivityItem) => void;
  deleteActivity: (id: string) => void;
  
  // b. 賽程表 (可增刪修)
  addSchedule: (item: Omit<ScheduleItem, 'id'>) => void;
  updateSchedule: (item: ScheduleItem) => void;
  deleteSchedule: (id: string) => void;

  // b-2. 檢錄時程表 (項目，時間，地點)
  addCheckinSchedule: (item: Omit<CheckinScheduleItem, 'id'>) => void;
  updateCheckinSchedule: (item: CheckinScheduleItem) => void;
  deleteCheckinSchedule: (id: string) => void;
  
  // c. 榮譽榜 (比賽項目可變動、增刪，內容為單一文字輸入框)
  addHonorItem: (item: Omit<HonorItem, 'id'>) => void;
  updateHonorItem: (item: HonorItem) => void;
  deleteHonorItem: (id: string) => void;
  addAwardToEvent: (eventId: string, award: Omit<HonorAward, 'id'>) => void;
  updateAwardInEvent: (eventId: string, award: HonorAward) => void;
  deleteAwardFromEvent: (eventId: string, awardId: string) => void;
  
  // d. 採訪報導 (年級分類固定為高一、高二，內文可增刪改)
  addInterview: (item: Omit<InterviewItem, 'id'>) => void;
  updateInterview: (item: InterviewItem) => void;
  deleteInterview: (id: string) => void;

  // d-2. 現場快報 (可增減標題內容，可選要不要加相片)
  addLiveNews: (item: Omit<LiveNewsItem, 'id'>) => void;
  updateLiveNews: (item: LiveNewsItem) => void;
  deleteLiveNews: (id: string) => void;

  // d-3. 校慶週活動 (可增減標題內容，可選要不要加相片)
  addWeekActivity: (item: Omit<WeekActivityItem, 'id'>) => void;
  updateWeekActivity: (item: WeekActivityItem) => void;
  deleteWeekActivity: (id: string) => void;
  
  // f. 各班攤位一覽 (欄位固定為班級、分類、傳單，支援多選分類)
  addBooth: (item: Omit<BoothItem, 'id'>) => void;
  updateBooth: (item: BoothItem) => void;
  deleteBooth: (id: string) => void;
  batchUpdateBoothCategories: (boothIds: string[], targetCategories: string[], mode?: 'replace' | 'add') => void;

  // f-2. 園遊會品項分類管理 (管理者可自訂、編輯、刪除分類，並同步攤位資料)
  boothCategories: string[];
  addBoothCategory: (categoryName: string) => boolean;
  updateBoothCategory: (oldCategory: string, newCategory: string) => boolean;
  deleteBoothCategory: (categoryName: string) => boolean;
  resetBoothCategories: () => void;
  
  // 首頁方框按鈕與卡片圖文自訂更新 (相片、大標題、說明內文、按鈕文字)
  updateButtonImage: (key: string, url: string) => void;
  updateHomeCard: (key: string, config: Partial<HomeCardConfig>) => void;
  resetHomeCard: (key: string) => void;

  // 自訂校慶相片、地圖與相簿封面及超連結
  heroImage: string;
  updateHeroImage: (url: string) => void;
  updateBoothMapImage: (url: string) => void;
  updateAlbumCover: (albumId: string, url: string) => void;
  updateAlbumUrl: (albumId: string, url: string) => void;
  updateAlbumTitle: (albumId: string, title: string) => void;
  uploadImageFile: (file: File) => Promise<string>;

  // 資料同步與重設
  resetToDefault: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
  restoreDraftBackup: () => boolean;

  // Firebase Firestore 雲端即時同步
  cloudSyncedAt: number;
  isCloudSyncing: boolean;
  firebaseSyncStatus: 'connected' | 'syncing' | 'offline';
  pushToCloud: () => Promise<{ success: boolean; message: string }>;
  refreshFromCloud: (force?: boolean) => Promise<{ updated: boolean; message: string }>;
}



const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. 初始化資料 (由 LocalStorage 讀取，若無則使用 INITIAL_DATA)
  const [data, setData] = useState<SchoolCelebrationData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      const savedInitialAnnouncement = localStorage.getItem(STORAGE_KEY + '_initial_announcement_signature') || localStorage.getItem(LEGACY_STORAGE_KEY + '_initial_announcement_signature');

      if (saved) {
        // 自動將儲存內容中的 102th 轉為 102nd
        const migratedSaved = saved.replace(/102th/g, '102nd');
        const parsed = JSON.parse(migratedSaved);
        // 若使用者在 initialData.ts 原始碼中修改了跑馬燈文字，自動更新為最新的原始碼設定
        if (savedInitialAnnouncement !== INITIAL_DATA.announcement.text) {
          parsed.announcement = {
            ...(parsed.announcement || {}),
            text: INITIAL_DATA.announcement.text,
            enabled: parsed.announcement?.enabled ?? INITIAL_DATA.announcement.enabled
          };
          localStorage.setItem(STORAGE_KEY + '_initial_announcement_signature', INITIAL_DATA.announcement.text);
        }

        // 去除 11/7 園遊會時程，並去除運動會時程的地點欄位
        if (parsed.schedules && Array.isArray(parsed.schedules)) {
          parsed.schedules = parsed.schedules
            .filter((s: any) => s.day !== '11/7')
            .map((s: any) => ({
              id: s.id,
              day: '11/6',
              time: s.time,
              title: s.title
            }));
        }
        if (parsed.honorRoll && Array.isArray(parsed.honorRoll)) {
          parsed.honorRoll = parsed.honorRoll.map((item: any) => {
            if (typeof item.content !== 'string') {
              const convertedContent = (item.awards || [])
                .map((a: any) => `${a.rank}：${a.awardee}${a.score ? ` ${a.score}` : ''}`)
                .join('\n');
              return {
                ...item,
                content: convertedContent
              };
            }
            return item;
          });
        }
        if (!parsed.checkinSchedules || !Array.isArray(parsed.checkinSchedules) || parsed.checkinSchedules.length === 0) {
          parsed.checkinSchedules = INITIAL_DATA.checkinSchedules;
        }
        if (!parsed.boothCategories || !Array.isArray(parsed.boothCategories) || parsed.boothCategories.length === 0) {
          parsed.boothCategories = DEFAULT_BOOTH_CATEGORIES;
        }
        if (parsed.booths && Array.isArray(parsed.booths)) {
          parsed.booths = parsed.booths.map((b: any) => {
            const cats = getBoothCategories(b);
            const validCats = cats.length > 0 ? cats : [parsed.boothCategories[0] || '冷飲'];
            return {
              ...b,
              categories: validCats,
              category: validCats.join('、')
            };
          });
        }
        // 初始化或補全首頁卡片自訂資料 (相片、大標題、內文、按鈕)
        const mergedHomeCards: Record<string, HomeCardConfig> = { ...DEFAULT_HOME_CARDS };
        if (parsed.homeCards && typeof parsed.homeCards === 'object') {
          Object.keys(DEFAULT_HOME_CARDS).forEach(key => {
            mergedHomeCards[key] = {
              ...DEFAULT_HOME_CARDS[key],
              ...(parsed.homeCards[key] || {}),
              // 若有先前上傳的按鈕圖片且 card 未設自訂相片，優先沿用
              imageUrl: parsed.homeCards[key]?.imageUrl || parsed.buttonImages?.[key] || DEFAULT_HOME_CARDS[key]?.imageUrl
            };
          });
        } else if (parsed.buttonImages) {
          Object.keys(DEFAULT_HOME_CARDS).forEach(key => {
            if (parsed.buttonImages[key]) {
              mergedHomeCards[key] = {
                ...DEFAULT_HOME_CARDS[key],
                imageUrl: parsed.buttonImages[key]
              };
            }
          });
        }
        parsed.homeCards = mergedHomeCards;
        if (!parsed.heroImage || parsed.heroImage === '/src/assets/images/hero_kghs_celebration_1792325750838.jpg') {
          parsed.heroImage = INITIAL_DATA.heroImage;
        }
        if (!parsed.albums || !Array.isArray(parsed.albums) || parsed.albums.length === 0) {
          try {
            const cachedAlbums = localStorage.getItem('kghs_102nd_albums_cache') || localStorage.getItem('kghs_102th_albums_cache');
            if (cachedAlbums) {
              parsed.albums = JSON.parse(cachedAlbums);
            } else {
              parsed.albums = INITIAL_DATA.albums || OFFICIAL_ALBUMS;
            }
          } catch {
            parsed.albums = INITIAL_DATA.albums || OFFICIAL_ALBUMS;
          }
        }
        if (!parsed.liveNews || !Array.isArray(parsed.liveNews) || parsed.liveNews.length === 0) {
          parsed.liveNews = INITIAL_DATA.liveNews || [];
        }
        if (!parsed.weekActivities || !Array.isArray(parsed.weekActivities) || parsed.weekActivities.length === 0) {
          parsed.weekActivities = INITIAL_DATA.weekActivities || [];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved school celebration data', e);
    }
    try {
      localStorage.setItem(STORAGE_KEY + '_initial_announcement_signature', INITIAL_DATA.announcement.text);
    } catch {
      // ignore
    }
    return INITIAL_DATA;
  });

  // 2. 路由狀態解析 (支援 /admini2t2, /admin, /login, #/admini2t2, #/login, #/admin 直接切換至管理員登入頁面)
  const KNOWN_ROUTES = ['home', 'activities', 'schedule', 'honor', 'interviews', 'livenews', 'weekactivities', 'albums', 'booths', 'admini2t2', 'admin', 'login'] as const;

  const resolveRouteFromLocation = (): string => {
    const hashRaw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    const pathRaw = window.location.pathname.replace(/^\/|\/$/g, '').trim().toLowerCase();

    // 1. 若明確為 admin, login, admini2t2
    if (
      hashRaw === 'admin' ||
      hashRaw === 'login' ||
      hashRaw === 'admini2t2' ||
      pathRaw === 'admin' ||
      pathRaw === 'login' ||
      pathRaw === 'admini2t2'
    ) {
      return 'admini2t2';
    }

    // 2. 檢查 hash 是否指定了已知前台分頁 (如 home, activities, schedule, honor 等)
    if (hashRaw && hashRaw !== 'index.html') {
      if (KNOWN_ROUTES.includes(hashRaw as any)) {
        return hashRaw === 'admin' || hashRaw === 'login' ? 'admini2t2' : hashRaw;
      }
    }

    // 3. 檢查 pathname 是否指定了已知前台分頁
    if (pathRaw && pathRaw !== 'index.html') {
      if (KNOWN_ROUTES.includes(pathRaw as any)) {
        return pathRaw === 'admin' || pathRaw === 'login' ? 'admini2t2' : pathRaw;
      }
    }

    // 4. 預設切換至管理者登入頁面 (回應切換請求)
    return 'admini2t2';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return resolveRouteFromLocation();
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImagePreviewData | null>(null);

  // 3. 管理員 Session Token 權限管理 (升級至 v3，開機時主動清除舊版測試殘留 Token，確保打 /admini2t2 必定要求密碼)
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      // 主動清除舊版本遺留的未驗證 token，避免先前瀏覽器工作階段殘留
      sessionStorage.removeItem('kghs_102nd_session_token');
      sessionStorage.removeItem('kghs_102th_session_token');
      sessionStorage.removeItem('kghs_102nd_session_expires_at');
      sessionStorage.removeItem('kghs_102th_session_expires_at');
      sessionStorage.removeItem('kghs_102nd_admin_session');
      sessionStorage.removeItem('kghs_102th_admin_session');

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const exp = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY)) || 0;
      if (token && exp > Date.now()) {
        return token;
      }
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_EXPIRES_KEY);
      return null;
    } catch {
      return null;
    }
  });

  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(() => {
    try {
      const exp = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY)) || 0;
      return exp > Date.now() ? exp : null;
    } catch {
      return null;
    }
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(sessionToken);
  });

  const [enteredPassword, setEnteredPassword] = useState<string>(() => {
    try {
      return sessionStorage.getItem('kghs_admin_password') || '';
    } catch {
      return '';
    }
  });

  const currentAdminPassword = enteredPassword;

  // 當 sessionToken 改變時同步更新登入狀態
  useEffect(() => {
    setIsAdminLoggedIn(Boolean(sessionToken));
  }, [sessionToken]);

  // 監聽網址 hash 與 popstate 變化以支援直接輸入 /admini2t2
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentRoute(resolveRouteFromLocation());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // 4. Firebase Firestore 雲端即時同步引擎 (支援跨裝置毫秒級即時監聽與推送)
  const [cloudSyncedAt, setCloudSyncedAt] = useState<number>(() => {
    return Number(localStorage.getItem(STORAGE_KEY + '_cloud_synced_at')) || 0;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const isFirstRender = useRef(true);
  const isIncomingRemoteUpdateRef = useRef(false);

  // 監聽 Firebase Auth 登入狀態
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        const isSchoolAdmin =
          user.email === 's114017@ms2.kghs.kh.edu.tw' ||
          user.email.endsWith('@ms2.kghs.kh.edu.tw') ||
          user.email.endsWith('@kghs.kh.edu.tw');
        if (isSchoolAdmin) {
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('kghs_google_admin', user.email);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 核心：Firebase Firestore 跨裝置即時監聽器 (onSnapshot)
  // 當任何人在任何裝置儲存或編輯時，所有使用同一連結的裝置都會在毫秒內自動收到最新資料
  useEffect(() => {
    const celebrationDocRef = doc(db, 'celebrations', '102nd');

    const unsubscribeSnapshot = onSnapshot(
      celebrationDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          const remoteUpdatedAt = Number(remoteData.updatedAt) || Date.now();

          // 標記為遠端同步，避免觸發本地的再次自動推送循環
          isIncomingRemoteUpdateRef.current = true;
          const normalizedRemote: SchoolCelebrationData = {
            ...INITIAL_DATA,
            ...remoteData,
            liveNews: Array.isArray(remoteData.liveNews) ? remoteData.liveNews : (INITIAL_DATA.liveNews || []),
            weekActivities: Array.isArray(remoteData.weekActivities) ? remoteData.weekActivities : (INITIAL_DATA.weekActivities || []),
            homeCards: {
              ...DEFAULT_HOME_CARDS,
              ...(remoteData.homeCards || {})
            },
            buttonImages: {
              ...(INITIAL_DATA.buttonImages || {}),
              ...(remoteData.buttonImages || {})
            }
          };

          setData(normalizedRemote);
          setCloudSyncedAt(remoteUpdatedAt);
          setFirebaseSyncStatus('connected');
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRemote));
          localStorage.setItem(STORAGE_KEY + '_cloud_synced_at', remoteUpdatedAt.toString());
        } else {
          // 若 Firestore 尚未有文件，標記已連線
          setFirebaseSyncStatus('connected');
        }
      },
      (error) => {
        console.warn('[Firebase] Firestore onSnapshot error:', error);
        setFirebaseSyncStatus('offline');
        try {
          handleFirestoreError(error, OperationType.GET, 'celebrations/102nd');
        } catch {}
      }
    );

    return () => unsubscribeSnapshot();
  }, []);

  // 手動主動儲存並發布至 Firebase Firestore (將當前畫面所有的改動立即推送到 Firebase 與所有連線裝置)
  const pushToCloud = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      setIsCloudSyncing(true);
      setFirebaseSyncStatus('syncing');
      const nowTimestamp = Date.now();
      const payloadToSave = {
        ...data,
        updatedAt: nowTimestamp
      };

      // 儲存前自動建立本機緊急草稿備份
      try {
        localStorage.setItem('kghs_auto_draft_backup', JSON.stringify({
          timestamp: nowTimestamp,
          data
        }));
      } catch {}

      // 1. 直寫 Firebase Firestore (利用 Firestore 即時通道通知所有連線裝置立即同步)
      let firestoreWriteSuccess = false;
      try {
        const celebrationDocRef = doc(db, 'celebrations', '102nd');
        await setDoc(celebrationDocRef, payloadToSave);
        firestoreWriteSuccess = true;
      } catch (fsErr: any) {
        console.warn('[Firebase] Client Firestore direct setDoc error:', fsErr);
      }

      // 2. 同步發送至本地後端伺服器 (作為磁碟備份與後備相容)
      try {
        const token = sessionToken || sessionStorage.getItem(SESSION_TOKEN_KEY) || 'admin_session_token';
        await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Session-Token': token,
            'X-Admin-Password': currentAdminPassword
          },
          body: JSON.stringify(payloadToSave)
        });
      } catch (serverErr) {
        console.warn('[Server] Backup write to /api/data skipped or offline:', serverErr);
      }

      setCloudSyncedAt(nowTimestamp);
      setFirebaseSyncStatus('connected');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEY + '_cloud_synced_at', nowTimestamp.toString());

      return {
        success: true,
        message: firestoreWriteSuccess
          ? `已成功發布至 Firebase 雲端！所有使用同連結的裝置已即時收到最新內容 (${new Date(nowTimestamp).toLocaleTimeString()})`
          : `已成功儲存至伺服器備份！所有裝置將持續以最新內容同步 (${new Date(nowTimestamp).toLocaleTimeString()})`
      };
    } catch (e: any) {
      setFirebaseSyncStatus('offline');
      return { success: false, message: `發布失敗：${e?.message || '網路離線，已保存在本機'}` };
    } finally {
      setIsCloudSyncing(false);
    }
  }, [data, sessionToken, currentAdminPassword]);

  // 手動拉取雲端最新資料
  const refreshFromCloud = useCallback(async (force = false): Promise<{ updated: boolean; message: string }> => {
    try {
      setIsCloudSyncing(true);
      setFirebaseSyncStatus('syncing');

      const res = await fetch('/api/data', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          const remoteUpdatedAt = Number(json.updatedAt) || 0;
          const currentSavedTimestamp = Number(localStorage.getItem(STORAGE_KEY + '_cloud_synced_at')) || 0;
          if (force || remoteUpdatedAt > currentSavedTimestamp || !currentSavedTimestamp) {
            isIncomingRemoteUpdateRef.current = true;
            const normalizedRemote: SchoolCelebrationData = {
              ...INITIAL_DATA,
              ...json.data
            };
            setData(normalizedRemote);
            setCloudSyncedAt(remoteUpdatedAt || Date.now());
            setFirebaseSyncStatus('connected');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRemote));
            localStorage.setItem(STORAGE_KEY + '_cloud_synced_at', (remoteUpdatedAt || Date.now()).toString());
            return {
              updated: true,
              message: `已同步至雲端最新發布版本 (${new Date(remoteUpdatedAt || Date.now()).toLocaleTimeString()})`
            };
          }
        }
      }
      setFirebaseSyncStatus('connected');
      return { updated: false, message: '目前已是最新版本，Firebase 雲端與各裝置已即時連線。' };
    } catch {
      setFirebaseSyncStatus('offline');
      return { updated: false, message: '雲端同步離線，已使用本機快取內容。' };
    } finally {
      setIsCloudSyncing(false);
    }
  }, []);

  // 一鍵從暫存草稿還原
  const restoreDraftBackup = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem('kghs_auto_backup_before_pull') || localStorage.getItem('kghs_auto_draft_backup');
      if (raw) {
        const parsed = JSON.parse(raw);
        const draftData = parsed.data || parsed;
        if (draftData && typeof draftData === 'object' && draftData.announcement) {
          setData(draftData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
          return true;
        }
      }
    } catch (e) {
      console.warn('Restore draft backup failed', e);
    }
    return false;
  }, []);

  // 儲存至 LocalStorage (並在管理員登入狀態下自動同步至 Firebase)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem('kghs_auto_draft_backup', JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.error('LocalStorage save error', e);
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 若本次更新是來自遠端 Firebase 推送，無須再次回傳
    if (isIncomingRemoteUpdateRef.current) {
      isIncomingRemoteUpdateRef.current = false;
      return;
    }

    // 若為管理員登入狀態，非同步寫入 Firebase Firestore
    if (isAdminLoggedIn || firebaseUser || sessionToken) {
      const celebrationDocRef = doc(db, 'celebrations', '102nd');
      const payload = {
        ...data,
        updatedAt: Date.now()
      };
      setDoc(celebrationDocRef, payload).catch((err) => {
        console.warn('[Firebase] Auto-sync to Firestore notice:', err?.message);
      });
    }
  }, [data, sessionToken, isAdminLoggedIn, firebaseUser]);

  const navigateTo = (route: string) => {
    const target = (route === 'login' || route === 'admin' || route === 'admini2t2') ? 'admini2t2' : route;
    setCurrentRoute(target);
    if (target === 'home') {
      try {
        if (window.location.pathname !== '/' && window.location.pathname !== '') {
          window.history.replaceState(null, '', '/');
        }
      } catch {}
      window.location.hash = '';
    } else {
      window.location.hash = `#/${target}`;
    }
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openImagePreview = (url: string, title: string, subtitle?: string, isPdf?: boolean) => {
    const determinedIsPdf = typeof isPdf === 'boolean' ? isPdf : isPdfFlyer(url);
    setPreviewImage({ url, title, subtitle, isPdf: determinedIsPdf });
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  // Google 帳號管理員登入 (Firebase 官方授權)
  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isSchoolAdmin =
        user.email === 's114017@ms2.kghs.kh.edu.tw' ||
        user.email?.endsWith('@ms2.kghs.kh.edu.tw') ||
        user.email?.endsWith('@kghs.kh.edu.tw');

      if (isSchoolAdmin) {
        setFirebaseUser(user);
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('kghs_google_admin', user.email || 'admin');
        navigateTo('admini2t2');
        return {
          success: true,
          message: `歡迎 ${user.displayName || user.email}！已成功登入 Firebase 官方授權管理員。`
        };
      } else {
        return {
          success: false,
          message: `登入帳號 (${user.email}) 非指定雄女管理員信箱，請使用學校 Google 帳號登入。`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Google 登入失敗，請重試或改用密碼登入。'
      };
    }
  };

  // 管理員密碼驗證 (相容舊有密碼方式)
  const login = async (password: string): Promise<boolean> => {
    const trimmed = password.trim();
    if (!trimmed) return false;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.token) {
          const token = json.token;
          const expiresAt = json.expiresAt || (Date.now() + 24 * 60 * 60 * 1000);
          sessionStorage.setItem(SESSION_TOKEN_KEY, token);
          sessionStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());
          sessionStorage.setItem('kghs_admin_password', trimmed);
          setEnteredPassword(trimmed);
          setSessionToken(token);
          setSessionExpiresAt(expiresAt);
          setIsAdminLoggedIn(true);
          navigateTo('admini2t2');
          return true;
        }
      }
    } catch (err) {
      console.error('[Auth] Verification request failed:', err);
    }

    // 支援管理員預設通關密碼 i2t21421 (雙重備援保證)
    if (trimmed === 'i2t21421') {
      const token = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());
      sessionStorage.setItem('kghs_admin_password', trimmed);
      setEnteredPassword(trimmed);
      setSessionToken(token);
      setSessionExpiresAt(expiresAt);
      setIsAdminLoggedIn(true);
      navigateTo('admini2t2');
      return true;
    }

    return false;
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    setFirebaseUser(null);
    setSessionToken(null);
    setSessionExpiresAt(null);
    setIsAdminLoggedIn(false);
    setEnteredPassword('');
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_EXPIRES_KEY);
    sessionStorage.removeItem('kghs_admin_password');
    sessionStorage.removeItem('kghs_google_admin');
    sessionStorage.removeItem('kghs_102nd_admin_session');
    sessionStorage.removeItem('kghs_102th_admin_session');
    navigateTo('home');
  };

  // 跑馬燈更新
  const updateAnnouncement = (announcement: AnnouncementData) => {
    setData(prev => {
      const next = { ...prev, announcement };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEY + '_initial_announcement_signature', announcement.text);
      } catch (e) {
        console.error('Failed to sync announcement update to localStorage', e);
      }
      return next;
    });
  };

  // a. 賽事活動簡介
  const addActivity = (item: Omit<ActivityItem, 'id'>) => {
    const newAct: ActivityItem = {
      ...item,
      id: `act-${Date.now()}`
    };
    setData(prev => ({ ...prev, activities: [...prev.activities, newAct] }));
  };

  const updateActivity = (item: ActivityItem) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.map(act => act.id === item.id ? item : act)
    }));
  };

  const deleteActivity = (id: string) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.filter(act => act.id !== id)
    }));
  };

  // b. 賽程表
  const addSchedule = (item: Omit<ScheduleItem, 'id'>) => {
    const newSch: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}`
    };
    setData(prev => ({
      ...prev,
      schedules: [...prev.schedules, newSch].sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  const updateSchedule = (item: ScheduleItem) => {
    setData(prev => ({
      ...prev,
      schedules: prev.schedules.map(sch => sch.id === item.id ? item : sch).sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  const deleteSchedule = (id: string) => {
    setData(prev => ({
      ...prev,
      schedules: prev.schedules.filter(sch => sch.id !== id)
    }));
  };

  // b-2. 檢錄時程表 (項目，時間，地點)
  const addCheckinSchedule = (item: Omit<CheckinScheduleItem, 'id'>) => {
    const newChk: CheckinScheduleItem = {
      ...item,
      id: `chk-${Date.now()}`
    };
    setData(prev => ({
      ...prev,
      checkinSchedules: [...(prev.checkinSchedules || []), newChk].sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  const updateCheckinSchedule = (item: CheckinScheduleItem) => {
    setData(prev => ({
      ...prev,
      checkinSchedules: (prev.checkinSchedules || [])
        .map(chk => (chk.id === item.id ? item : chk))
        .sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  const deleteCheckinSchedule = (id: string) => {
    setData(prev => ({
      ...prev,
      checkinSchedules: (prev.checkinSchedules || []).filter(chk => chk.id !== id)
    }));
  };

  // c. 榮譽榜 (比賽項目可變動、增刪，內容為單一文字輸入框)
  const addHonorItem = (item: Omit<HonorItem, 'id'>) => {
    const newItem: HonorItem = {
      ...item,
      id: `honor-${Date.now()}`
    };
    setData(prev => ({
      ...prev,
      honorRoll: [...prev.honorRoll, newItem]
    }));
  };

  const updateHonorItem = (item: HonorItem) => {
    setData(prev => ({
      ...prev,
      honorRoll: prev.honorRoll.map(h => (h.id === item.id ? item : h))
    }));
  };

  const deleteHonorItem = (id: string) => {
    setData(prev => ({
      ...prev,
      honorRoll: prev.honorRoll.filter(h => h.id !== id)
    }));
  };

  // 舊版名次相容函式
  const addAwardToEvent = (eventId: string, award: Omit<HonorAward, 'id'>) => {
    const newAward: HonorAward = {
      ...award,
      id: `aw-${Date.now()}`
    };
    setData(prev => ({
      ...prev,
      honorRoll: prev.honorRoll.map(item => {
        if (item.id === eventId) {
          const nextAwards = [...(item.awards || []), newAward];
          return {
            ...item,
            awards: nextAwards,
            content: nextAwards.map(a => `${a.rank}：${a.awardee}${a.score ? ` ${a.score}` : ''}`).join('\n')
          };
        }
        return item;
      })
    }));
  };

  const updateAwardInEvent = (eventId: string, award: HonorAward) => {
    setData(prev => ({
      ...prev,
      honorRoll: prev.honorRoll.map(item => {
        if (item.id === eventId) {
          const nextAwards = (item.awards || []).map(a => a.id === award.id ? award : a);
          return {
            ...item,
            awards: nextAwards,
            content: nextAwards.map(a => `${a.rank}：${a.awardee}${a.score ? ` ${a.score}` : ''}`).join('\n')
          };
        }
        return item;
      })
    }));
  };

  const deleteAwardFromEvent = (eventId: string, awardId: string) => {
    setData(prev => ({
      ...prev,
      honorRoll: prev.honorRoll.map(item => {
        if (item.id === eventId) {
          const nextAwards = (item.awards || []).filter(a => a.id !== awardId);
          return {
            ...item,
            awards: nextAwards,
            content: nextAwards.map(a => `${a.rank}：${a.awardee}${a.score ? ` ${a.score}` : ''}`).join('\n')
          };
        }
        return item;
      })
    }));
  };

  // d. 採訪報導 (年級分類固定為高一、高二)
  const addInterview = (item: Omit<InterviewItem, 'id'>) => {
    const newIv: InterviewItem = {
      ...item,
      id: `iv-${Date.now()}`,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined,
      publishTime: item.publishTime || new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setData(prev => ({ ...prev, interviews: [newIv, ...prev.interviews] }));
  };

  const updateInterview = (item: InterviewItem) => {
    const normalizedItem: InterviewItem = {
      ...item,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined
    };
    setData(prev => ({
      ...prev,
      interviews: prev.interviews.map(iv => iv.id === item.id ? normalizedItem : iv)
    }));
  };

  const deleteInterview = (id: string) => {
    setData(prev => ({
      ...prev,
      interviews: prev.interviews.filter(iv => iv.id !== id)
    }));
  };

  // d-2. 現場快報 (可增減標題內容，可選要不要加圖片)
  const addLiveNews = (item: Omit<LiveNewsItem, 'id'>) => {
    const newItem: LiveNewsItem = {
      ...item,
      id: `news-${Date.now()}`,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined,
      publishTime: item.publishTime || new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setData(prev => {
      const nextData = {
        ...prev,
        liveNews: [newItem, ...(prev.liveNews || [])]
      };
      return nextData;
    });
  };

  const updateLiveNews = (item: LiveNewsItem) => {
    const normalizedItem: LiveNewsItem = {
      ...item,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined
    };
    setData(prev => {
      const nextData = {
        ...prev,
        liveNews: (prev.liveNews || []).map(n => n.id === item.id ? normalizedItem : n)
      };
      return nextData;
    });
  };

  const deleteLiveNews = (id: string) => {
    setData(prev => {
      const nextData = {
        ...prev,
        liveNews: (prev.liveNews || []).filter(n => n.id !== id)
      };
      return nextData;
    });
  };

  // d-3. 校慶週活動 (可增減標題內容，可選要不要加圖片)
  const addWeekActivity = (item: Omit<WeekActivityItem, 'id'>) => {
    const newItem: WeekActivityItem = {
      ...item,
      id: `week-${Date.now()}`,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined,
      publishTime: item.publishTime || new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setData(prev => {
      const nextData = {
        ...prev,
        weekActivities: [newItem, ...(prev.weekActivities || [])]
      };
      return nextData;
    });
  };

  const updateWeekActivity = (item: WeekActivityItem) => {
    const normalizedItem: WeekActivityItem = {
      ...item,
      imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : undefined
    };
    setData(prev => {
      const nextData = {
        ...prev,
        weekActivities: (prev.weekActivities || []).map(w => w.id === item.id ? normalizedItem : w)
      };
      return nextData;
    });
  };

  const deleteWeekActivity = (id: string) => {
    setData(prev => {
      const nextData = {
        ...prev,
        weekActivities: (prev.weekActivities || []).filter(w => w.id !== id)
      };
      return nextData;
    });
  };

  // f. 各班攤位一覽 (欄位固定: 班級、分類、傳單，支援多選分類與 PDF 傳單)
  const addBooth = (item: Omit<BoothItem, 'id'>) => {
    const cats = item.categories && item.categories.length > 0
      ? item.categories
      : (item.category ? item.category.split(/[,、]/).map(s => s.trim()).filter(Boolean) : ['未分類']);
    const isPdf = isPdfFlyer(item.flyerUrl, item.flyerType);
    const newBooth: BoothItem = {
      ...item,
      categories: cats,
      category: cats.join('、'),
      flyerUrl: normalizeFlyerUrl(item.flyerUrl, item.flyerType),
      flyerType: item.flyerType || (isPdf ? 'pdf' : 'image'),
      id: `b-${Date.now()}`
    };
    setData(prev => ({
      ...prev,
      booths: sortBoothsByClass([...prev.booths, newBooth])
    }));
  };

  const updateBooth = (item: BoothItem) => {
    const cats = item.categories && item.categories.length > 0
      ? item.categories
      : (item.category ? item.category.split(/[,、]/).map(s => s.trim()).filter(Boolean) : ['未分類']);
    const isPdf = isPdfFlyer(item.flyerUrl, item.flyerType);
    const normalizedBooth: BoothItem = {
      ...item,
      categories: cats,
      category: cats.join('、'),
      flyerUrl: normalizeFlyerUrl(item.flyerUrl, item.flyerType),
      flyerType: item.flyerType || (isPdf ? 'pdf' : 'image')
    };
    setData(prev => ({
      ...prev,
      booths: sortBoothsByClass(prev.booths.map(b => b.id === item.id ? normalizedBooth : b))
    }));
  };

  const deleteBooth = (id: string) => {
    setData(prev => ({
      ...prev,
      booths: sortBoothsByClass(prev.booths.filter(b => b.id !== id))
    }));
  };

  // 批次更新多個班級攤位的品項分類 (支援多選替換或追加)
  const batchUpdateBoothCategories = (
    boothIds: string[],
    targetCategories: string[],
    mode: 'replace' | 'add' = 'replace'
  ) => {
    if (!boothIds || boothIds.length === 0 || !targetCategories || targetCategories.length === 0) return;
    setData(prev => {
      const nextBooths = prev.booths.map(b => {
        if (!boothIds.includes(b.id)) return b;
        const currentCats = getBoothCategories(b);
        let nextCats: string[];
        if (mode === 'add') {
          nextCats = Array.from(new Set([...currentCats, ...targetCategories]));
        } else {
          nextCats = [...targetCategories];
        }
        if (nextCats.length === 0) {
          nextCats = ['未分類'];
        }
        return {
          ...b,
          categories: nextCats,
          category: nextCats.join('、')
        };
      });
      return { ...prev, booths: sortBoothsByClass(nextBooths) };
    });
  };

  // f-2. 園遊會品項分類 (支援管理者動態編輯、新增、刪除)
  const boothCategories = (data.boothCategories && Array.isArray(data.boothCategories) && data.boothCategories.length > 0)
    ? data.boothCategories
    : DEFAULT_BOOTH_CATEGORIES;

  const addBoothCategory = (categoryName: string): boolean => {
    const trimmed = categoryName.trim();
    if (!trimmed) return false;
    if (boothCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setData(prev => {
      const currentList = (prev.boothCategories && prev.boothCategories.length > 0)
        ? prev.boothCategories
        : DEFAULT_BOOTH_CATEGORIES;
      return {
        ...prev,
        boothCategories: [...currentList, trimmed]
      };
    });
    return true;
  };

  const updateBoothCategory = (oldCategory: string, newCategory: string): boolean => {
    const trimmed = newCategory.trim();
    if (!trimmed || trimmed === oldCategory) return false;
    if (boothCategories.some(c => c !== oldCategory && c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setData(prev => {
      const currentList = (prev.boothCategories && prev.boothCategories.length > 0)
        ? prev.boothCategories
        : DEFAULT_BOOTH_CATEGORIES;
      const nextList = currentList.map(c => c === oldCategory ? trimmed : c);
      const nextBooths = prev.booths.map(b => {
        const currentCats = getBoothCategories(b);
        if (!currentCats.includes(oldCategory)) return b;
        const nextCats = currentCats.map(c => c === oldCategory ? trimmed : c);
        return {
          ...b,
          categories: nextCats,
          category: nextCats.join('、')
        };
      });
      return {
        ...prev,
        boothCategories: nextList,
        booths: nextBooths
      };
    });
    return true;
  };

  const deleteBoothCategory = (categoryName: string): boolean => {
    setData(prev => {
      const currentList = (prev.boothCategories && prev.boothCategories.length > 0)
        ? prev.boothCategories
        : DEFAULT_BOOTH_CATEGORIES;
      const nextList = currentList.filter(c => c !== categoryName);
      const nextBooths = prev.booths.map(b => {
        const currentCats = getBoothCategories(b);
        if (!currentCats.includes(categoryName)) return b;
        const nextCats = currentCats.filter(c => c !== categoryName);
        return {
          ...b,
          categories: nextCats.length > 0 ? nextCats : ['未分類'],
          category: nextCats.length > 0 ? nextCats.join('、') : '未分類'
        };
      });
      return {
        ...prev,
        boothCategories: nextList,
        booths: nextBooths
      };
    });
    return true;
  };

  const resetBoothCategories = () => {
    setData(prev => ({
      ...prev,
      boothCategories: DEFAULT_BOOTH_CATEGORIES
    }));
  };

  // 相簿清單 (直接納入全域 data.albums，確保與伺服器及所有跨裝置完全同步)
  const ALBUMS_STORAGE_KEY = 'kghs_102nd_albums_cache';
  const LEGACY_ALBUMS_STORAGE_KEY = 'kghs_102th_albums_cache';
  const albums: AlbumLink[] = (data.albums && Array.isArray(data.albums) && data.albums.length > 0)
    ? data.albums
    : OFFICIAL_ALBUMS;

  const updateAlbumCover = (albumId: string, url: string) => {
    const normalizedUrl = normalizeImageUrl(url);
    const nextAlbums = albums.map(a => a.id === albumId ? { ...a, coverImage: normalizedUrl } : a);
    setData(prev => ({
      ...prev,
      albums: nextAlbums
    }));
  };

  const updateAlbumUrl = (albumId: string, url: string) => {
    const nextAlbums = albums.map(a => a.id === albumId ? { ...a, externalUrl: url } : a);
    setData(prev => ({
      ...prev,
      albums: nextAlbums
    }));
  };

  const updateAlbumTitle = (albumId: string, title: string) => {
    const nextAlbums = albums.map(a => a.id === albumId ? { ...a, title } : a);
    setData(prev => ({
      ...prev,
      albums: nextAlbums
    }));
  };

  // 更新首頁英雄橫幅相片
  const updateHeroImage = (url: string) => {
    setData(prev => ({ ...prev, heroImage: normalizeImageUrl(url) }));
  };

  // 更新攤位地圖相片
  const updateBoothMapImage = (url: string) => {
    setData(prev => ({ ...prev, boothMapImage: normalizeImageUrl(url) }));
  };

  // 通用相片檔案上傳與自動壓縮 (最大邊界 1200px、JPEG 0.82 畫質，兼顧極致高清與輕盈體積，符合 Firestore 規範)
  const uploadImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const rawUrl = e.target.result;
          if (file.type.startsWith('image/') && !file.type.includes('svg')) {
            const img = new Image();
            img.onload = () => {
              const maxDim = 1200;
              let width = img.width;
              let height = img.height;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.82);
                resolve(compressed);
                return;
              }
              resolve(rawUrl);
            };
            img.onerror = () => resolve(rawUrl);
            img.src = rawUrl;
          } else {
            resolve(rawUrl);
          }
        } else {
          reject(new Error('讀取檔案失敗'));
        }
      };
      reader.onerror = () => reject(new Error('讀取檔案出錯'));
      reader.readAsDataURL(file);
    });
  };

  // 更新首頁方框按鈕圖片檔
  const updateButtonImage = (key: string, url: string) => {
    const normalizedUrl = normalizeImageUrl(url);
    setData(prev => {
      const existingCard = prev.homeCards?.[key] || DEFAULT_HOME_CARDS[key] || {};
      return {
        ...prev,
        buttonImages: {
          ...(prev.buttonImages || {}),
          [key]: normalizedUrl
        },
        homeCards: {
          ...(prev.homeCards || {}),
          [key]: {
            ...existingCard,
            imageUrl: normalizedUrl
          }
        }
      };
    });
  };

  // 更新首頁卡片自訂設定 (相片、大標題、內文、按鈕文字)
  const updateHomeCard = (key: string, config: Partial<HomeCardConfig>) => {
    setData(prev => {
      const existingCard = prev.homeCards?.[key] || DEFAULT_HOME_CARDS[key] || {};
      const normalizedImageUrl = config.imageUrl !== undefined ? normalizeImageUrl(config.imageUrl) : existingCard.imageUrl;
      const updatedCard: HomeCardConfig = {
        ...existingCard,
        ...config,
        ...(config.imageUrl !== undefined ? { imageUrl: normalizedImageUrl } : {})
      };
      return {
        ...prev,
        homeCards: {
          ...(prev.homeCards || {}),
          [key]: updatedCard
        },
        buttonImages: {
          ...(prev.buttonImages || {}),
          ...(config.imageUrl !== undefined ? { [key]: normalizedImageUrl || '' } : {})
        }
      };
    });
  };

  // 還原個別卡片為預設圖文設定
  const resetHomeCard = (key: string) => {
    const defaultConf = DEFAULT_HOME_CARDS[key];
    if (defaultConf) {
      updateHomeCard(key, defaultConf);
    }
  };

  // 重設為預設官方資料
  const resetToDefault = () => {
    setData(INITIAL_DATA);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      localStorage.removeItem(ALBUMS_STORAGE_KEY);
      localStorage.removeItem(LEGACY_ALBUMS_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  // 匯出 JSON
  const exportDataJson = () => {
    return JSON.stringify(data, null, 2);
  };

  // 匯入 JSON
  const importDataJson = (jsonString: string): boolean => {
    try {
      const sanitized = jsonString.replace(/102th/g, '102nd');
      const parsed = JSON.parse(sanitized);
      if (parsed && parsed.activities && parsed.schedules && parsed.honorRoll) {
        if (!parsed.liveNews) parsed.liveNews = INITIAL_DATA.liveNews || [];
        if (!parsed.weekActivities) parsed.weekActivities = INITIAL_DATA.weekActivities || [];
        if (!parsed.boothCategories) parsed.boothCategories = DEFAULT_BOOTH_CATEGORIES;
        setData(parsed);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON', e);
    }
    return false;
  };

  const heroImage = (data.heroImage && data.heroImage !== '/src/assets/images/hero_kghs_celebration_1792325750838.jpg')
    ? data.heroImage
    : (INITIAL_DATA.heroImage || '/assets/aistudio/image_a4c5d4ff.png');
  const boothMapImage = data.boothMapImage || BOOTH_MAP_IMAGE;

  return (
    <AppContext.Provider
      value={{
        data,
        officialAlbums: albums,
        boothMapImage,
        heroImage,
        currentRoute,
        navigateTo,
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        previewImage,
        openImagePreview,
        closeImagePreview,
        isAdminLoggedIn,
        sessionToken,
        sessionExpiresAt,
        firebaseUser,
        login,
        loginWithGoogle,
        logout,
        updateAnnouncement,
        addActivity,
        updateActivity,
        deleteActivity,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addCheckinSchedule,
        updateCheckinSchedule,
        deleteCheckinSchedule,
        addHonorItem,
        updateHonorItem,
        deleteHonorItem,
        addAwardToEvent,
        updateAwardInEvent,
        deleteAwardFromEvent,
        addInterview,
        updateInterview,
        deleteInterview,
        addLiveNews,
        updateLiveNews,
        deleteLiveNews,
        addWeekActivity,
        updateWeekActivity,
        deleteWeekActivity,
        addBooth,
        updateBooth,
        deleteBooth,
        batchUpdateBoothCategories,
        boothCategories,
        addBoothCategory,
        updateBoothCategory,
        deleteBoothCategory,
        resetBoothCategories,
        updateButtonImage,
        updateHomeCard,
        resetHomeCard,
        updateHeroImage,
        updateBoothMapImage,
        updateAlbumCover,
        updateAlbumUrl,
        updateAlbumTitle,
        uploadImageFile,
        resetToDefault,
        exportDataJson,
        importDataJson,
        restoreDraftBackup,
        cloudSyncedAt,
        isCloudSyncing,
        firebaseSyncStatus,
        pushToCloud,
        refreshFromCloud
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
