import { useState, useEffect, forwardRef, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, Music, Headphones } from 'lucide-react';
import { useNavigate, Link } from '@/lib/router-compat';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchHeroSlides, type HeroSlide } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { Button } from '@/components/ui/button';
import { DEFAULT_COVER_URL } from '@/lib/constants';

// The store logo cover has a white square behind it; slides use the site logo instead.
const SITE_LOGO = '/logo.png';
import listenerRooftop from '@/assets/hero-listener-rooftop.jpg';
import listenerStudio from '@/assets/hero-listener-studio.jpg';
import listenerCity from '@/assets/hero-listener-city.jpg';
import listenerLakeside from '@/assets/hero-listener-lakeside.jpg';
import listenerFestival from '@/assets/hero-listener-festival.jpg';

const LISTENER_BACKGROUNDS = [listenerRooftop, listenerStudio, listenerCity, listenerLakeside, listenerFestival];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const titleColors: string[][] = [
  ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--primary))'],
];

const FeaturedHero = forwardRef<HTMLDivElement>((_, ref) => {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const data = await fetchHeroSlides();
      // Show slides that are active or have no status (admin-uploaded)
      const activeSlides = data.filter(s => !s.status || s.status === 'active');
      setSlides(activeSlides);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const slideColorIdx = useMemo(() => {
    return slides.map(s => hashId(s.id + 'c') % titleColors.length);
  }, [slides]);

  const slideBackgrounds = useMemo(() => {
    return slides.map(s => LISTENER_BACKGROUNDS[hashId(s.id + 'listener') % LISTENER_BACKGROUNDS.length]);
  }, [slides]);

  if (loading) {
    return <div className="h-56 md:h-80 lg:h-[420px] rounded-3xl glass-card animate-pulse" />;
  }

  if (slides.length === 0) {
    return <WelcomeHero />;
  }

  const slide = slides[current];
  const colors = titleColors[slideColorIdx[current]];
  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent(c => (c + 1) % slides.length);

  const handleCTA = () => {
    if (slide.linkedContentId && slide.linkedContentType) {
      if (slide.linkedContentType === 'track') navigate(`/play/${slide.linkedContentId}`);
      else if (slide.linkedContentType === 'video') navigate(`/video/${slide.linkedContentId}`);
    }
  };

  const ctaText = slide.ctaText || 'Listen Now';
  const imgSrc = slide.imageURL
    ? (slide.imageURL === DEFAULT_COVER_URL ? SITE_LOGO : getProxiedUrl(slide.imageURL))
    : null;
  const backgroundSrc = slideBackgrounds[current];

  return (
    <div className="featured-hero relative rounded-3xl overflow-hidden poster-shadow h-56 md:h-80 lg:h-[420px] group">
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.id + '-listener-bg'}
          src={backgroundSrc}
          alt="Music listener enjoying a song"
          width={1536}
          height={768}
          className="absolute inset-0 h-full w-full object-cover object-center"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
      {/* === MUSICAL PATTERN BACKGROUND === */}
      <div className="absolute inset-0 z-[3] pointer-events-none opacity-[0.06]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="music-notes" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              {/* Treble clef stylized */}
              <text x="10" y="30" fontSize="24" fill="white" fontFamily="serif">♪</text>
              <text x="50" y="60" fontSize="18" fill="white" fontFamily="serif">♫</text>
              <text x="30" y="75" fontSize="14" fill="white" fontFamily="serif">♩</text>
              <text x="65" y="20" fontSize="20" fill="white" fontFamily="serif">♬</text>
              {/* Sound wave lines */}
              <path d="M0,40 Q10,30 20,40 T40,40" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5"/>
              <path d="M40,15 Q50,5 60,15 T80,15" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#music-notes)" />
        </svg>
      </div>
      {/* Animated equalizer bars at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12 z-[1] pointer-events-none flex items-end justify-center gap-[3px] px-4 opacity-[0.08]">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="w-[3px] bg-foreground rounded-t-full"
            animate={{ height: [4, 12 + Math.random() * 28, 6, 20 + Math.random() * 16, 4] }}
            transition={{ duration: 1.5 + Math.random(), repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
          />
        ))}
      </div>
      {/* === FEATURED IMAGE (RIGHT CORNER) === */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {imgSrc && (
            <motion.img
              key={slide.id + '-img'}
              src={imgSrc}
              alt="Featured artist"
              className={`absolute right-0 top-0 h-full w-[52%] md:w-[58%] object-contain z-10 ${imgSrc === SITE_LOGO ? 'p-4 md:p-8' : ''}`}
              style={{
                filter: `drop-shadow(0 10px 40px ${colors[0]}55)`,
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -15 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* === TEXT CONTENT === */}
      <div className="relative z-10 flex items-center justify-start h-full pl-3 md:pl-10 lg:pl-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + '-text'}
            className="text-left max-w-[45%] md:max-w-sm break-words"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase mb-2 bg-primary text-primary-foreground">
              {slide.badge}
            </span>
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold font-heading text-foreground leading-tight mb-2">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-xs md:text-sm text-foreground/80 mb-2 leading-snug">{slide.subtitle}</p>
            )}
            <span className="inline-block text-[11px] font-medium text-foreground/70">{slide.artist}</span>

            {/* CTA */}
            {slide.linkedContentId ? (
              <Button onClick={handleCTA} className="mt-3 rounded-lg text-sm mr-auto flex gap-2">
                <Play className="w-4 h-4 fill-current" />{ctaText}
              </Button>
            ) : (
              <Button size="icon" aria-label="Featured music" className="mt-3 rounded-full mr-auto">
                <Play className="w-5 h-5 fill-current" />
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* === NAV ARROWS (show on hover) === */}
      <Button variant="glass" size="icon" aria-label="Previous featured slide" onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button variant="glass" size="icon" aria-label="Next featured slide" onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* === DOTS === */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {slides.map((_, i) => (
          <Button variant="ghost" size="icon" aria-label={`Featured slide ${i + 1}`}
            key={i}
            onClick={() => goTo(i)}
            className="h-1.5 min-w-0 p-0 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 22 : 7,
              background: i === current
                ? `linear-gradient(90deg, ${colors[0]}, ${colors[2]})`
                : 'rgba(255,255,255,0.25)',
              boxShadow: i === current ? `0 0 8px ${colors[0]}60` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
});
FeaturedHero.displayName = 'FeaturedHero';

/* ============================================
   WELCOME HERO (when no slides exist)
   ============================================ */

const WelcomeHero = () => {
  const [backgroundIdx, setBackgroundIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIdx((prev) => (prev + 1) % LISTENER_BACKGROUNDS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="featured-hero relative rounded-3xl overflow-hidden poster-shadow h-56 md:h-80 lg:h-[420px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={backgroundIdx}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          <img
            src={LISTENER_BACKGROUNDS[backgroundIdx]}
            alt="Music listener enjoying a song"
            width={1536}
            height={768}
            className="h-full w-full object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/35 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-3"
        >
          <Music className="w-5 h-5 md:w-6 md:h-6 text-foreground/80" />
          <Headphones className="w-5 h-5 md:w-6 md:h-6 text-foreground/80" />
        </motion.div>

        <motion.h2
          className="text-2xl md:text-4xl lg:text-5xl font-extrabold font-heading text-foreground mb-2 md:mb-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Welcome to Luo Music Store
        </motion.h2>

        <motion.p
          className="text-sm md:text-base text-foreground/70 max-w-md mb-4 md:mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Upload your banner here. Promote your music and reach more fans!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button asChild><Link to="/browse">
            <Play className="w-4 h-4 fill-current" />
            Start Listening
          </Link></Button>
        </motion.div>
      </div>
    </div>
  );
};

export default FeaturedHero;
