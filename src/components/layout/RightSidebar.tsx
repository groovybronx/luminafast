import { Histogram } from '../metadata/Histogram';
import { ExifGrid } from '../metadata/ExifGrid';
import { DevelopSliders } from '../develop/DevelopSliders';
import { HistoryPanel } from '../develop/HistoryPanel';
import { MetadataPanel } from '../metadata/MetadataPanel';
import type { CatalogImage, ActiveView, FlagType, EditState } from '../../types';
import type { MockEvent } from '../../lib/mockData';

interface RightSidebarProps {
  activeView: ActiveView;
  activeImg: CatalogImage;
  eventLog: MockEvent[];
  onDispatchEvent: (eventType: string, payload: number | string | FlagType | Partial<EditState>) => void;
}

export const RightSidebar = ({ activeView, activeImg, eventLog, onDispatchEvent }: RightSidebarProps) => (
  <div className="w-80 bg-zinc-900 border-l border-black flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
    
    {/* PANEL: HISTOGRAM & EXIF */}
    <div className="p-5 border-b border-black bg-zinc-950 shrink-0 space-y-4">
      <Histogram />
      <ExifGrid exif={activeImg.exif} />
    </div>

    <div className="flex-1 pb-10">
      {activeView === 'develop' ? (
        <div className="p-5 space-y-10 animate-in fade-in duration-500">
          <DevelopSliders activeImg={activeImg} onDispatchEvent={onDispatchEvent} />
          <HistoryPanel eventLog={eventLog} />
        </div>
      ) : (
        <MetadataPanel activeImg={activeImg} onDispatchEvent={onDispatchEvent} />
      )}
    </div>
  </div>
);
