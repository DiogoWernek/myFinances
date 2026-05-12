import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Card } from '../types';

interface CardsContextType {
  cards: Card[];
  loading: boolean;
  addCard: (name: string, color: string, lastFour?: string, closingDay?: number, dueDay?: number) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  refreshCards: () => Promise<void>;
}

const CardsContext = createContext<CardsContextType | undefined>(undefined);

export const CardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!user) { setCards([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setCards(data as Card[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const addCard = async (name: string, color: string, lastFour?: string, closingDay?: number, dueDay?: number) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cards')
      .insert({
        user_id: user.id,
        name,
        color,
        last_four: lastFour || null,
        closing_day: closingDay || null,
        due_day: dueDay || null,
      })
      .select()
      .single();
    if (!error && data) setCards(prev => [...prev, data as Card]);
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (!error) setCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CardsContext.Provider value={{ cards, loading, addCard, deleteCard, refreshCards: fetchCards }}>
      {children}
    </CardsContext.Provider>
  );
};

export const useCards = () => {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error('useCards must be used within CardsProvider');
  return ctx;
};
