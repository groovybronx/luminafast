import type { CatalogImage } from '../../types';

interface DevelopViewProps {
  activeImg: CatalogImage;
  showBeforeAfter: boolean;
}

export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => (
  <div className="h-full flex items-center justify-center p-12 bg-zinc-950">
    <div className={`flex w-full h-full gap-6 ${showBeforeAfter ? 'flex-row' : 'flex-col'}`}>
      {showBeforeAfter && (
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
          <img
            src={activeImg.url}
            alt="Avant"
            className="w-full h-full object-contain grayscale opacity-30 scale-105"
          />
          <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest border border-zinc-700">
            Original RAW
          </div>
        </div>
      )}
      <div className="flex-1 shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-xl border border-zinc-800 relative flex items-center justify-center overflow-hidden bg-zinc-900 group">
        <img
          src={activeImg.url}
          alt="Après"
          className="w-full h-full object-contain img-render"
          style={{
            filter: `
              brightness(${100 + activeImg.state.edits.exposure * 2}%) 
              contrast(${100 + activeImg.state.edits.contrast}%)
              saturate(${100 + activeImg.state.edits.saturation + activeImg.state.edits.vibrance * 0.5}%)
              blur(${activeImg.state.edits.clarity < 0 ? Math.abs(activeImg.state.edits.clarity) / 10 : 0}px)
            `,
          }}
        />
        <div className="absolute bottom-6 left-6 font-mono text-[9px] text-emerald-500 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 backdrop-blur-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
          CAS_HASH: {activeImg.hash}
        </div>
        <div className="absolute top-4 right-4 text-[10px] bg-blue-600 text-white font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
          Aperçu Dynamique
        </div>
      </div>
    </div>
  </div>
);
