import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const activeUsername = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      if (activeUsername) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const found = users.find(u => u.username.toLowerCase() === activeUsername.toLowerCase());
        if (found) {
          setUser(found);
          // Set in localStorage to sync X-User-Username header
          localStorage.setItem('currentUser', found.username);
        } else {
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (username, password, rememberMe = false) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (!found) {
      throw { response: { data: { message: "Invalid Username or Password" } } };
    }

    if (rememberMe) {
      localStorage.setItem('currentUser', found.username);
    } else {
      sessionStorage.setItem('currentUser', found.username);
      localStorage.setItem('currentUser', found.username); // Also set in local to trigger X-User-Username header
    }

    setUser(found);
    return found;
  };

  const register = async (name, email, username, password, securityQuestion, securityAnswer) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (exists) {
      throw { response: { data: { message: "Username already exists" } } };
    }

    const newUser = {
      id: Date.now(),
      username: username.trim(),
      name: name.trim(),
      fullName: name.trim(),
      email: email.trim(),
      password: password,
      securityQuestion: securityQuestion,
      securityAnswer: securityAnswer,
      profile_photo: null
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  };

  const forgotPassword = async (username, securityQuestion, securityAnswer, newPassword) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (userIndex === -1) {
      throw { response: { data: { message: "Username not found" } } };
    }

    const targetUser = users[userIndex];
    if (
      targetUser.securityQuestion !== securityQuestion ||
      targetUser.securityAnswer.toLowerCase().trim() !== securityAnswer.toLowerCase().trim()
    ) {
      throw { response: { data: { message: "Incorrect security credentials" } } };
    }

    targetUser.password = newPassword;
    users[userIndex] = targetUser;
    localStorage.setItem('users', JSON.stringify(users));
    
    // If active user, update state
    if (user && user.username.toLowerCase() === username.toLowerCase()) {
      setUser(targetUser);
    }
  };

  const editProfile = async (name, email, profilePhoto) => {
    if (!user) throw { response: { data: { message: "Not authenticated" } } };

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    
    if (userIndex === -1) throw { response: { data: { message: "User not found" } } };

    const updatedUser = {
      ...users[userIndex],
      name: name.trim(),
      fullName: name.trim(),
      email: email.trim(),
      profile_photo: profilePhoto
    };

    users[userIndex] = updatedUser;
    localStorage.setItem('users', JSON.stringify(users));
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) throw { response: { data: { message: "Not authenticated" } } };

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    
    if (userIndex === -1) throw { response: { data: { message: "User not found" } } };

    if (users[userIndex].password !== currentPassword) {
      throw { response: { data: { message: "Incorrect current password" } } };
    }

    users[userIndex].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));
    setUser(users[userIndex]);
  };

  const deleteAccount = async () => {
    if (!user) return;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const filtered = users.filter(u => u.username.toLowerCase() !== user.username.toLowerCase());
    localStorage.setItem('users', JSON.stringify(filtered));

    // Also tell backend to drop this user's data tables
    try {
      await apiClient.delete('/settings'); // We can make the settings delete endpoint drop user tables!
    } catch (err) {
      console.error("Failed to drop database tables on user deletion:", err);
    }

    logout();
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, forgotPassword, editProfile, changePassword, deleteAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
