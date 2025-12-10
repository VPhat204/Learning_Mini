import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const syncThemeWithServer = useCallback(async (isDarkMode) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user?.id) {
      try {
        await fetch(`http://localhost:5001/users/${user.id}/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            theme: isDarkMode ? 'dark' : 'light' 
          })
        });
      } catch (error) {
        console.error('Failed to sync theme with server:', error);
      }
    }
  }, []);

  const loadUserTheme = useCallback(async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user?.id) {
      try {
        const response = await fetch(`http://localhost:5001/users/${user.id}/theme`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            const isDark = data.theme === 'dark';
            setDarkMode(isDark);
            document.body.setAttribute('data-theme', data.theme);
            setCurrentUserId(user.id); 
            setIsInitialized(true);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load user theme:', error);
      }
    }
    
    setDarkMode(false);
    document.body.setAttribute('data-theme', 'light');
    setCurrentUserId(null);
    setIsInitialized(true);
  }, []);

  const resetToDefaultTheme = useCallback(() => {
    setDarkMode(false);
    document.body.setAttribute('data-theme', 'light');
    setCurrentUserId(null);
  }, []);

  const reloadTheme = useCallback(() => {
    loadUserTheme();
  }, [loadUserTheme]);

  useEffect(() => {
    if (!isInitialized) return;
    
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      syncThemeWithServer(darkMode);
    }
  }, [darkMode, isInitialized, syncThemeWithServer]);

  useEffect(() => {
    loadUserTheme();
    
    const interval = setInterval(() => {
      const user = JSON.parse(localStorage.getItem('user'));
      const newUserId = user?.id || null;
      
      if (newUserId !== currentUserId) {
        loadUserTheme();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentUserId, loadUserTheme]);

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const setUserTheme = useCallback((isDark) => {
    setDarkMode(isDark);
  }, []);

  const value = {
    darkMode,
    toggleTheme,
    setDarkMode: setUserTheme,
    resetToDefaultTheme,
    reloadTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};