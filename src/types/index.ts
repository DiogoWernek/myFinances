export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  month: number;
  year: number;
  payment_method?: string;
  installment_id?: string;
  card_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  payment_method?: string;
  card_id?: string;
  day_of_month: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type DisplayExpense = Expense & {
  is_fixed?: boolean;
  day_of_month?: number;
};

export interface Card {
  id: string;
  user_id: string;
  name: string;
  last_four?: string;
  color: string;
  closing_day?: number;
  due_day?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  salary: number;
  created_at: string;
  updated_at: string;
}
