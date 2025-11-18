"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthState, LoginData, RegisterData } from "@/types/user";
import { apiService } from "@/lib/api";

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    token: null,
    loading: true,
  });

  useEffect(() => {
    // Восстанавливаем сессию из localStorage
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          token: savedToken,
          loading: false,
        });
      } catch (error) {
        console.error("Error restoring auth state:", error);
        // logout() очистит loading=false
        logout();
      }
    } else {
      // Нет сохранённой сессии — отметим загрузку завершённой
      setAuthState({
        user: null,
        isAuthenticated: false,
        token: null,
        loading: false,
      });
    }
  }, []);

  const login = async (data: LoginData): Promise<void> => {
    try {
      const response = await apiService.login({
        username: data.email,
        password: data.password,
      });

      // Получаем полную информацию о пользователе
      const userData = await apiService.getCurrentUser(response.access_token);

      const user: User = {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        gender: userData.gender,
        age: userData.age,
        createdAt: new Date(),
        token: response.access_token,
        conversationId: userData.history?.[0]?.id, // Сохраняем ID беседы
      };

      setAuthState({
        user,
        isAuthenticated: true,
        token: response.access_token,
        loading: true,
      });

      // Сохраняем в localStorage
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(user));
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Неверный email или пароль");
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      const response = await apiService.register(data);

      // После регистрации автоматически логинимся
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      console.error("Registration error:", error);
      throw new Error(
        "Ошибка при регистрации. Возможно, пользователь с таким email уже существует."
      );
    }
  };

  const logout = (): void => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      token: null,
      loading: false,
    });
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  const updateUser = (updatedData: Partial<User>): void => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updatedData };
      setAuthState((prev) => ({
        ...prev,
        user: updatedUser,
      }));
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!authState.token) return;

    try {
      await apiService.deleteAccount(authState.token);
      logout();
    } catch (error) {
      console.error("Delete account error:", error);
      throw new Error("Ошибка при удалении аккаунта");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        updateUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
