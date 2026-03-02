// Type principal représentant une image du catalogue avec ses états d'édition
import type { CatalogImage } from '../../types';
import PreviewRenderer from '../library/PreviewRenderer';

// Props du composant DevelopView :
// - activeImg : image actuellement sélectionnée pour le développement
// - showBeforeAfter : affiche le comparatif avant/après
interface DevelopViewProps {
  activeImg: CatalogImage;
  showBeforeAfter: boolean;
}
export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => (
  // Conteneur principal du module de développement
  <div className="h-full flex items-center justify-center p-12 bg-zinc-950">
    {/* Layout adaptatif : side-by-side si showBeforeAfter, sinon vertical */}
    <div className={`flex w-full h-full gap-6 ${showBeforeAfter ? 'flex-row' : 'flex-col'}`}>
      {/* Affichage "Avant" (image RAW, désaturée) */}
      {showBeforeAfter && (
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
          {/* PreviewRenderer pour image originale, effet RAW */}
          {(() => {
            if (import.meta.env.DEV) {
              console.warn(`PreviewRenderer applied for imageId=${activeImg.id} (Avant)`);
            }
            return null;
          })()}
          <PreviewRenderer
            imageId={activeImg.id}
            previewUrl={activeImg.url}
            className="w-full h-full object-contain grayscale opacity-30 scale-105"
            isSelected={false}
          />
          {/* Badge RAW en overlay */}
          <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest border border-zinc-700">
            Original RAW
          </div>
        </div>
      )}
      {/* Affichage "Après" (image modifiée avec filtres dynamiques) */}
      <div className="flex-1 shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-xl border border-zinc-800 relative flex items-center justify-center overflow-hidden bg-zinc-900 group">
        {/* PreviewRenderer pour image modifiée
        {(() => {
          if (import.meta.env.DEV) {
            console.warn(`PreviewRenderer applied for imageId=${activeImg.id} (Après)`);
          }
          return null;
        })()} */}
        <PreviewRenderer
          imageId={activeImg.id}
          previewUrl={activeImg.url}
          className="w-full h-full object-contain img-render"
          isSelected={true}
        />
        {/* Affichage du hash unique de l'image (pour traçabilité) */}
        <div className="absolute bottom-6 left-6 font-mono text-[9px] text-emerald-500 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 backdrop-blur-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
          CAS_HASH: {activeImg.hash}
        </div>
        {/* Badge "Aperçu Dynamique" pour indiquer l'image modifiée */}
        <div className="absolute top-4 right-4 text-[10px] bg-blue-600 text-white font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
          Aperçu Dynamique
        </div>
      </div>
    </div>
  </div>
);
