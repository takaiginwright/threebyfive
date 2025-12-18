// services/authService.ts
import { User } from "../types";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

const USERS_KEY = "3x5_auth_users";
const CURRENT_USER_KEY = "3x5_auth_current_user";

// --- Local "DB" helpers using localStorage ---
const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveUser = (user: User) => {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getSession = (): User | null => {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setSession = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

// --- Email/password login (still mock/local) ---
export const login = async (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      const user = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (user) {
        setSession(user);
        resolve(user);
      } else {
        reject(new Error("Invalid email or password"));
      }
    }, 800);
  });
};

export const signup = async (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        reject(new Error("User already exists"));
        return;
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        email,
        name: email.split("@")[0],
        isGuest: false,
      };

      saveUser(newUser);
      setSession(newUser);
      resolve(newUser);
    }, 800);
  });
};

// --- REAL Google Login using Firebase Auth ---
export const googleLogin = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  const firebaseUser = result.user;

  const user: User = {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    name:
      firebaseUser.displayName ||
      (firebaseUser.email?.split("@")[0] ?? "Unnamed"),
    avatarUrl: firebaseUser.photoURL || undefined,
    isGuest: false,
  };

  saveUser(user);
  setSession(user);
  return user;
};

// --- Guest login stays the same ---
export const loginGuest = (): User => {
  const guestUser: User = {
    id: "guest",
    email: "",
    name: "Guest",
    isGuest: true,
  };
  setSession(guestUser);
  return guestUser;
};

export const logout = () => {
  setSession(null);
};
