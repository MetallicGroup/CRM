import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type UserRole = "ADMIN" | "AGENT" | "SPECIAL";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  specialKey?: string | null;
  active: boolean;
  sediuId?: string | null;
  createdAt: string;
  lastLogin?: string | null;
  lastActivity?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchSession(): Promise<{ user: User | null }> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }
  return response.json();
}

async function loginRequest(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }
  return response.json();
}

async function logoutRequest(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginRequest(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "session"], { user: null });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const user = data?.user ?? null;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    if (user.role === "SPECIAL") {
      switch (user.specialKey) {
        case "MADALINA":
          return ["view_sold_clients", "edit_limited_fields"].includes(permission);
        case "OANA":
          return true;
        case "RALUCA":
          return ["view_all_pdfs"].includes(permission);
        default:
          return false;
      }
    }

    return false;
  };

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshUser = async () => {
    await refetch();
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isAgent,
        login,
        logout,
        refreshUser,
        hasPermission,
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
