import React from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Tag, CreditCard, Layers, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayExpense } from '../types';
import { useCards } from '../context/CardsContext';
import { PAYMENT_METHODS } from '../constants';
import { formatCurrency } from '../lib/format';

interface ExpenseDetailModalProps {
  expense: DisplayExpense | null;
  onClose: () => void;
  onDelete: (id: string, installmentId?: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Tech': 'bg-blue-100 text-blue-800',
  'Alimentação': 'bg-orange-100 text-orange-800',
  'Lazer': 'bg-purple-100 text-purple-800',
  'Viagem': 'bg-cyan-100 text-cyan-800',
  'Transporte': 'bg-yellow-100 text-yellow-800',
  'Outros': 'bg-gray-100 text-gray-800',
  'Saúde': 'bg-red-100 text-red-800',
};

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({ expense, onClose, onDelete }) => {
  const { cards } = useCards();

  if (!expense) return null;

  const card = cards.find(c => c.id === expense.card_id);
  const paymentLabel = PAYMENT_METHODS.find(m => m.value === expense.payment_method)?.label || expense.payment_method;
  const categoryClass = CATEGORY_COLORS[expense.category] || 'bg-gray-100 text-gray-800';
  const formattedDate = format(new Date(expense.date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleDelete = () => {
    onClose();
    onDelete(expense.id, expense.installment_id);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-bottom-sheet bg-white w-full max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-t-2xl sm:rounded-2xl sm:max-w-md sm:max-h-[90vh] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary-50 p-2 rounded-lg">
              <Tag className="w-4 h-4 text-primary-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Detalhes da Despesa</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Amount + Description */}
          <div className="text-center pb-1">
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(expense.amount)}</p>
            <p className="text-gray-600 mt-1 font-medium">{expense.description}</p>
          </div>

          {/* Info grid */}
          <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Data</p>
                <p className="text-sm text-gray-900 font-semibold capitalize">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Categoria</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${categoryClass}`}>
                  {expense.category || 'Sem categoria'}
                </span>
              </div>
            </div>

            {expense.payment_method && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pagamento</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 bg-green-100 text-green-800">
                    {paymentLabel}
                  </span>
                </div>
              </div>
            )}

            {card && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Cartão</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                    <p className="text-sm text-gray-900 font-semibold">
                      {card.name}{card.last_four ? ` •••• ${card.last_four}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {expense.installment_id && (
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Parcelamento</p>
                  <p className="text-sm text-gray-900 font-semibold">Despesa parcelada</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl border border-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
            <Link
              to={`/edit/${expense.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
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
