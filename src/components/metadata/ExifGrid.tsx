import { Camera, Clock, Aperture, MapPin, Maximize2, Palette } from 'lucide-react';
import type { ExifData } from '../../types';

interface ExifGridProps {
  exif: ExifData;
}

export const ExifGrid = ({ exif }: ExifGridProps) => (
  <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50">
      <Camera size={12} className="text-zinc-600" /> {exif.iso ?? '--'} ISO
    </div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end">
      <Clock size={12} className="text-zinc-600" /> {exif.shutterSpeed ?? '--'}
    </div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50">
      <Aperture size={12} className="text-zinc-600" />{' '}
      {exif.aperture != null ? `f/${exif.aperture.toFixed(1)}` : '--'}
    </div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end">
      <Maximize2 size={12} className="text-zinc-600" />{' '}
      {exif.focalLength != null ? `${Math.round(exif.focalLength)}mm` : '--'}
    </div>

    {/* GPS — affiché uniquement si disponible */}
    {exif.gpsLat != null && (
      <div className="col-span-2 flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50">
        <MapPin size={12} className="text-zinc-600" /> {exif.gpsLat.toFixed(4)},{' '}
        {exif.gpsLon?.toFixed(4) ?? '--'}
      </div>
    )}

    {/* Espace de couleur — affiché uniquement si disponible */}
    {exif.colorSpace != null && (
      <div className="col-span-2 flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50">
        <Palette size={12} className="text-zinc-600" /> {exif.colorSpace}
      </div>
    )}

    <div className="col-span-2 text-zinc-400 mt-1 font-bold text-center border-t border-zinc-900 pt-2">
      {exif.lens ?? '--'}
    </div>

    {/* Caméra — affiché si au moins un des deux champs est présent */}
    {(exif.cameraMake != null || exif.cameraModel != null) && (
      <div className="col-span-2 text-zinc-600 italic text-center text-[9px]">
        {[exif.cameraMake, exif.cameraModel].filter(Boolean).join(' ')}
      </div>
    )}
  </div>
);
