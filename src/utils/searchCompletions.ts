// Local completion patterns for instant suggestions
const FOOD_KEYWORDS = {
  'bur': ['burger', 'burrito', 'burmese', 'burnt ends'],
  'piz': ['pizza', 'pizzeria'],
  'chi': ['chinese', 'chicken', 'chips'],
  'ita': ['italian', 'italy'],
  'mex': ['mexican', 'mexico'],
  'tha': ['thai', 'thailand'],
  'jap': ['japanese', 'japan'],
  'ind': ['indian', 'india'],
  'fre': ['french', 'france'],
  'kor': ['korean', 'korea'],
  'vie': ['vietnamese', 'vietnam'],
  'gre': ['greek', 'greece'],
  'med': ['mediterranean'],
  'ame': ['american'],
  'sea': ['seafood', 'search'],
  'ste': ['steak', 'steakhouse'],
  'bar': ['bar', 'barbecue', 'bbq'],
  'caf': ['cafe', 'coffee'],
  'res': ['restaurant', 'resto'],
  'din': ['diner', 'dining'],
  'bis': ['bistro'],
  'pub': ['pub', 'public house'],
  'rom': ['romantic', 'roman'],
  'fas': ['fast food', 'fast casual'],
  'fin': ['fine dining'],
  'cas': ['casual dining'],
  'del': ['delivery', 'deli'],
  'tak': ['takeout', 'take away'],
  'bre': ['breakfast', 'brunch'],
  'lun': ['lunch'],
  'dinn': ['dinner'],
  'lat': ['late night'],
  'veg': ['vegetarian', 'vegan'],
  'glu': ['gluten free'],
  'hal': ['halal'],
  'kos': ['kosher'],
  'org': ['organic'],
  'loc': ['local'],
  'che': ['cheap', 'chef'],
  'exp': ['expensive', 'experience'],
  'new': ['new', 'nearby'],
  'pop': ['popular'],
  'tre': ['trending'],
  'hot': ['hot pot', 'hot dogs'],
  'dim': ['dim sum'],
  'sus': ['sushi', 'sustainable'],
  'ram': ['ramen'],
  'tap': ['tapas'],
  'win': ['wine bar', 'wings'],
  'coc': ['cocktails'],
  'roo': ['rooftop'],
  'out': ['outdoor', 'outside'],
  'wat': ['waterfront'],
  'dow': ['downtown'],
  'upscale': ['upscale'],
  'family': ['family friendly'],
  'date': ['date night'],
  'group': ['group dining'],
  'business': ['business lunch'],
  'special': ['special occasion']
};

const LOCATION_MODIFIERS = [
  'near me',
  'nearby',
  'in downtown',
  'with parking',
  'with outdoor seating',
  'open late',
  'open now',
  'with delivery',
  'with takeout',
  'with good reviews',
  'highly rated',
  'best rated'
];

interface CompletionCache {
  [key: string]: {
    suggestions: string[];
    timestamp: number;
  };
}

class SearchCompletionService {
  private cache: CompletionCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get instant local completions
  getInstantCompletions(query: string, location: string = ''): string[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.length < 2) return [];

    const suggestions: string[] = [];
    
    // Find matching food keywords
    for (const [prefix, completions] of Object.entries(FOOD_KEYWORDS)) {
      if (normalizedQuery.startsWith(prefix) || completions.some(c => c.startsWith(normalizedQuery))) {
        completions
          .filter(completion => completion.includes(normalizedQuery) || normalizedQuery.includes(completion.substring(0, 3)))
          .forEach(completion => {
            // Add base completion
            suggestions.push(`${completion} restaurants`);
            
            // Add location-specific if location provided
            if (location) {
              suggestions.push(`${completion} in ${location}`);
            }
            
            // Add a modifier
            const modifier = LOCATION_MODIFIERS[Math.floor(Math.random() * LOCATION_MODIFIERS.length)];
            suggestions.push(`${completion} ${modifier}`);
          });
      }
    }

    // If no food keywords match, create generic suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        `${normalizedQuery} restaurants`,
        `best ${normalizedQuery}`,
        `${normalizedQuery} near me`
      );
      
      if (location) {
        suggestions.push(`${normalizedQuery} in ${location}`);
      }
      
      suggestions.push(`${normalizedQuery} with good reviews`);
    }

    // Remove duplicates and return top 5
    return [...new Set(suggestions)].slice(0, 5);
  }

  // Check cache for AI completions
  getCachedCompletions(query: string): string[] | null {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.suggestions;
    }
    
    return null;
  }

  // Cache AI completions
  cacheCompletions(query: string, suggestions: string[]): void {
    const cacheKey = query.toLowerCase().trim();
    this.cache[cacheKey] = {
      suggestions,
      timestamp: Date.now()
    };
  }

  // Clean old cache entries
  cleanCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > this.CACHE_TTL) {
        delete this.cache[key];
      }
    });
  }
}

export const searchCompletionService = new SearchCompletionService();