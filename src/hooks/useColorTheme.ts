import { createContext, useContext, useEffect, useState } from 'react';

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryGlow: string;
    primaryMuted: string;
    accent: string;
    accentMuted: string;
    success: string;
    warning: string;
  };
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    description: 'Sophisticated navy blue with gold accents',
    colors: {
      primary: '221 83% 53%',
      primaryGlow: '221 83% 63%',
      primaryMuted: '221 20% 94%',
      accent: '45 93% 47%',
      accentMuted: '45 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'warm-orange',
    name: 'Warm Orange',
    description: 'Vibrant orange with green accents',
    colors: {
      primary: '12 76% 61%',
      primaryGlow: '25 95% 53%',
      primaryMuted: '12 20% 94%',
      accent: '142 76% 36%',
      accentMuted: '142 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural green with warm gold touches',
    colors: {
      primary: '142 71% 45%',
      primaryGlow: '142 71% 55%',
      primaryMuted: '142 20% 94%',
      accent: '45 93% 47%',
      accentMuted: '45 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Elegant purple with vibrant amber accents',
    colors: {
      primary: '263 70% 50%',
      primaryGlow: '263 70% 60%',
      primaryMuted: '263 20% 94%',
      accent: '43 96% 56%',
      accentMuted: '43 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    description: 'Bold red with vibrant teal accents',
    colors: {
      primary: '348 83% 47%',
      primaryGlow: '348 83% 57%',
      primaryMuted: '348 20% 94%',
      accent: '180 85% 50%',
      accentMuted: '180 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    description: 'Deep teal with vibrant coral accents',
    colors: {
      primary: '180 71% 45%',
      primaryGlow: '180 71% 55%',
      primaryMuted: '180 20% 94%',
      accent: '16 90% 60%',
      accentMuted: '16 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'sunset-pink',
    name: 'Sunset Pink',
    description: 'Warm pink with golden yellow accents',
    colors: {
      primary: '330 81% 60%',
      primaryGlow: '330 81% 70%',
      primaryMuted: '330 20% 94%',
      accent: '51 92% 55%',
      accentMuted: '51 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    description: 'Dark slate with electric blue accents',
    colors: {
      primary: '215 25% 27%',
      primaryGlow: '215 25% 37%',
      primaryMuted: '215 20% 94%',
      accent: '200 98% 50%',
      accentMuted: '200 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Soft lavender with fresh mint accents',
    colors: {
      primary: '280 60% 65%',
      primaryGlow: '280 60% 75%',
      primaryMuted: '280 20% 94%',
      accent: '160 84% 50%',
      accentMuted: '160 20% 95%',
      success: '142 71% 45%',
      warning: '43 96% 56%',
    }
  }
];

export function useColorTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('color-theme') || 'professional-blue';
  });

  const applyTheme = (themeId: string) => {
    const theme = colorThemes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    
    // Update CSS variables
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--primary-glow', theme.colors.primaryGlow);
    root.style.setProperty('--primary-muted', theme.colors.primaryMuted);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-muted', theme.colors.accentMuted);
    root.style.setProperty('--success', theme.colors.success);
    root.style.setProperty('--warning', theme.colors.warning);
    
    // Update culinary colors to match primary
    root.style.setProperty('--culinary', theme.colors.primary);
    root.style.setProperty('--culinary-muted', theme.colors.primaryMuted);
    root.style.setProperty('--culinary-accent', theme.colors.accent);
    root.style.setProperty('--culinary-highlight', theme.colors.primaryGlow);
    
    // Update rating colors to match accent
    root.style.setProperty('--rating-filled', theme.colors.accent);
    root.style.setProperty('--rating-hover', theme.colors.primaryGlow);
    
    // Update gradients
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${theme.colors.primary}) 0%, hsl(${theme.colors.primaryGlow}) 100%)`);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${theme.colors.accent}) 0%, hsl(${theme.colors.primaryGlow}) 100%)`);
    
    // Update ring color
    root.style.setProperty('--ring', theme.colors.primary);
    root.style.setProperty('--sidebar-primary', theme.colors.primary);
    root.style.setProperty('--sidebar-ring', theme.colors.primary);
    
    // Update glow shadow
    root.style.setProperty('--shadow-glow', `0 0 20px hsl(${theme.colors.primary} / 0.3)`);
    
    setCurrentTheme(themeId);
    localStorage.setItem('color-theme', themeId);
  };

  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  return {
    currentTheme,
    themes: colorThemes,
    applyTheme,
    getCurrentTheme: () => colorThemes.find(t => t.id === currentTheme)
  };
}