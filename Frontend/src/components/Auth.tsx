// Auth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig"; // Adjust path as needed
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

interface User {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const ADMIN_EMAIL = "ouda.yousef@gmail.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          isAdmin: firebaseUser.email === ADMIN_EMAIL,
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setUser({
        uid: user.uid,
        email: user.email,
        isAdmin: user.email === ADMIN_EMAIL,
      });
    } catch (error) {
      console.error("Error logging in with Google: ", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const contextValue: AuthContextType = {
    user,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
