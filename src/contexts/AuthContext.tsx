import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'manager' | 'pos_user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  userName: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = 'pos-auth-cache';

const rolePermissions: Record<AppRole, string[]> = {
  admin: ['dashboard', 'pos', 'food-items', 'ingredients', 'recipes', 'store-stock', 'kitchen-stock', 'orders', 'reports', 'settings', 'staff', 'daily-costs'],
  manager: ['dashboard', 'pos', 'food-items', 'ingredients', 'recipes', 'store-stock', 'kitchen-stock', 'orders', 'reports', 'daily-costs'],
  pos_user: ['pos', 'orders'],
};

// Cache auth details to localStorage for offline use
function cacheAuthDetails(role: AppRole | null, name: string | null) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ role, name, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

function getCachedAuthDetails(): { role: AppRole | null; name: string | null } | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Cache valid for 30 days
    if (Date.now() - parsed.timestamp > 30 * 24 * 60 * 60 * 1000) return null;
    return { role: parsed.role, name: parsed.name };
  } catch {
    return null;
  }
}

function clearCachedAuthDetails() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserDetails(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setUserName(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      // Offline: try to restore from Supabase's persisted session + our cached role
      const cachedSession = session; // Already set from onAuthStateChange if available
      if (!cachedSession) {
        // Check if we have a cached user from Supabase's localStorage persistence
        const cached = getCachedAuthDetails();
        if (cached?.role) {
          // Supabase persists session in localStorage, so user may still be available
          setUserRole(cached.role);
          setUserName(cached.name);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserDetails = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData?.role) {
        setUserRole(roleData.role as AppRole);
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData?.name) {
        setUserName(profileData.name);
      }

      // Cache for offline use
      cacheAuthDetails(
        (roleData?.role as AppRole) || null,
        profileData?.name || null
      );
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Offline fallback: use cached auth details
      if (!navigator.onLine) {
        const cached = getCachedAuthDetails();
        if (cached) {
          if (cached.role) setUserRole(cached.role);
          if (cached.name) setUserName(cached.name);
          console.log('[Offline] Using cached auth details');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!navigator.onLine) {
      return { error: new Error('Cannot sign in while offline. Please connect to the internet first.') };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore if offline */ }
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserName(null);
    clearCachedAuthDetails();
    toast.success('Logged out successfully');
  };

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false;
    return rolePermissions[userRole].includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      userName,
      isLoading,
      signIn,
      signOut,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
