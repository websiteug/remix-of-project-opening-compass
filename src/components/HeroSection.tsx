import { motion } from 'framer-motion';
import { Play, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/router-compat';
import heroImage from '@/assets/hero-concert.jpg';

const HeroSection = () => {
  return (
    <section className="relative h-[85vh] min-h-[500px] max-h-[800px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Live concert with vibrant lights"
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-end pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-medium mb-6 border border-primary/20"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            Now Streaming
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading leading-tight mb-4">
            Your Music,{' '}
            <span className="text-primary">Your Stage</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
            Discover independent artists, stream unlimited tracks, and download your favorites. 
            Artists — share your sound with the world.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/browse">
              <Button variant="glow" size="lg" className="rounded-full gap-2">
                <Play className="w-4 h-4" />
                Start Listening
              </Button>
            </Link>
            <Link to="/browse">
              <Button variant="outline" size="lg" className="rounded-full gap-2 border-border">
                <Headphones className="w-4 h-4" />
                Browse Music
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
