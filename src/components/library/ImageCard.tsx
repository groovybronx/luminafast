import type { CatalogImage } from '@/types';
import './library.css';

interface ImageCardProps {
  image: CatalogImage;
  selected: boolean;
  onSelect: (id: number) => void;
}

export const ImageCard = ({ image, selected, onSelect }: ImageCardProps) => {
  return (
    <div
      className={`image-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(image.id)}
    >
      <img src={image.url} alt={image.filename} />
      <div className="image-info">
        <span>{image.filename}</span>
        <span>{image.state?.rating ?? '\u2014'}</span>
      </div>
    </div>
  );
};
