import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { useCards } from '../context/CardsContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Settings, X, Calendar, Layers } from 'lucide-react';
import { formatCurrencyInput, parseCurrency } from '../lib/format';

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

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all';

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
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para o Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 bg-white">
            <h2 className="text-xl font-bold text-gray-900">{pageTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">{pageSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Banner de aviso para edição de parcelamento */}
            {isInstallmentSeries && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Editando parcelamento completo ({installments}x)</p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    O valor total será redistribuído igualmente em todas as parcelas.
                  </p>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="description">
                Descrição
              </label>
              <input
                className={inputCls + ' placeholder-gray-400'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="amount">
                  {isInstallmentSeries ? 'Valor Total' : 'Valor'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    className={inputCls + ' !pl-9 placeholder-gray-400'}
                    id="amount"
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                    required
                  />
                </div>
                {isInstallmentSeries && installments > 1 && amount && (
                  <p className="text-xs text-gray-400 mt-1">
                    {installments}x de{' '}
                    {(parseCurrency(amount) / installments).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="date">
                  {isInstallmentSeries ? 'Data da 1ª Parcela' : installments > 1 ? 'Data (1ª parcela)' : 'Data da compra'}
                </label>
                <input
                  className={inputCls}
                  id="date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Categoria + Pagamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="category">
                  Categoria
                </label>
                <select
                  className={inputCls + ' appearance-none'}
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="paymentMethod">
                  Pagamento
                </label>
                <select
                  className={inputCls + ' appearance-none'}
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Cartão */}
            {cards.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="cardId">
                  Cartão (opcional)
                </label>
                <select
                  className={inputCls + ' appearance-none'}
                  id="cardId"
                  value={cardId}
                  onChange={e => setCardId(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.name}{card.last_four ? ` •••• ${card.last_four}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info de fatura */}
            {billingBaseDate && selectedCard && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">
                    {isInstallmentSeries ? '1ª parcela' : 'Esta compra'} cairá na fatura de{' '}
                    <span className="font-bold capitalize">
                      {format(billingBaseDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                  </p>
                  {selectedCard.due_day && (
                    <p className="text-blue-600 text-xs mt-0.5">Vencimento: dia {selectedCard.due_day}</p>
                  )}
                  <p className="text-blue-500 text-xs mt-1">
                    Cartão fecha dia {selectedCard.closing_day} · Compra dia {new Date(date + 'T00:00:00').getDate()}
                  </p>
                </div>
              </div>
            )}

            {/* Parcelas — criação ou edição de série */}
            {showInstallmentsSection && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="installments">
                    {isInstallmentSeries ? 'Número de Parcelas' : 'Parcelas'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInstallments(!showCustomInstallments);
                      if (!showCustomInstallments && installments === 1) setInstallments(2);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    {showCustomInstallments ? (
                      <><X className="w-3 h-3" /> Cancelar</>
                    ) : (
                      <><Settings className="w-3 h-3" /> Customizar</>
                    )}
                  </button>
                </div>

                {showCustomInstallments ? (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Total de Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      value={installments}
                      onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                ) : (
                  <select
                    className={inputCls + ' appearance-none'}
                    id="installments"
                    value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(num => (
                      <option key={num} value={num}>
                        {num === 1 ? 'À vista (1x)' : `${num}x`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
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
