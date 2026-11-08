import { Link } from '@/lib/router-compat';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Artist } from '@/lib/types';

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const photoURL = (artist as any).photoURL ? getProxiedUrl((artist as any).photoURL) : null;

  return (
    <Link
      to={`/artist/${artist.id}`}
      className="group flex flex-col items-center gap-3 p-4 rounded-xl glass-card hover:bg-surface-hover transition-colors"
    >
      {/* Avatar */}
      <div className="relative">
        {photoURL ? (
          <img
            src={photoURL}
            alt={artist.name}
            className="w-28 h-28 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-28 h-28 rounded-full transition-transform duration-300 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }}
          />
        )}
        <div className="absolute inset-0 rounded-full bg-background/0 group-hover:bg-background/10 transition-colors" />
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{artist.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{artist.followers} followers</p>
      </div>
    </Link>
  );
};

export default ArtistCard;
