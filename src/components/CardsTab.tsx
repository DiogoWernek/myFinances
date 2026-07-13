import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CreditCard, Loader2, Calendar, Clock } from 'lucide-react';
import { useCards } from '../context/CardsContext';
import { Expense } from '../types';
import { formatCurrency } from '../lib/format';

interface CardsTabProps {
  expenses: Expense[];
}

const PRESET_COLORS = [
  '#8B2FD6', '#FF7A00', '#3A3A3C', '#00E0A4',
  '#5B8DEF', '#FF6B8A', '#2DC6C6', '#F4B841',
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
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</label>
      <input
        type="number"
        min="1"
        max="31"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
        className="w-full px-4 py-2.5 rounded-xl border outline-none transition-colors"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cards list */}
      {cards.length === 0 && !showAddForm ? (
        <div className="text-center py-16 rounded-[22px] border border-dashed" style={{ borderColor: 'var(--border-strong)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
            <CreditCard className="w-7 h-7" style={{ color: 'var(--text-3)' }} />
          </div>
          <p className="font-serif text-xl" style={{ color: 'var(--text)' }}>Nenhum cartão cadastrado</p>
          <p className="text-sm mb-6 mt-1" style={{ color: 'var(--text-3)' }}>Adicione seus cartões para organizar seus gastos.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
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
                className="rounded-[20px] border p-4 flex items-center gap-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div
                  className="w-[58px] h-[38px] rounded-lg shrink-0 flex items-end px-1.5 pb-1.5"
                  style={{ backgroundColor: card.color }}
                >
                  <span className="w-5 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,.4)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] truncate" style={{ color: 'var(--text)' }}>
                    {card.name}
                    {card.last_four && (
                      <span className="font-medium ml-1.5" style={{ color: 'var(--text-3)' }}>•••• {card.last_four}</span>
                    )}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                    {stats.count > 0
                      ? `${formatCurrency(stats.amount)} · ${stats.count} transaç${stats.count === 1 ? 'ão' : 'ões'} este mês`
                      : 'Nenhum gasto este mês'}
                  </p>
                  {(card.closing_day || card.due_day) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {card.closing_day && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border" style={{ color: 'var(--text-2)', background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                          <Calendar className="w-3 h-3" />
                          Fecha dia {card.closing_day}
                        </span>
                      )}
                      {card.due_day && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border" style={{ color: 'var(--text-2)', background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                          <Clock className="w-3 h-3" />
                          Vence dia {card.due_day}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(card.id, card.name)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors shrink-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl font-semibold transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
            >
              <Plus className="w-4 h-4" />
              Adicionar Cartão
            </button>
          )}
        </>
      )}

      {/* Add card form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="rounded-[20px] p-5 border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h4 className="font-serif text-xl" style={{ color: 'var(--text)' }}>Novo cartão</h4>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Nome do cartão</label>
            <input
              type="text"
              placeholder="Ex: Nubank, Itaú Débito..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border outline-none transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Últimos 4 dígitos (opcional)</label>
            <input
              type="text"
              placeholder="1234"
              maxLength={4}
              value={newLastFour}
              onChange={e => setNewLastFour(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 rounded-xl border outline-none transition-colors tabular-nums"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dayInput('Dia de fechamento (opcional)', newClosingDay, setNewClosingDay, 'Ex: 6')}
            {dayInput('Dia de vencimento (opcional)', newDueDay, setNewDueDay, 'Ex: 15')}
          </div>

          <p className="text-xs -mt-1" style={{ color: 'var(--text-3)' }}>
            O dia de fechamento é usado para calcular automaticamente em qual fatura cada compra cai.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Cor</label>
            <div className="flex gap-2.5 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className="w-[30px] h-[30px] rounded-lg transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow: newColor === color ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 font-semibold rounded-xl border transition-colors"
              style={{ background: 'transparent', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
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
