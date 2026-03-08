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

const rolePermissions: Record<AppRole, string[]> = {
  admin: ['dashboard', 'pos', 'food-items', 'ingredients', 'recipes', 'store-stock', 'kitchen-stock', 'orders', 'reports', 'settings', 'staff', 'daily-costs'],
  manager: ['dashboard', 'pos', 'food-items', 'ingredients', 'recipes', 'store-stock', 'kitchen-stock', 'orders', 'reports', 'daily-costs'],
  pos_user: ['pos', 'orders'],
};

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
        
        // Defer Supabase calls with setTimeout to prevent deadlock
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
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserName(null);
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
