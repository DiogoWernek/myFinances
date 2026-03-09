export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  month: number;
  year: number;
  installment_id?: string;
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
