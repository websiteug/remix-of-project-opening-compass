import { useMemo, useState } from 'react';
import { siteOrigin } from '@/lib/siteUrl';
import { Link } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import { Disc3, Search } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { genreGroups, uploadGenres } from '@/lib/constants';
import { Input } from '@/components/ui/input';

import dancehallImg from '@/assets/genres/dancehall.jpg';
import hiphopImg from '@/assets/genres/hiphop.jpg';
import gospelImg from '@/assets/genres/gospel.jpg';
import lakubukubuImg from '@/assets/genres/lakubukubu.jpg';
import rapImg from '@/assets/genres/rap.jpg';
import afrobeatImg from '@/assets/genres/afrobeat.jpg';
import rumbaImg from '@/assets/genres/rumba.jpg';
import reggaeImg from '@/assets/genres/reggae.jpg';
import agumaImg from '@/assets/genres/aguma.jpg';
import amapianoImg from '@/assets/genres/amapiano.jpg';
import rnbImg from '@/assets/genres/rnb.jpg';

const genreImages: Record<string, string> = {
  Dancehall: dancehallImg,
  Hiphop: hiphopImg,
  Gospel: gospelImg,
  Lakubukubu: lakubukubuImg,
  Rap: rapImg,
  Afrobeat: afrobeatImg,
  Rumba: rumbaImg,
  Reggae: reggaeImg,
  Aguma: agumaImg,
  Amapiano: amapianoImg,
  RnB: rnbImg,
};

// Token-based tiles for genres without a dedicated photo, so every catalogue genre stays browsable.
const tileStyles = [
  'from-primary/35 via-primary/10 to-secondary',
  'from-accent/35 via-accent/10 to-secondary',
  'from-secondary via-muted to-card',
  'from-primary/25 via-accent/20 to-muted',
  'from-sidebar-primary/30 via-secondary to-muted',
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

const Genres = () => {
  const [query, setQuery] = useState('');

  useSEO({
    title: 'Browse All Genres | LUO MUSIC STORE',
    description: 'Explore every genre on LUO MUSIC STORE — Dancehall, Hiphop, Gospel, Kidandali, Kadongo Kamu, Bofena, Bax-Ragga, Lugaflow, Amapiano, Bakisimba, Kadodi, Bwola and more Ugandan sounds.',
    url: `${siteOrigin()}/genres`,
  });

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return genreGroups
      .map(group => ({
        title: group.title,
        genres: group.genres.filter(name => !q || name.toLowerCase().includes(q)),
      }))
      .filter(group => group.genres.length > 0);
  }, [query]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold font-heading mb-1">All Genres</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Tap a genre to explore its music — {uploadGenres.length} Ugandan and international styles
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search genres..."
          className="pl-9 h-9 text-sm"
          aria-label="Search genres"
        />
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">No genre matches “{query}”.</p>
      )}

      <div className="space-y-8">
        {sections.map(section => (
          <section key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {section.title}
            </h2>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {section.genres.map((name, index) => {
                const image = genreImages[name];
                return (
                  <motion.div key={name} variants={item}>
                    <Link
                      to={`/music?genre=${encodeURIComponent(name)}`}
                      className="relative rounded-xl overflow-hidden aspect-[4/3] block group"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${tileStyles[index % tileStyles.length]} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                        >
                          <Disc3 className="w-8 h-8 text-foreground/25" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-3">
                        <span className="text-sm font-bold text-white">{name}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Genres;
