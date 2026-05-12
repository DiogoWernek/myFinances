import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Loader2, RefreshCw, X } from 'lucide-react';
import { useFixedExpenses } from '../context/FixedExpensesContext';
import { useCards } from '../context/CardsContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { formatCurrency, formatCurrencyInput, parseCurrency } from '../lib/format';

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

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      {fixedExpenses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total fixo mensal</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalFixed)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {fixedExpenses.filter(fe => fe.active).length} ativo{fixedExpenses.filter(fe => fe.active).length !== 1 ? 's' : ''}
            </p>
            {fixedExpenses.some(fe => !fe.active) && (
              <p className="text-xs text-gray-400">
                {fixedExpenses.filter(fe => !fe.active).length} pausado{fixedExpenses.filter(fe => !fe.active).length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {fixedExpenses.length === 0 && !showAddForm && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">Nenhum gasto fixo cadastrado</p>
          <p className="text-gray-500 text-sm mb-6">
            Aluguel, streaming, academia... tudo que você paga todo mês.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Adicionar Gasto Fixo
          </button>
        </div>
      )}

      {/* Fixed expenses list */}
      {fixedExpenses.map(fe => {
        const card = cards.find(c => c.id === fe.card_id);
        return (
          <div
            key={fe.id}
            className={`bg-white rounded-xl border flex items-stretch overflow-hidden transition-opacity ${fe.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
          >
            {/* Left strip */}
            <div
              className="w-1.5 shrink-0"
              style={{ backgroundColor: card ? card.color : '#f97316' }}
            />

            <div className="flex items-center justify-between gap-3 flex-1 p-4 min-w-0">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${fe.active ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <RefreshCw className={`w-5 h-5 ${fe.active ? 'text-orange-500' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold truncate ${fe.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {fe.description}
                    </p>
                    {!fe.active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Pausado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {fe.category}
                    </span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
                      Todo dia {fe.day_of_month}
                    </span>
                    {card && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                        {card.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <p className={`font-bold ${fe.active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {formatCurrency(fe.amount)}
                </p>

                {/* Toggle */}
                <button
                  onClick={() => toggleFixedExpense(fe.id, !fe.active)}
                  title={fe.active ? 'Pausar' : 'Ativar'}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${fe.active ? 'bg-primary-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${fe.active ? 'translate-x-[-1rem]' : 'translate-x-0'}`} />
                </button>

                <button
                  onClick={() => handleDelete(fe.id, fe.description)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add button */}
      {fixedExpenses.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/50 transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          Adicionar Gasto Fixo
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 border border-primary-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Novo Gasto Fixo</h4>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Aluguel, Netflix, Academia..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              autoFocus
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                  required
                  className={inputCls + ' !pl-8'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Todo dia</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                required
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + ' appearance-none'}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls + ' appearance-none'}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {cards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cartão (opcional)</label>
              <select value={cardId} onChange={e => setCardId(e.target.value)} className={inputCls + ' appearance-none'}>
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
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adding || !description.trim() || !amount || !dayOfMonth}
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

export default FixedExpensesTab;
