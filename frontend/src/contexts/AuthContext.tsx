import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import { authApi } from "../services/api";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, hasFirebaseConfig } from "../services/firebase";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: "firebase" | "local";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and load saved sessions
  useEffect(() => {
    const loadSession = async () => {
      const savedToken = localStorage.getItem("vendorvision_token");
      const savedUser = localStorage.getItem("vendorvision_user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        
        // Asynchronously refresh and verify user details from server
        try {
          const res = await authApi.getMe();
          const refreshedUser = res.data;
          setUser(refreshedUser);
          localStorage.setItem("vendorvision_user", JSON.stringify(refreshedUser));
        } catch (err) {
          console.error("Token verification failed, logging out", err);
          logout();
        }
      }
      setIsLoading(false);
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const isDemoAccount = [
        "admin@vendorvision.com",
        "procurement@vendorvision.com",
        "manager@vendorvision.com",
        "sales@apex.com"
      ].includes(email);

      if (hasFirebaseConfig && auth && !isDemoAccount) {
        // Firebase Auth flow
        const fbUserCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbToken = await fbUserCredential.user.getIdToken();
        
        // Exchange for local JWT
        const res = await authApi.firebaseLogin({ id_token: fbToken });
        const { access_token } = res.data;
        
        localStorage.setItem("vendorvision_token", access_token);
        setToken(access_token);
        
        const meRes = await authApi.getMe();
        const authenticatedUser = meRes.data;
        setUser(authenticatedUser);
        localStorage.setItem("vendorvision_user", JSON.stringify(authenticatedUser));
      } else {
        // Local database Auth flow
        const res = await authApi.login({ email, password });
        const { access_token } = res.data;

        localStorage.setItem("vendorvision_token", access_token);
        setToken(access_token);

        const meRes = await authApi.getMe();
        const authenticatedUser = meRes.data;
        setUser(authenticatedUser);
        localStorage.setItem("vendorvision_user", JSON.stringify(authenticatedUser));
      }
    } catch (error: any) {
      setIsLoading(false);
      const detail = error.response?.data?.detail || error.message || "Authentication failed. Check credentials.";
      throw new Error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: string, phone?: string) => {
    setIsLoading(true);
    try {
      if (hasFirebaseConfig && auth) {
        // Firebase client sign up
        const fbUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbToken = await fbUserCredential.user.getIdToken();
        
        // Sync and register in local SQLite DB
        const res = await authApi.firebaseLogin({
          id_token: fbToken,
          name: name,
          role: role
        });
        const { access_token } = res.data;
        
        localStorage.setItem("vendorvision_token", access_token);
        setToken(access_token);
        
        const meRes = await authApi.getMe();
        const authenticatedUser = meRes.data;
        setUser(authenticatedUser);
        localStorage.setItem("vendorvision_user", JSON.stringify(authenticatedUser));
      } else {
        // Local database sign up
        await authApi.register({ email, password, name, role, phone });
        
        // Auto-login after sign up
        const res = await authApi.login({ email, password });
        const { access_token } = res.data;
        
        localStorage.setItem("vendorvision_token", access_token);
        setToken(access_token);
        
        const meRes = await authApi.getMe();
        const authenticatedUser = meRes.data;
        setUser(authenticatedUser);
        localStorage.setItem("vendorvision_user", JSON.stringify(authenticatedUser));
      }
    } catch (error: any) {
      setIsLoading(false);
      const detail = error.response?.data?.detail || error.message || "Registration failed.";
      throw new Error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("vendorvision_token");
    localStorage.removeItem("vendorvision_user");
    setUser(null);
    setToken(null);
    if (hasFirebaseConfig && auth) {
      signOut(auth).catch((err) => console.error("Firebase logout failed:", err));
    }
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      ...updatedData
    };
    setUser(updatedUser);
    localStorage.setItem("vendorvision_user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        authMode: hasFirebaseConfig && auth ? "firebase" : "local",
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
