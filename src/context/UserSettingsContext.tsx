import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface UserSettingsContextType {
  salary: number | null;
  loading: boolean;
  updateSalary: (newSalary: number) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const UserSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [salary, setSalary] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchedUserId = React.useRef<string | null>(null);

  const fetchSettings = useCallback(async (force = false) => {
    if (!user) {
      setSalary(null);
      lastFetchedUserId.current = null;
      return;
    }

    // Avoid unnecessary fetches if user ID hasn't changed
    if (!force && user.id === lastFetchedUserId.current) {
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('user_settings')
      .select('salary')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setSalary(data.salary);
    } else {
      setSalary(null);
    }
    
    lastFetchedUserId.current = user.id;
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSalary = async (newSalary: number) => {
    if (!user) return;

    // Optimistic update
    setSalary(newSalary);
    
    // Ensure we don't re-fetch immediately after update
    lastFetchedUserId.current = user.id;

    const { data: existingData } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existingData) {
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ salary: newSalary, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          salary: newSalary,
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating salary:', error);
      // Revert on error
      fetchSettings(true);
      throw error;
    }
  };

  return (
    <UserSettingsContext.Provider
      value={{
        salary,
        loading,
        updateSalary,
        refreshSettings: () => fetchSettings(true)
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};
