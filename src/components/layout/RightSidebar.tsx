import { Histogram } from '../metadata/Histogram';
import { ExifGrid } from '../metadata/ExifGrid';
import { DevelopSliders } from '../develop/DevelopSliders';
import { HistoryPanel } from '../develop/HistoryPanel';
import { MetadataPanel } from '../metadata/MetadataPanel';
import { useExif } from '../../hooks/useExif';
import type { CatalogImage, ActiveView, FlagType, EditState, ExifData } from '../../types';

interface RightSidebarProps {
  activeView: ActiveView;
  activeImg: CatalogImage;
  onDispatchEvent: (
    eventType: string,
    payload: number | string | FlagType | Partial<EditState>,
  ) => void;
}

/** Construit la ligne de résumé EXIF affichée sous l'histogramme */
function buildExifSummary(exif: ExifData | null): string | undefined {
  const parts: string[] = [];
  if (exif?.iso != null) parts.push(`ISO ${exif.iso}`);
  if (exif?.focalLength != null) parts.push(`${Math.round(exif.focalLength)}mm`);
  if (exif?.aperture != null) parts.push(`f/${exif.aperture.toFixed(1)}`);
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

export const RightSidebar = ({ activeView, activeImg, onDispatchEvent }: RightSidebarProps) => {
  const { exif: fullExif } = useExif(activeImg.id);
  // Priorité : EXIF complet depuis Tauri > données partielles du catalogue
  const displayExif = fullExif ?? activeImg.exif;
  const exifSummary = buildExifSummary(fullExif);
  const previewUrl = activeImg.urls?.thumbnail ?? activeImg.urls?.standard;

  return (
    <div className="w-80 bg-zinc-900 border-l border-black flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      {/* PANEL: HISTOGRAM & EXIF */}
      <div className="p-5 border-b border-black bg-zinc-950 shrink-0 space-y-4">
        <Histogram previewUrl={previewUrl} exifSummary={exifSummary} />
        <ExifGrid exif={displayExif} />
      </div>

      <div className="flex-1 pb-10">
        {activeView === 'develop' ? (
          <div className="p-5 space-y-10 animate-in fade-in duration-500">
            <DevelopSliders activeImg={activeImg} onDispatchEvent={onDispatchEvent} />
            <HistoryPanel selectedImageId={activeImg.id} />
          </div>
        ) : (
          <MetadataPanel activeImg={activeImg} onDispatchEvent={onDispatchEvent} />
        )}
      </div>
    </div>
  );
};
