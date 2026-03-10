import { X } from 'lucide-react';

type FlagFilter = 'pick' | 'reject' | null;

interface QuickFiltersProps {
  ratingFilter: number | null;
  flagFilter: FlagFilter;
  onSetRatingFilter: (rating: number | null) => void;
  onSetFlagFilter: (flag: FlagFilter) => void;
  onReset: () => void;
}

export function QuickFilters({
  ratingFilter,
  flagFilter,
  onSetRatingFilter,
  onSetFlagFilter,
  onReset,
}: QuickFiltersProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-2">
        Filtres
        {(ratingFilter !== null || flagFilter !== null) && (
          <button
            onClick={onReset}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Réinitialiser les filtres"
            aria-label="Réinitialiser les filtres"
          >
            <X size={9} />
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 px-2 py-1">
          <span className="text-[9px] text-zinc-700 w-8 shrink-0 font-mono uppercase">Note</span>
          <button
            onClick={() => onSetRatingFilter(null)}
            className={`text-[10px] w-6 text-center rounded py-0.5 transition-colors ${
              ratingFilter === null
                ? 'text-zinc-200 bg-zinc-700'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
            }`}
            aria-label="Toutes les notes"
            title="Toutes les notes"
          >
            -
          </button>
          {([1, 2, 3, 4, 5] as const).map((star) => (
            <button
              key={star}
              onClick={() => onSetRatingFilter(ratingFilter === star ? null : star)}
              className={`text-[10px] w-6 text-center rounded py-0.5 font-mono transition-colors ${
                ratingFilter === star
                  ? 'text-amber-400 bg-amber-500/15'
                  : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800'
              }`}
              aria-label={`Filtrer ${star} etoile(s) minimum`}
              title={`${star}★ minimum`}
            >
              {star}★
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-2 py-1">
          <span className="text-[9px] text-zinc-700 w-8 shrink-0 font-mono uppercase">Flag</span>
          <button
            onClick={() => onSetFlagFilter(null)}
            className={`text-[10px] w-6 text-center rounded py-0.5 transition-colors ${
              flagFilter === null
                ? 'text-zinc-200 bg-zinc-700'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
            }`}
            aria-label="Tous les flags"
            title="Tous"
          >
            -
          </button>
          <button
            onClick={() => onSetFlagFilter(flagFilter === 'pick' ? null : 'pick')}
            className={`text-[10px] px-2 text-center rounded py-0.5 font-bold transition-colors ${
              flagFilter === 'pick'
                ? 'text-emerald-400 bg-emerald-500/15'
                : 'text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800'
            }`}
            aria-label="Filtrer les picks"
            title="Afficher uniquement les picks (P)"
          >
            Pick
          </button>
          <button
            onClick={() => onSetFlagFilter(flagFilter === 'reject' ? null : 'reject')}
            className={`text-[10px] px-2 text-center rounded py-0.5 font-bold transition-colors ${
              flagFilter === 'reject'
                ? 'text-red-400 bg-red-500/15'
                : 'text-zinc-600 hover:text-red-400 hover:bg-zinc-800'
            }`}
            aria-label="Filtrer les rejects"
            title="Afficher uniquement les rejects (X)"
          >
            Reject
          </button>
        </div>
      </div>
    </section>
  );
}
