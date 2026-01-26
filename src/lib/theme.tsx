'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('vertix-theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('vertix-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Cores do tema
export const colors = {
  light: {
    // Fundos
    bgPrimary: '#FDF8F4',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#F5EFE9',
    bgHover: '#EDE6DF',
    
    // Cards e elementos
    cardBg: '#FFFFFF',
    cardBorder: '#E8DFD5',
    
    // Sidebar
    sidebarBg: '#1A3A4A',
    sidebarText: '#FFFFFF',
    sidebarHover: '#254B5E',
    sidebarActive: '#10b981',
    
    // Textos
    textPrimary: '#1A3A4A',
    textSecondary: '#5A7A8A',
    textMuted: '#8AA0AD',
    
    // Cores de destaque
    primary: '#10b981',
    primaryHover: '#059669',
    primaryLight: '#D1FAE5',
    
    // Cores de status
    success: '#10b981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Cores especiais (da landing)
    coral: '#E57373',
    cream: '#FDF8F4',
    navy: '#1A3A4A',
    
    // Inputs
    inputBg: '#FFFFFF',
    inputBorder: '#E8DFD5',
    inputFocus: '#10b981',
    
    // Chat
    chatBgReceived: '#F5EFE9',
    chatBgSent: '#10b981',
    chatTextReceived: '#1A3A4A',
    chatTextSent: '#FFFFFF',
  },
  dark: {
    // Fundos
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgHover: '#475569',
    
    // Cards e elementos
    cardBg: '#1e293b',
    cardBorder: '#334155',
    
    // Sidebar
    sidebarBg: '#1e293b',
    sidebarText: '#FFFFFF',
    sidebarHover: '#334155',
    sidebarActive: '#10b981',
    
    // Textos
    textPrimary: '#FFFFFF',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    
    // Cores de destaque
    primary: '#10b981',
    primaryHover: '#059669',
    primaryLight: '#064E3B',
    
    // Cores de status
    success: '#10b981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Cores especiais
    coral: '#E57373',
    cream: '#FDF8F4',
    navy: '#1A3A4A',
    
    // Inputs
    inputBg: '#0f172a',
    inputBorder: '#334155',
    inputFocus: '#10b981',
    
    // Chat
    chatBgReceived: '#1e293b',
    chatBgSent: '#10b981',
    chatTextReceived: '#FFFFFF',
    chatTextSent: '#FFFFFF',
  }
};