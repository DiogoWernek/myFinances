import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { format, addMonths } from 'date-fns';
import { ArrowLeft, Settings, X } from 'lucide-react';
import { formatCurrencyInput, parseCurrency } from '../lib/format';

const ExpenseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invalidateCache } = useExpenses();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [installments, setInstallments] = useState(1);
  const [showCustomInstallments, setShowCustomInstallments] = useState(false);
  const [payNextMonth, setPayNextMonth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchExpense(id);
    }
  }, [id]);

  const fetchExpense = async (expenseId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (error) {
      console.error('Error fetching expense:', error);
      setError('Erro ao carregar despesa.');
    } else if (data) {
      setDescription(data.description);
      setAmount(data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCategory(data.category || CATEGORIES[0]);
      setPaymentMethod(data.payment_method || PAYMENT_METHODS[0].value);
      setDate(data.date);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    const baseAmount = parseCurrency(amount);
    const installmentAmount = installments > 1 ? baseAmount / installments : baseAmount;

    try {
      if (id) {
        // Edit mode - no installments logic for simplicity, just update the single expense
        const expenseData = {
          user_id: user.id,
          description,
          amount: baseAmount,
          category,
          payment_method: paymentMethod,
          date,
          month: new Date(date).getMonth() + 1,
          year: new Date(date).getFullYear(),
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', id);

        if (updateError) throw updateError;

      } else {
        // Create mode - handle installments
        const expensesToInsert = [];
        // Calculate the base date (date of the 1st installment)
        // If payNextMonth is true, start from next month
        const baseDate = payNextMonth ? addMonths(new Date(date), 1) : new Date(date);
        const installmentId = crypto.randomUUID();

        for (let i = 0; i < installments; i++) {
          const currentInstallmentDate = addMonths(baseDate, i);
          const currentDescription = installments > 1 
            ? `${description} (${i + 1}/${installments})` 
            : description;

          expensesToInsert.push({
            user_id: user.id,
            description: currentDescription,
            amount: installmentAmount,
            category,
            payment_method: paymentMethod,
            date: format(currentInstallmentDate, 'yyyy-MM-dd'),
            month: currentInstallmentDate.getMonth() + 1,
            year: currentInstallmentDate.getFullYear(),
            installment_id: installments > 1 ? installmentId : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        const { error: insertError } = await supabase
          .from('expenses')
          .insert(expensesToInsert);

        if (insertError) throw insertError;
      }

      invalidateCache();
      navigate('/');
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError('Erro ao salvar despesa.');
      setLoading(false);
    }
  };

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
            <h2 className="text-xl font-bold text-gray-900">
              {id ? 'Editar Despesa' : 'Nova Despesa'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Preencha os dados abaixo para {id ? 'atualizar' : 'adicionar'} sua despesa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="description">
                Descrição
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400"
                id="description"
                type="text"
                placeholder="Ex: Compras do mês"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="amount">
                  Valor
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    id="amount"
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="date">
                  Data {installments > 1 ? '(1ª parcela)' : ''}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="category">
                  Categoria
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="paymentMethod">
                  Método de Pagamento
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none"
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
            {!id && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="installments">
                    Parcelas
                  </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInstallments(!showCustomInstallments);
                        if (!showCustomInstallments) {
                          // When opening custom mode, ensure we have valid values
                          if (installments === 1) setInstallments(2);
                        }
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      {showCustomInstallments ? (
                        <>
                          <X className="w-3 h-3" /> Cancelar
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3" /> Customizar
                        </>
                      )}
                    </button>
                  </div>

                  {showCustomInstallments ? (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Total de Parcelas</label>
                        <input
                          type="number"
                          min="2"
                          value={installments}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 2;
                            setInstallments(val);
                          }}
                          className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none"
                      id="installments"
                      value={installments}
                      onChange={(e) => {
                        setInstallments(parseInt(e.target.value));
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                        <option key={num} value={num}>
                          {num === 1 ? 'À vista (1x)' : `${num}x`}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="mt-3 flex items-center">
                    <input
                      id="payNextMonth"
                      type="checkbox"
                      checked={payNextMonth}
                      onChange={(e) => setPayNextMonth(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="payNextMonth" className="ml-2 block text-sm text-gray-700">
                      Cobrar 1ª parcela no próximo mês
                    </label>
                  </div>
                </div>
              )}
            </div>

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
                {loading ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
