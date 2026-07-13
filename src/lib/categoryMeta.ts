import { Laptop, Utensils, Gamepad2, Plane, Car, HeartPulse, Tag, LucideIcon } from 'lucide-react';

interface CategoryMeta {
  color: string;
  Icon: LucideIcon;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  'Tech': { color: '#5B8DEF', Icon: Laptop },
  'Alimentação': { color: '#FF8A5B', Icon: Utensils },
  'Lazer': { color: '#B57BFF', Icon: Gamepad2 },
  'Viagem': { color: '#2DC6C6', Icon: Plane },
  'Transporte': { color: '#F4B841', Icon: Car },
  'Saúde': { color: '#FF6B8A', Icon: HeartPulse },
  'Outros': { color: '#9AA0A6', Icon: Tag },
};

const FALLBACK_META: CategoryMeta = { color: '#9AA0A6', Icon: Tag };

export const getCategoryMeta = (category?: string | null): CategoryMeta =>
  (category && CATEGORY_META[category]) || FALLBACK_META;

export const CATEGORY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([k, v]) => [k, v.color])
);
