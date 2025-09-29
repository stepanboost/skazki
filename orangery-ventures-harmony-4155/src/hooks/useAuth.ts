import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useFairyTales } from '@/context/FairyTaleContext';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const { forceRefresh } = useFairyTales();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    const checkAuth = async () => {
      try {
        const isAuth = apiService.isAdminAuthenticated();
        setAuthState({ 
          isAuthenticated: isAuth, 
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        setAuthState({ 
          isAuthenticated: false, 
          isLoading: false,
          error: 'Ошибка проверки аутентификации'
        });
      }
    };

    checkAuth();
  }, []);

  const login = async (password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Логин захардкожен как "Владимир Журавлёв"
      await apiService.adminLogin({
        username: 'Владимир Журавлёв',
        password: password
      });
      
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false,
        error: null
      });
      
      // Обновляем данные после успешного логина
      await forceRefresh();
    } catch (error) {
      console.error('Ошибка входа:', error);
      setAuthState({ 
        isAuthenticated: false, 
        isLoading: false,
        error: 'Неверный пароль или ошибка сервера'
      });
    }
  };

  const logout = async () => {
    try {
      await apiService.adminLogout();
      setAuthState({ 
        isAuthenticated: false, 
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Ошибка выхода:', error);
      // Даже если ошибка, очищаем локальное состояние
      setAuthState({ 
        isAuthenticated: false, 
        isLoading: false,
        error: null
      });
      
      // Обновляем данные после выхода
      await forceRefresh();
    }
  };

  return {
    ...authState,
    login,
    logout
  };
};
