import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { useAuth } from './AuthContext';
import { addMonths } from 'date-fns';

interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  total: number;
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  fetchExpenses: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const ExpensesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize with next month
  const nextMonthDate = addMonths(new Date(), 1);
  const [currentMonth, setCurrentMonth] = useState(nextMonthDate.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(nextMonthDate.getFullYear());
  
  const [total, setTotal] = useState(0);
  const cache = React.useRef<Record<string, Expense[]>>({});
  const loadingRef = React.useRef<boolean>(false);

  const fetchExpenses = useCallback(async (force = false) => {
    if (!user) return;
    
    const cacheKey = `${currentYear}-${currentMonth}`;

    if (!force && cache.current[cacheKey]) {
      setExpenses(cache.current[cacheKey]);
      const sum = cache.current[cacheKey].reduce((acc, curr) => acc + curr.amount, 0);
      setTotal(sum);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      const expensesData = data || [];
      setExpenses(expensesData);
      const sum = expensesData.reduce((acc, curr) => acc + curr.amount, 0);
      setTotal(sum);
      
      cache.current[cacheKey] = expensesData;
    }
    setLoading(false);
    loadingRef.current = false;
  }, [user, currentMonth, currentYear]);

  const invalidateCache = () => {
    cache.current = {};
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        loading,
        total,
        currentMonth,
        currentYear,
        setCurrentMonth,
        setCurrentYear,
        fetchExpenses,
        invalidateCache
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
};
