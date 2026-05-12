import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { FixedExpense } from '../types';

interface FixedExpensesContextType {
  fixedExpenses: FixedExpense[];
  loading: boolean;
  addFixedExpense: (data: Omit<FixedExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  toggleFixedExpense: (id: string, active: boolean) => Promise<void>;
  refreshFixedExpenses: () => Promise<void>;
}

const FixedExpensesContext = createContext<FixedExpensesContextType | undefined>(undefined);

export const FixedExpensesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFixedExpenses = useCallback(async () => {
    if (!user) { setFixedExpenses([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setFixedExpenses(data as FixedExpense[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFixedExpenses(); }, [fetchFixedExpenses]);

  const addFixedExpense = async (data: Omit<FixedExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { data: inserted, error } = await supabase
      .from('fixed_expenses')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (!error && inserted) setFixedExpenses(prev => [...prev, inserted as FixedExpense]);
  };

  const deleteFixedExpense = async (id: string) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (!error) setFixedExpenses(prev => prev.filter(fe => fe.id !== id));
  };

  const toggleFixedExpense = async (id: string, active: boolean) => {
    const { error } = await supabase.from('fixed_expenses').update({ active }).eq('id', id);
    if (!error) setFixedExpenses(prev => prev.map(fe => fe.id === id ? { ...fe, active } : fe));
  };

  return (
    <FixedExpensesContext.Provider value={{
      fixedExpenses,
      loading,
      addFixedExpense,
      deleteFixedExpense,
      toggleFixedExpense,
      refreshFixedExpenses: fetchFixedExpenses,
    }}>
      {children}
    </FixedExpensesContext.Provider>
  );
};

export const useFixedExpenses = () => {
  const ctx = useContext(FixedExpensesContext);
  if (!ctx) throw new Error('useFixedExpenses must be used within FixedExpensesProvider');
  return ctx;
};
