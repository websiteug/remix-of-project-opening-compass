import { Link } from '@/lib/router-compat';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}

const SectionHeader = ({ title, linkTo, linkLabel = 'See All' }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold font-heading">{title}</h2>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {linkLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
