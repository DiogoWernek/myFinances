import React from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, CreditCard, Layers, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayExpense } from '../types';
import { useCards } from '../context/CardsContext';
import { PAYMENT_METHODS } from '../constants';
import { formatCurrency } from '../lib/format';
import { getCategoryMeta } from '../lib/categoryMeta';

interface ExpenseDetailModalProps {
  expense: DisplayExpense | null;
  onClose: () => void;
  onDelete: (id: string, installmentId?: string) => void;
}

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({ expense, onClose, onDelete }) => {
  const { cards } = useCards();

  if (!expense) return null;

  const card = cards.find(c => c.id === expense.card_id);
  const paymentLabel = PAYMENT_METHODS.find(m => m.value === expense.payment_method)?.label || expense.payment_method;
  const meta = getCategoryMeta(expense.category);
  const CatIcon = meta.Icon;
  const formattedDate = format(new Date(expense.date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleDelete = () => {
    onClose();
    onDelete(expense.id, expense.installment_id);
  };

  const row = (Icon: React.ElementType, label: string, content: React.ReactNode) => (
    <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </span>
      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{content}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-bottom-sheet w-full max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] sm:rounded-[24px] sm:max-w-md sm:max-h-[90vh] border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-11 h-[5px] rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* Header: icon + description */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span
                className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--surface-2)', color: meta.color }}
              >
                <CatIcon className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-lg truncate" style={{ color: 'var(--text)' }}>{expense.description}</p>
                <p className="text-sm truncate" style={{ color: 'var(--text-3)' }}>{expense.category || 'Sem categoria'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors shrink-0"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Amount */}
          <p className="font-serif text-[36px] sm:text-[46px] leading-none mb-5 tabular-nums break-words" style={{ color: 'var(--text)' }}>
            {formatCurrency(expense.amount)}
          </p>

          {/* Info rows */}
          <div className="flex flex-col border-t mb-5" style={{ borderColor: 'var(--border)' }}>
            {row(Calendar, 'Data', <span className="capitalize">{formattedDate}</span>)}
            {expense.payment_method && row(CreditCard, 'Forma', paymentLabel)}
            {card && row(CreditCard, 'Cartão', `${card.name}${card.last_four ? ` •••• ${card.last_four}` : ''}`)}
            {expense.installment_id && row(Layers, 'Parcelamento', 'Despesa parcelada')}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-[14px] transition-colors"
              style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
            <Link
              to={`/edit/${expense.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-[14px] border transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;
