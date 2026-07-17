import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CreditCard, Loader2, Calendar, Clock } from 'lucide-react';
import { useCards } from '../context/CardsContext';
import { Expense } from '../types';
import { formatCurrency } from '../lib/format';

interface CardsTabProps {
  expenses: Expense[];
}

const PRESET_COLORS = [
  '#6366f1', '#22c55e', '#3b82f6', '#f97316',
  '#ec4899', '#ef4444', '#06b6d4', '#eab308',
];

const CardsTab: React.FC<CardsTabProps> = ({ expenses }) => {
  const { cards, loading, addCard, deleteCard } = useCards();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLastFour, setNewLastFour] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newClosingDay, setNewClosingDay] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [adding, setAdding] = useState(false);

  const cardTotals = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(e => {
      if (e.card_id) {
        if (!totals[e.card_id]) totals[e.card_id] = { amount: 0, count: 0 };
        totals[e.card_id].amount += e.amount;
        totals[e.card_id].count += 1;
      }
    });
    return totals;
  }, [expenses]);

  const resetForm = () => {
    setNewName('');
    setNewLastFour('');
    setNewColor(PRESET_COLORS[0]);
    setNewClosingDay('');
    setNewDueDay('');
    setShowAddForm(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addCard(
        newName.trim(),
        newColor,
        newLastFour.trim() || undefined,
        newClosingDay ? parseInt(newClosingDay) : undefined,
        newDueDay ? parseInt(newDueDay) : undefined,
      );
      resetForm();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o cartão "${name}"? Os gastos vinculados a ele não serão excluídos.`)) return;
    await deleteCard(id);
  };

  const dayInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="number"
        min="1"
        max="31"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards list */}
      {cards.length === 0 && !showAddForm ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">Nenhum cartão cadastrado</p>
          <p className="text-gray-500 text-sm mb-6">Adicione seus cartões para organizar seus gastos.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Adicionar Cartão
          </button>
        </div>
      ) : (
        <>
          {cards.map(card => {
            const stats = cardTotals[card.id] || { amount: 0, count: 0 };
            return (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-gray-100 flex items-stretch overflow-hidden"
              >
                {/* Left color strip */}
                <div className="w-1.5 shrink-0" style={{ backgroundColor: card.color }} />

                <div className="flex items-center justify-between gap-4 flex-1 p-4 min-w-0">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: card.color + '22' }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {card.name}
                        {card.last_four && (
                          <span className="text-gray-400 font-normal ml-1.5">•••• {card.last_four}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {stats.count > 0
                          ? `${formatCurrency(stats.amount)} · ${stats.count} transaç${stats.count === 1 ? 'ão' : 'ões'} este mês`
                          : 'Nenhum gasto este mês'}
                      </p>
                      {(card.closing_day || card.due_day) && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {card.closing_day && (
                            <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
                              <Calendar className="w-3 h-3" />
                              Fecha dia {card.closing_day}
                            </span>
                          )}
                          {card.due_day && (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              Vence dia {card.due_day}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(card.id, card.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/50 transition-all font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cartão
            </button>
          )}
        </>
      )}

      {/* Add card form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 border border-primary-200 shadow-sm space-y-4">
          <h4 className="font-semibold text-gray-900">Novo Cartão</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do cartão</label>
            <input
              type="text"
              placeholder="Ex: Nubank, Itaú Débito..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Últimos 4 dígitos (opcional)</label>
            <input
              type="text"
              placeholder="1234"
              maxLength={4}
              value={newLastFour}
              onChange={e => setNewLastFour(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dayInput('Dia de fechamento (opcional)', newClosingDay, setNewClosingDay, 'Ex: 6')}
            {dayInput('Dia de vencimento (opcional)', newDueDay, setNewDueDay, 'Ex: 15')}
          </div>

          <p className="text-xs text-gray-400 -mt-1">
            O dia de fechamento é usado para calcular automaticamente em qual fatura cada compra cai.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${newColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-60"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CardsTab;
