import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { useCards } from '../context/CardsContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { getCategoryMeta } from '../lib/categoryMeta';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Settings, X, Calendar, Layers, Check } from 'lucide-react';
import { formatCurrencyInput, parseCurrency } from '../lib/format';

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

const ExpenseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invalidateCache } = useExpenses();
  const { cards } = useCards();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [cardId, setCardId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [installments, setInstallments] = useState(1);
  const [showCustomInstallments, setShowCustomInstallments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para edição de parcelamento completo
  const [isInstallmentSeries, setIsInstallmentSeries] = useState(false);
  const [originalInstallmentId, setOriginalInstallmentId] = useState<string | null>(null);

  const selectedCard = useMemo(() => cards.find(c => c.id === cardId), [cards, cardId]);

  // Calcula em qual fatura a compra cairá com base no dia de fechamento do cartão
  const billingBaseDate = useMemo(() => {
    if (!date || !selectedCard?.closing_day) return null;
    const purchaseDate = new Date(date + 'T00:00:00');
    const purchaseDay = purchaseDate.getDate();
    return purchaseDay >= selectedCard.closing_day
      ? addMonths(purchaseDate, 1)
      : purchaseDate;
  }, [date, selectedCard]);

  useEffect(() => {
    if (id) fetchExpense(id);
  }, [id]);

  const fetchExpense = async (expenseId: string) => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchErr) {
      console.error('Error fetching expense:', fetchErr);
      setError('Erro ao carregar despesa.');
      setLoading(false);
      return;
    }

    if (data?.installment_id) {
      // Busca todas as parcelas da série para edição completa
      const { data: series } = await supabase
        .from('expenses')
        .select('*')
        .eq('installment_id', data.installment_id)
        .order('date', { ascending: true });

      if (series && series.length > 0) {
        const first = series[0];
        // Soma total: recalcula do valor individual × quantidade para evitar erros de float
        const totalAmount = series.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        // Remove o sufixo de parcela "(X/Y)" da descrição
        const baseDesc = first.description.replace(/\s*\(\d+\/\d+\)\s*$/, '');

        setDescription(baseDesc);
        setAmount(totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setInstallments(series.length);
        setDate(first.date); // Data da 1ª parcela
        setCategory(first.category || CATEGORIES[0]);
        setPaymentMethod(first.payment_method || PAYMENT_METHODS[0].value);
        setCardId(first.card_id || '');
        setIsInstallmentSeries(true);
        setOriginalInstallmentId(data.installment_id);
      }
    } else {
      // Gasto único — comportamento normal
      setDescription(data.description);
      setAmount(data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCategory(data.category || CATEGORIES[0]);
      setPaymentMethod(data.payment_method || PAYMENT_METHODS[0].value);
      setCardId(data.card_id || '');
      setDate(data.date);
    }

    setLoading(false);
  };

  const computeBaseDate = (purchaseDate: Date): Date => {
    if (selectedCard?.closing_day) {
      const day = purchaseDate.getDate();
      if (day >= selectedCard.closing_day) return addMonths(purchaseDate, 1);
    }
    return purchaseDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    const baseAmount = parseCurrency(amount);
    const purchaseDate = new Date(date + 'T00:00:00');
    const billedDate = computeBaseDate(purchaseDate);

    try {
      if (id && isInstallmentSeries && originalInstallmentId) {
        // ── Edição de parcelamento completo ──
        // 1. Remove todas as parcelas antigas
        const { error: deleteErr } = await supabase
          .from('expenses')
          .delete()
          .eq('installment_id', originalInstallmentId);

        if (deleteErr) throw deleteErr;

        // 2. Recria com os novos valores a partir da data da 1ª parcela
        const installmentAmount = baseAmount / installments;
        const expensesToInsert = [];

        for (let i = 0; i < installments; i++) {
          const currentDate = addMonths(billedDate, i);
          const currentDescription = installments > 1
            ? `${description} (${i + 1}/${installments})`
            : description;

          expensesToInsert.push({
            user_id: user.id,
            description: currentDescription,
            amount: installmentAmount,
            category,
            payment_method: paymentMethod,
            card_id: cardId || null,
            date: format(currentDate, 'yyyy-MM-dd'),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            // Mantém o mesmo installment_id (>1 parcela) ou nulo (reduziu pra 1x)
            installment_id: installments > 1 ? originalInstallmentId : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        const { error: insertErr } = await supabase
          .from('expenses')
          .insert(expensesToInsert);

        if (insertErr) throw insertErr;

        // Limpa cache de todos os meses (parcelas podem ter mudado de mês)
        invalidateCache();

      } else if (id) {
        // ── Edição de gasto único ──
        const expenseData = {
          user_id: user.id,
          description,
          amount: baseAmount,
          category,
          payment_method: paymentMethod,
          card_id: cardId || null,
          date: format(billedDate, 'yyyy-MM-dd'),
          month: billedDate.getMonth() + 1,
          year: billedDate.getFullYear(),
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', id);

        if (updateErr) throw updateErr;
        invalidateCache();

      } else {
        // ── Criação ──
        const installmentId = crypto.randomUUID();
        const expensesToInsert = [];

        for (let i = 0; i < installments; i++) {
          const currentDate = addMonths(billedDate, i);
          const currentDescription = installments > 1
            ? `${description} (${i + 1}/${installments})`
            : description;

          expensesToInsert.push({
            user_id: user.id,
            description: currentDescription,
            amount: baseAmount / installments,
            category,
            payment_method: paymentMethod,
            card_id: cardId || null,
            date: format(currentDate, 'yyyy-MM-dd'),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            installment_id: installments > 1 ? installmentId : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        const { error: insertErr } = await supabase
          .from('expenses')
          .insert(expensesToInsert);

        if (insertErr) throw insertErr;
        invalidateCache();
      }

      navigate('/');
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError('Erro ao salvar despesa.');
      setLoading(false);
    }
  };

  // Controle da seção de parcelas: criação OU edição de série
  const showInstallmentsSection = !id || isInstallmentSeries;

  const inputCls = 'w-full px-3.5 py-3 rounded-[13px] border outline-none transition-colors';
  const inputStyle = { background: 'var(--surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text)' };

  const pillStyle = (active: boolean, accentColor?: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '8px 13px', borderRadius: '999px',
    border: `1px solid ${active ? (accentColor || 'var(--text)') : 'var(--border)'}`,
    background: active ? (accentColor ? 'var(--surface-2)' : 'var(--text)') : 'transparent',
    color: active ? (accentColor ? 'var(--text)' : 'var(--bg)') : 'var(--text-2)',
    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  } as React.CSSProperties);

  const pageTitle = id
    ? isInstallmentSeries
      ? 'Editar Parcelamento'
      : 'Editar Despesa'
    : 'Nova Despesa';

  const pageSubtitle = id
    ? isInstallmentSeries
      ? 'Ajuste o valor total, parcelas ou data — alterações aplicadas em todas.'
      : 'Atualize os dados desta despesa.'
    : 'Preencha os dados para adicionar sua despesa.';

  return (
    <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center transition-colors" style={{ color: 'var(--text-2)' }}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para o Dashboard
          </Link>
        </div>

        <div className="rounded-[18px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-serif text-2xl" style={{ color: 'var(--text)' }}>{pageTitle}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{pageSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="p-3 rounded-xl text-sm font-medium" style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}>
                {error}
              </div>
            )}

            {/* Banner de aviso para edição de parcelamento */}
            {isInstallmentSeries && (
              <div className="flex items-start gap-3 rounded-[13px] p-4" style={{ background: 'var(--accent-soft)' }}>
                <Layers className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  <p className="font-medium">Editando parcelamento completo ({installments}x)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    O valor total será redistribuído igualmente em todas as parcelas.
                  </p>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }} htmlFor="description">
                Descrição
              </label>
              <input
                className={inputCls}
                style={inputStyle}
                id="description"
                type="text"
                placeholder="Ex: Compras do mês"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }} htmlFor="amount">
                  {isInstallmentSeries ? 'Valor Total' : 'Valor'}
                </label>
                <div className="flex items-center gap-2.5 rounded-[14px] border px-4 py-2.5" style={inputStyle}>
                  <span className="font-serif text-xl shrink-0" style={{ color: 'var(--text-3)' }}>R$</span>
                  <input
                    id="amount"
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                    required
                    className="w-full min-w-0 bg-transparent outline-none font-serif text-2xl tabular-nums"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }} htmlFor="date">
                  {isInstallmentSeries ? 'Data da 1ª Parcela' : installments > 1 ? 'Data (1ª parcela)' : 'Data da compra'}
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  id="date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold mb-2.5" style={{ color: 'var(--text-2)' }}>
                Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const meta = getCategoryMeta(cat);
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      style={pillStyle(active, meta.color)}
                    >
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: meta.color }} />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div>
              <label className="block text-xs font-semibold mb-2.5" style={{ color: 'var(--text-2)' }}>
                Forma de pagamento
              </label>
              <div className="flex gap-1.5 rounded-[13px] border p-1.5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {PAYMENT_METHODS.map(m => {
                  const active = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className="flex-1 py-2.5 rounded-[11px] text-[13px] font-semibold text-center transition-colors"
                      style={active ? { background: 'var(--text)', color: 'var(--bg)' } : { color: 'var(--text-2)' }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cartão */}
            {cards.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-2.5" style={{ color: 'var(--text-2)' }}>
                  Cartão (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCardId('')}
                    style={pillStyle(cardId === '')}
                  >
                    Sem cartão
                  </button>
                  {cards.map(card => {
                    const active = cardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setCardId(card.id)}
                        style={pillStyle(active, card.color)}
                      >
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: card.color }} />
                        {card.name}{card.last_four ? ` •••• ${card.last_four}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info de fatura */}
            {billingBaseDate && selectedCard && (
              <div className="flex items-start gap-3 rounded-[13px] p-4" style={{ background: 'var(--accent-soft)' }}>
                <Calendar className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  <p className="font-medium">
                    {isInstallmentSeries ? '1ª parcela' : 'Esta compra'} cairá na fatura de{' '}
                    <span className="font-bold capitalize">
                      {format(billingBaseDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                  </p>
                  {selectedCard.due_day && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Vencimento: dia {selectedCard.due_day}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Cartão fecha dia {selectedCard.closing_day} · Compra dia {new Date(date + 'T00:00:00').getDate()}
                  </p>
                </div>
              </div>
            )}

            {/* Parcelas — criação ou edição de série */}
            {showInstallmentsSection && (
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                    {isInstallmentSeries ? 'Número de Parcelas' : 'Parcelas'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInstallments(!showCustomInstallments);
                      if (!showCustomInstallments && installments === 1) setInstallments(2);
                    }}
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: 'var(--accent)' }}
                  >
                    {showCustomInstallments ? (
                      <><X className="w-3 h-3" /> Cancelar</>
                    ) : (
                      <><Settings className="w-3 h-3" /> Customizar</>
                    )}
                  </button>
                </div>

                {showCustomInstallments ? (
                  <div className="p-3 rounded-[13px] border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-3)' }}>Total de Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      value={installments}
                      onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {INSTALLMENT_OPTIONS.map(num => {
                      const active = installments === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setInstallments(num)}
                          className="flex-1 min-w-[60px] text-center py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={active
                            ? { border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
                            : { border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
                        >
                          {num === 1 ? 'À vista' : `${num}×`}
                        </button>
                      );
                    })}
                  </div>
                )}

                {installments > 1 && amount && (
                  <div className="flex items-center justify-between rounded-[13px] px-4 py-3 mt-3" style={{ background: 'var(--accent-soft)' }}>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>Prévia por parcela</span>
                    <span className="font-serif text-lg tabular-nums" style={{ color: 'var(--accent)' }}>
                      {installments}× de {(parseCurrency(amount) / installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-3 font-semibold rounded-[14px] border transition-colors"
                style={{ background: 'transparent', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 font-bold rounded-[14px] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {!loading && <Check className="w-4 h-4" />}
                {loading
                  ? 'Salvando...'
                  : isInstallmentSeries
                    ? 'Salvar Parcelamento'
                    : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
