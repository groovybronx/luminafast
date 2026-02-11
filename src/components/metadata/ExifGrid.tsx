import { Camera, Clock, Aperture, MapPin } from 'lucide-react';
import type { ExifData } from '../../types';

interface ExifGridProps {
  exif: ExifData;
}

export const ExifGrid = ({ exif }: ExifGridProps) => (
  <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50"><Camera size={12} className="text-zinc-600"/> {exif.iso} ISO</div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end"><Clock size={12} className="text-zinc-600"/> {exif.shutter}</div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50"><Aperture size={12} className="text-zinc-600"/> f/{exif.fstop}</div>
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end truncate"><MapPin size={12} className="text-zinc-600"/> {exif.location.split(',')[0]}</div>
    <div className="col-span-2 text-zinc-400 mt-1 font-bold text-center border-t border-zinc-900 pt-2">{exif.lens}</div>
    <div className="col-span-2 text-zinc-600 italic text-center text-[9px]">{exif.camera}</div>
  </div>
);
