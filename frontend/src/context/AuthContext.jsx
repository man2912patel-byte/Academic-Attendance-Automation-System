import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const activeUsername = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (activeUsername && token) {
        try {
          // Verify token and fetch fresh settings from database
          const res = await apiClient.get('/settings');
          const savedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
          
          setUser({
            ...savedUser,
            username: activeUsername,
            student_excel_path: res.data.student_excel_path,
            attendance_excel_path: res.data.attendance_excel_path,
            theme: res.data.theme,
            dark_mode: res.data.dark_mode,
            output_folder: res.data.output_folder,
            backup_folder: res.data.backup_folder,
            export_format: res.data.export_format,
            auto_backup: res.data.auto_backup
          });
        } catch (err) {
          console.error("Token verification failed on start:", err);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (username, password, rememberMe = false) => {
    try {
      const res = await apiClient.post('/login', { username, password });
      const { user: userData, token } = res.data;

      if (rememberMe) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', userData.username);
        localStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('currentUser', userData.username);
        localStorage.setItem('currentUser', userData.username); // Sync headers for API client
        localStorage.setItem('authUser', JSON.stringify(userData));
      }

      setUser(userData);
      return userData;
    } catch (err) {
      throw err;
    }
  };

  const register = async (name, email, username, password, securityQuestion, securityAnswer) => {
    try {
      const res = await apiClient.post('/register', {
        name,
        email,
        username,
        password,
        securityQuestion,
        securityAnswer
      });
      return res.data.user;
    } catch (err) {
      throw err;
    }
  };

  const forgotPassword = async (username, securityQuestion, securityAnswer, newPassword) => {
    try {
      await apiClient.post('/forgot-password', {
        username,
        securityQuestion,
        securityAnswer,
        newPassword
      });
    } catch (err) {
      throw err;
    }
  };

  const editProfile = async (name, email, profilePhoto) => {
    try {
      const res = await apiClient.put('/profile', {
        name,
        email,
        profile_photo: profilePhoto
      });
      const updatedUser = res.data.user;
      
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      throw err;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiClient.put('/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
    } catch (err) {
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      // First clean up user's active table history
      try {
        await apiClient.delete('/settings');
      } catch (e) {
        console.warn("User data reset warning:", e);
      }
      
      // Delete user account on the backend
      await apiClient.delete('/account');
    } catch (err) {
      console.error("Failed to delete user account on backend:", err);
    } finally {
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, forgotPassword, editProfile, changePassword, deleteAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
