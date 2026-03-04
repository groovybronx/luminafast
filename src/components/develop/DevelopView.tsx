// Type principal représentant une image du catalogue avec ses états d'édition
import type { CatalogImage } from '@/types';
import { useUiStore } from '@/stores/uiStore';
import PreviewRenderer from '../library/PreviewRenderer';
import { BeforeAfterComparison } from './BeforeAfterComparison';

// Props du composant DevelopView :
// - activeImg : image actuellement sélectionnée pour le développement
// - showBeforeAfter : affiche le comparatif avant/après
interface DevelopViewProps {
  activeImg: CatalogImage;
  showBeforeAfter: boolean;
}

export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => {
  // Récupérer l'état et les actions de comparaison depuis uiStore
  const comparisonMode = useUiStore((state) => state.comparisonMode);
  const setComparisonMode = useUiStore((state) => state.setComparisonMode);
  const splitViewPosition = useUiStore((state) => state.splitViewPosition);
  const setSplitViewPosition = useUiStore((state) => state.setSplitViewPosition);
  const overlayOpacity = useUiStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useUiStore((state) => state.setOverlayOpacity);

  return (
    <div className="h-full flex items-center justify-center bg-zinc-950">
      {showBeforeAfter ? (
        <BeforeAfterComparison
          imageId={activeImg.id}
          beforeUrl={activeImg.urls.standard}
          afterUrl={activeImg.urls.standard}
          mode={comparisonMode}
          onModeChange={setComparisonMode}
          splitPosition={splitViewPosition}
          onSplitPositionChange={setSplitViewPosition}
          opacity={overlayOpacity}
          onOpacityChange={setOverlayOpacity}
          editState={activeImg.state.edits}
        />
      ) : (
        <div className="flex w-full h-full items-center justify-center p-12">
          <PreviewRenderer
            imageId={activeImg.id}
            previewUrl={activeImg.urls.standard}
            className="w-full h-full object-contain img-render"
            isSelected={true}
            useWasm={true}
          />
        </div>
      )}
    </div>
  );
};
