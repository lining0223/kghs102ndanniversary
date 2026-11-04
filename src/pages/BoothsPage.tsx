import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BoothItem, getBoothCategories } from '../types';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { sortBoothsByClass, isPdfFlyer, getFlyerEmbedUrl, getFlyerViewUrl } from '../utils/imageUtils';

export const BoothsPage: React.FC = () => {
  const { data, boothMapImage, boothCategories, openImagePreview } = useApp();
  const { booths } = data;

  // 動態品項分類清單 (由管理者自訂編輯)
  const categories = ['全部', ...(boothCategories && boothCategories.length > 0 ? boothCategories : ['冷飲', '甜點', '鹹食', '遊戲/娛樂', '文創手作'])];

  // 分類查詢功能
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchTerm, setSearchTerm] = useState('');

  // 分類標籤滑動容器與參照
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const container = categoryContainerRef.current;
    const pill = categoryRefs.current[cat];
    if (container && pill) {
      const scrollOffset = (pill.offsetLeft + pill.offsetWidth / 2) - (container.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, scrollOffset), behavior: 'smooth' });
    }
  };

  // 各年級摺疊/展開狀態
  const [isGrade1Open, setIsGrade1Open] = useState(true);
  const [isGrade2Open, setIsGrade2Open] = useState(true);

  // 篩選邏輯 (支援多選品項分類匹配，並嚴格按照班級編號排序 101, 102, ... 201)
  const filterBoothsByGrade = (grade: '高一' | '高二') => {
    const filtered = booths.filter(b => {
      if (b.grade !== grade) return false;
      const cats = getBoothCategories(b);
      if (selectedCategory !== '全部' && !cats.includes(selectedCategory)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const classMatch = b.className.toLowerCase().includes(term);
        const catMatch = cats.some(c => c.toLowerCase().includes(term)) || (b.category && b.category.toLowerCase().includes(term));
        const descMatch = b.description?.toLowerCase().includes(term) ?? false;
        return classMatch || catMatch || descMatch;
      }
      return true;
    });

    return sortBoothsByClass(filtered);
  };

  const grade1Booths = filterBoothsByGrade('高一');
  const grade2Booths = filterBoothsByGrade('高二');

  return (
    <div className="space-y-0 animate-in fade-in duration-300 w-full pb-16">
      {/* 標題與視覺 (直角，和兩邊及上方無間隔) */}
      <PageHero
        title="各班攤位一覽"
        className="rounded-none m-0 border-x-0 border-t-0 border-b border-[#325291]/35 shadow-none"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-10">
        <section className="space-y-8 pt-2">
          {/* 園遊會攤位分布圖 (隨本身長寬比縮放，不可切割或變形，寬邊比照手機畫面寬邊，具適當間隔) */}
          {boothMapImage && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-[#09013d]">
                  園遊會攤位分布圖
                </span>
              </div>
              <div className="w-full overflow-hidden rounded-none border border-[#e5decb] bg-[#fbf3c9]/30 shadow-2xs">
                <img
                  src={boothMapImage}
                  alt="園遊會攤位分布圖"
                  className="w-full h-auto block select-none mx-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* 搜尋列與品項分類查詢功能 */}
          <div className="space-y-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#325291] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋班級（例：101、201）"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e5decb] rounded-full text-xs sm:text-sm text-[#09013d] placeholder-[#9c9387] focus:outline-none focus:border-[#325291] shadow-2xs transition-colors"
              />
            </div>

            {/* 分類按鈕 (支援平滑滑動與點擊自動居中) */}
            <div
              ref={categoryContainerRef}
              className="flex items-center gap-2 overflow-x-auto scroll-smooth overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1"
            >
              {categories.map(cat => (
                <button
                  key={cat}
                  ref={el => { categoryRefs.current[cat] = el; }}
                  onClick={() => handleSelectCategory(cat)}
                  className={`min-h-[36px] px-4.5 py-1.5 text-xs font-semibold whitespace-nowrap rounded-full transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#09013d] text-[#fbf3c9] shadow-xs scale-102 border border-[#325291]/50'
                      : 'bg-white border border-[#e5decb] text-[#325291] hover:text-[#09013d] hover:bg-[#fbf3c9] hover:border-[#edd995]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 高一年級攤位專區 (嚴格按照 101, 102, 103... 排序) */}
          <div className="bg-white rounded-3xl border border-[#e5decb] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => setIsGrade1Open(prev => !prev)}
              className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-[#fbf9f2]/70 transition-colors cursor-pointer border-b border-[#e5decb]/70"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#09013d]">
                  高一攤位專區
                </h3>
                <span className="text-xs text-[#73685e]">（共 {grade1Booths.length} 班）</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#fbf3c9] flex items-center justify-center text-[#09013d] shrink-0">
                {isGrade1Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isGrade1Open && (
              <div className="p-5 sm:p-7">
                {grade1Booths.length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm text-[#73685e]">
                    此分類下暫無高一攤位
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5decb] max-w-xl mx-auto">
                    {grade1Booths.map(booth => (
                      <BoothCard key={booth.id} booth={booth} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 高二年級攤位專區 (嚴格按照 201, 202, 203... 排序) */}
          <div className="bg-white rounded-3xl border border-[#e5decb] shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => setIsGrade2Open(prev => !prev)}
              className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-[#fbf9f2]/70 transition-colors cursor-pointer border-b border-[#e5decb]/70"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#09013d]">
                  高二攤位專區
                </h3>
                <span className="text-xs text-[#73685e]">（共 {grade2Booths.length} 班）</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#cff0eb] flex items-center justify-center text-[#09013d] shrink-0">
                {isGrade2Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isGrade2Open && (
              <div className="p-5 sm:p-7">
                {grade2Booths.length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm text-[#73685e]">
                    此分類下暫無高二攤位
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5decb] max-w-xl mx-auto">
                    {grade2Booths.map(booth => (
                      <BoothCard key={booth.id} booth={booth} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * 攤位卡片：支援圖片傳單與 PDF 傳單完整預覽與新分頁開啟
 */
interface BoothCardProps {
  booth: BoothItem;
}

const BoothCard: React.FC<BoothCardProps> = ({ booth }) => {
  const { openImagePreview } = useApp();
  const boothCats = getBoothCategories(booth);
  const isPdf = isPdfFlyer(booth.flyerUrl, booth.flyerType);
  const embedUrl = isPdf ? getFlyerEmbedUrl(booth.flyerUrl, 'pdf') : booth.flyerUrl;
  const viewUrl = getFlyerViewUrl(booth.flyerUrl);

  return (
    <article className="py-6 sm:py-8 first:pt-2 last:pb-2 space-y-4 w-full">
      {/* 班級與分類 (支援多選品項分類標籤) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base sm:text-lg text-[#09013d] tracking-tight">
            {booth.className} 班
          </span>
          {isPdf && (
            <span className="text-[10px] font-bold text-[#b33a2b] bg-[#fbeeed] px-2 py-0.5 rounded border border-[#f5c6cb] flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>PDF 傳單</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {boothCats.map(cat => (
            <span
              key={cat}
              className="text-xs font-semibold text-[#325291] bg-[#cff0eb]/70 px-2.5 py-0.5 rounded-full border border-[#bce4de]"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* 傳單顯示區：PDF 顯示嵌入式檢視器，圖片則直角點擊放大 */}
      {isPdf ? (
        <div className="w-full rounded-none border border-[#e5decb] bg-white shadow-2xs overflow-hidden space-y-0">
          {/* PDF 頂部工具列 */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#fbf9f2] border-b border-[#e5decb] text-xs">
            <div className="flex items-center gap-1.5 text-[#b33a2b] font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>{booth.className} 班宣傳單 (PDF)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  openImagePreview(
                    booth.flyerUrl,
                    `${booth.className} 班 園遊會傳單`,
                    `${booth.grade} · ${boothCats.join(' / ')}`,
                    true
                  );
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#09013d] bg-white border border-[#e5decb] hover:bg-[#fbf3c9] rounded-full flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="全螢幕放大預覽此 PDF"
              >
                <Maximize2 className="w-3 h-3 text-[#325291]" />
                <span className="hidden sm:inline">全螢幕檢視</span>
              </button>
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-[11px] font-semibold text-[#fbf3c9] bg-[#09013d] hover:bg-[#1a1254] rounded-full flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="在新分頁開啟或下載此 PDF"
              >
                <ExternalLink className="w-3 h-3 text-[#cff0eb]" />
                <span>在新分頁開啟</span>
              </a>
            </div>
          </div>

          {/* PDF 內嵌預覽視窗 (直角 rounded-none) */}
          <div className="w-full h-[420px] sm:h-[480px] bg-[#fbf9f2] relative">
            <iframe
              src={embedUrl}
              title={`${booth.className} 班傳單 PDF`}
              className="w-full h-full border-0 block bg-white"
            />
          </div>

          {/* PDF 底部說明與下載按鈕 */}
          <div className="px-3.5 py-2 bg-[#fbf9f2] border-t border-[#e5decb] flex items-center justify-between text-[11px] text-[#73685e]">
            <span>可在畫面上方捲動或縮放預覽</span>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#325291] hover:text-[#09013d] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>下載 PDF 原檔</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (booth.flyerUrl) {
              openImagePreview(
                booth.flyerUrl,
                `${booth.className} 班 園遊會傳單`,
                `${booth.grade} · ${boothCats.join(' / ')}`,
                false
              );
            }
          }}
          className="w-full overflow-hidden rounded-none border border-[#e5decb] bg-white shadow-2xs cursor-pointer group"
          title="點擊放大檢視傳單"
        >
          {booth.flyerUrl ? (
            <img
              src={booth.flyerUrl}
              alt={`${booth.className} 班傳單`}
              className="w-full h-auto block mx-auto select-none rounded-none transition-transform duration-200 group-hover:scale-[1.01]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="py-16 text-center text-[#73685e] text-xs flex flex-col items-center justify-center gap-1.5 rounded-none">
              <ImageIcon className="w-6 h-6 text-[#325291]/40" />
              <span>尚未發布傳單</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
