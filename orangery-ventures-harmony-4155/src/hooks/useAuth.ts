import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    const checkAuth = () => {
      const session = localStorage.getItem('adminSession');
      const loginTime = localStorage.getItem('adminLoginTime');
      
      if (session === 'authenticated' && loginTime) {
        // Проверяем, не истекла ли сессия (24 часа)
        const now = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
        
        if (now - loginTimestamp < sessionDuration) {
          setAuthState({ isAuthenticated: true, isLoading: false });
          return;
        } else {
          // Сессия истекла
          localStorage.removeItem('adminSession');
          localStorage.removeItem('adminLoginTime');
        }
      }
      
      setAuthState({ isAuthenticated: false, isLoading: false });
    };

    checkAuth();
  }, []);

  const login = () => {
    setAuthState({ isAuthenticated: true, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminLoginTime');
    setAuthState({ isAuthenticated: false, isLoading: false });
  };

  return {
    ...authState,
    login,
    logout
  };
};
