import { genres, filterTabs } from '@/lib/constants';
import { Button } from '@/components/ui/button';

interface FilterTabsProps {
  activeFilter: string;
  activeGenre: string;
  onFilterChange: (filter: string) => void;
  onGenreChange: (genre: string) => void;
}

const FilterTabs = ({ activeFilter, activeGenre, onFilterChange, onGenreChange }: FilterTabsProps) => {
  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filterTabs.map(tab => (
          <Button variant="ghost" size="sm"
            key={tab}
            onClick={() => onFilterChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab
                ? 'gradient-primary text-primary-foreground'
                : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Genre tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {genres.map(genre => (
          <Button variant="ghost" size="sm"
            key={genre}
            onClick={() => onGenreChange(genre)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeGenre === genre
                ? 'gradient-primary text-primary-foreground'
                : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {genre}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default FilterTabs;
