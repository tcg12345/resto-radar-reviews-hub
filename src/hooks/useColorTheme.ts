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

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
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
  },
];

// Helper functions to convert between hex and HSL
function hexToHsl(hex: string): {h: number, s: number, l: number} {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return {h: 0, s: 0, l: 0};
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper function to convert HSL values to CSS string
function hslToString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

// Helper function to generate variations of a color
function generateColorVariations(h: number, s: number, l: number) {
  return {
    primary: hslToString(h, s, l),
    primaryGlow: hslToString(h, s, Math.min(l + 10, 100)),
    primaryMuted: hslToString(h, Math.max(s - 60, 20), Math.min(l + 40, 94)),
  };
}

export function useColorTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('color-theme') || 'professional-blue';
  });

  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    const stored = localStorage.getItem('custom-themes');
    return stored ? JSON.parse(stored) : [];
  });

  const [tempCustomColors, setTempCustomColors] = useState<{primary: string, accent: string}>({
    primary: '#3b82f6',
    accent: '#14b8a6'
  });

  const saveCustomTheme = (name: string) => {
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name,
      colors: {
        primary: tempCustomColors.primary,
        accent: tempCustomColors.accent
      }
    };
    
    const updatedThemes = [...customThemes, newTheme];
    setCustomThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    
    // Apply the new theme
    applyCustomTheme(tempCustomColors.primary, tempCustomColors.accent);
    setCurrentTheme(newTheme.id);
    localStorage.setItem('color-theme', newTheme.id);
  };

  const deleteCustomTheme = (themeId: string) => {
    const updatedThemes = customThemes.filter(theme => theme.id !== themeId);
    setCustomThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    
    // If we're deleting the currently active theme, switch to professional-blue
    if (currentTheme === themeId) {
      applyTheme('professional-blue');
    }
  };

  const updateTempCustomColors = (primary: string, accent: string) => {
    setTempCustomColors({ primary, accent });
    applyCustomTheme(primary, accent);
  };

  const applyCustomTheme = (primaryHex: string, accentHex: string) => {
    const primaryHsl = hexToHsl(primaryHex);
    const accentHsl = hexToHsl(accentHex);
    
    const root = document.documentElement;
    const primaryVariations = generateColorVariations(primaryHsl.h, primaryHsl.s, primaryHsl.l);
    
    // Update CSS variables
    root.style.setProperty('--primary', primaryVariations.primary);
    root.style.setProperty('--primary-glow', primaryVariations.primaryGlow);
    root.style.setProperty('--primary-muted', primaryVariations.primaryMuted);
    root.style.setProperty('--accent', hslToString(accentHsl.h, accentHsl.s, accentHsl.l));
    root.style.setProperty('--accent-muted', hslToString(accentHsl.h, Math.max(accentHsl.s - 60, 20), Math.min(accentHsl.l + 40, 95)));
    
    // Update other theme colors
    root.style.setProperty('--success', '142 71% 45%');
    root.style.setProperty('--warning', '43 96% 56%');
    
    // Update culinary colors to match primary
    root.style.setProperty('--culinary', primaryVariations.primary);
    root.style.setProperty('--culinary-muted', primaryVariations.primaryMuted);
    root.style.setProperty('--culinary-accent', hslToString(accentHsl.h, accentHsl.s, accentHsl.l));
    root.style.setProperty('--culinary-highlight', primaryVariations.primaryGlow);
    
    // Update rating colors
    root.style.setProperty('--rating-filled', hslToString(accentHsl.h, accentHsl.s, accentHsl.l));
    root.style.setProperty('--rating-hover', primaryVariations.primaryGlow);
    
    // Update gradients
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${primaryVariations.primary}) 0%, hsl(${primaryVariations.primaryGlow}) 100%)`);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${hslToString(accentHsl.h, accentHsl.s, accentHsl.l)}) 0%, hsl(${primaryVariations.primaryGlow}) 100%)`);
    
    // Update ring color
    root.style.setProperty('--ring', primaryVariations.primary);
    root.style.setProperty('--sidebar-primary', primaryVariations.primary);
    root.style.setProperty('--sidebar-ring', primaryVariations.primary);
    
    // Update glow shadow
    root.style.setProperty('--shadow-glow', `0 0 20px hsl(${primaryVariations.primary} / 0.3)`);
  };

  const applyTheme = (themeId: string) => {
    // Check if it's a custom theme
    const customTheme = customThemes.find(t => t.id === themeId);
    if (customTheme) {
      applyCustomTheme(customTheme.colors.primary, customTheme.colors.accent);
      setCurrentTheme(themeId);
      localStorage.setItem('color-theme', themeId);
      return;
    }

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
    const customTheme = customThemes.find(t => t.id === currentTheme);
    if (customTheme) {
      applyCustomTheme(customTheme.colors.primary, customTheme.colors.accent);
    } else {
      applyTheme(currentTheme);
    }
  }, []);

  const getAllThemes = () => [
    ...colorThemes,
    ...customThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: 'Custom theme',
      colors: {
        primary: '0 0% 0%', // We'll convert hex to HSL if needed
        primaryGlow: '0 0% 0%',
        primaryMuted: '0 0% 0%',
        accent: '0 0% 0%',
        accentMuted: '0 0% 0%',
        success: '142 71% 45%',
        warning: '43 96% 56%',
      }
    }))
  ];

  return {
    currentTheme,
    themes: colorThemes,
    customThemes,
    tempCustomColors,
    applyTheme,
    saveCustomTheme,
    deleteCustomTheme,
    updateTempCustomColors,
    getAllThemes,
    getCurrentTheme: () => {
      const customTheme = customThemes.find(t => t.id === currentTheme);
      if (customTheme) return { id: customTheme.id, name: customTheme.name, description: 'Custom theme' };
      return colorThemes.find(t => t.id === currentTheme);
    }
  };
}