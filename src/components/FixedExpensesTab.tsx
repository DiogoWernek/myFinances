import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Loader2, RefreshCw, X } from 'lucide-react';
import { useFixedExpenses } from '../context/FixedExpensesContext';
import { useCards } from '../context/CardsContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { formatCurrency, formatCurrencyInput, parseCurrency } from '../lib/format';
import { getCategoryMeta } from '../lib/categoryMeta';
import Switch from './Switch';

const FixedExpensesTab: React.FC = () => {
  const { fixedExpenses, loading, addFixedExpense, deleteFixedExpense, toggleFixedExpense } = useFixedExpenses();
  const { cards } = useCards();

  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [cardId, setCardId] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [adding, setAdding] = useState(false);

  const totalFixed = useMemo(() =>
    fixedExpenses.filter(fe => fe.active).reduce((sum, fe) => sum + fe.amount, 0),
    [fixedExpenses]
  );

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory(CATEGORIES[0]);
    setPaymentMethod(PAYMENT_METHODS[0].value);
    setCardId('');
    setDayOfMonth('');
    setShowAddForm(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(dayOfMonth);
    if (!description.trim() || !amount || !day || day < 1 || day > 31) return;

    setAdding(true);
    try {
      await addFixedExpense({
        description: description.trim(),
        amount: parseCurrency(amount),
        category,
        payment_method: paymentMethod,
        card_id: cardId || undefined,
        day_of_month: day,
        active: true,
      });
      resetForm();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!window.confirm(`Remover "${desc}" dos gastos fixos?`)) return;
    await deleteFixedExpense(id);
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border outline-none transition-colors';
  const inputStyle = { background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  const activeCount = fixedExpenses.filter(fe => fe.active).length;
  const pausedCount = fixedExpenses.filter(fe => !fe.active).length;

  return (
    <div className="space-y-3">
      {/* Summary card */}
      {fixedExpenses.length > 0 && (
        <div className="rounded-[20px] border p-5 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Total fixo mensal</p>
            <p className="font-serif text-3xl mt-1.5 tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(totalFixed)}</p>
          </div>
          <div className="flex gap-2.5">
            <div className="text-center rounded-xl px-4 py-2.5" style={{ background: 'var(--accent-soft)' }}>
              <div className="font-serif text-xl" style={{ color: 'var(--accent)' }}>{activeCount}</div>
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>Ativos</div>
            </div>
            {pausedCount > 0 && (
              <div className="text-center rounded-xl px-4 py-2.5" style={{ background: 'var(--surface-2)' }}>
                <div className="font-serif text-xl" style={{ color: 'var(--text-3)' }}>{pausedCount}</div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>Pausados</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {fixedExpenses.length === 0 && !showAddForm && (
        <div className="text-center py-16 rounded-[22px] border border-dashed" style={{ borderColor: 'var(--border-strong)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
            <RefreshCw className="w-7 h-7" style={{ color: 'var(--text-3)' }} />
          </div>
          <p className="font-serif text-xl" style={{ color: 'var(--text)' }}>Nenhum gasto fixo cadastrado</p>
          <p className="text-sm mb-6 mt-1" style={{ color: 'var(--text-3)' }}>
            Aluguel, streaming, academia... tudo que você paga todo mês.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Gasto Fixo
          </button>
        </div>
      )}

      {/* Fixed expenses list */}
      {fixedExpenses.length > 0 && (
        <div className="flex flex-col gap-2 sm:gap-0 sm:rounded-[20px] sm:border sm:px-5 sm:bg-[var(--surface)] border-[var(--border)]">
          {fixedExpenses.map((fe, idx) => {
            const card = cards.find(c => c.id === fe.card_id);
            const meta = getCategoryMeta(fe.category);
            const Icon = meta.Icon;
            const isLast = idx === fixedExpenses.length - 1;
            return (
              <div
                key={fe.id}
                className={`flex items-center gap-3 sm:gap-3.5 rounded-[15px] border p-3 bg-[var(--surface)] sm:rounded-none sm:border-x-0 sm:border-t-0 sm:p-0 sm:py-3.5 sm:bg-transparent border-[var(--border)] ${isLast ? 'sm:border-b-0' : 'sm:border-b'}`}
                style={{ opacity: fe.active ? 1 : 0.5 }}
              >
                <span
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--surface-2)', color: meta.color }}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text)' }}>
                      {fe.description}
                    </p>
                    {!fe.active && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>Pausado</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {fe.category} · todo dia {fe.day_of_month}{card ? ` · ${card.name}` : ''}
                  </p>
                </div>
                <p className="font-bold text-[15px] tabular-nums shrink-0" style={{ color: 'var(--text)' }}>
                  {formatCurrency(fe.amount)}
                </p>
                <Switch
                  checked={fe.active}
                  onChange={() => toggleFixedExpense(fe.id, !fe.active)}
                  title={fe.active ? 'Pausar' : 'Ativar'}
                />
                <button
                  onClick={() => handleDelete(fe.id, fe.description)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
                  style={{ color: 'var(--text-3)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      {fixedExpenses.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl font-semibold transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
        >
          <Plus className="w-4 h-4" />
          Adicionar Gasto Fixo
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="rounded-[20px] p-5 border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-xl" style={{ color: 'var(--text)' }}>Novo gasto fixo</h4>
            <button type="button" onClick={resetForm} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Descrição</label>
            <input
              type="text"
              placeholder="Ex: Aluguel, Netflix, Academia..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              autoFocus
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Valor</label>
              <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={inputStyle}>
                <span className="font-medium text-sm shrink-0" style={{ color: 'var(--text-3)' }}>R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                  required
                  className="w-full min-w-0 bg-transparent outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Todo dia</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                required
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls} style={inputStyle}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls} style={inputStyle}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {cards.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Cartão (opcional)</label>
              <select value={cardId} onChange={e => setCardId(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Nenhum</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.last_four ? ` •••• ${c.last_four}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={adding || !description.trim() || !amount || !dayOfMonth}
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

export default FixedExpensesTab;
