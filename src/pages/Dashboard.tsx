import React, { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { useCards } from '../context/CardsContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../lib/format';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, LogOut, ChevronLeft, ChevronRight,
  TrendingDown, PieChart, Settings, Wallet, RefreshCcw,
  Search, Filter, CreditCard,
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { COLORS, CATEGORIES, PAYMENT_METHODS } from '../constants';
import { Expense } from '../types';
import SettingsModal from '../components/SettingsModal';
import SavingsModal from '../components/SavingsModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import CardsTab from '../components/CardsTab';

type ActiveTab = 'transactions' | 'cards';

const Dashboard: React.FC = () => {
  const { signOut } = useAuth();
  const { cards } = useCards();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSavingsOpen, setIsSavingsOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<Expense | null>(null);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('transactions');
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);

  const {
    expenses,
    loading,
    total,
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    fetchExpenses,
    invalidateCache,
  } = useExpenses();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? expense.category === selectedCategory : true;
      const matchesCard =
        selectedCardId === null ? true :
        selectedCardId === '' ? !expense.card_id :
        expense.card_id === selectedCardId;
      return matchesSearch && matchesCategory && matchesCard;
    });
  }, [expenses, searchTerm, selectedCategory, selectedCardId]);

  const chartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Outros';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const handleDelete = async (id: string, installmentId?: string) => {
    let shouldDeleteAll = false;

    if (installmentId) {
      if (window.confirm('Esta despesa faz parte de um parcelamento. Deseja excluir TODAS as parcelas relacionadas?')) {
        shouldDeleteAll = true;
      } else if (!window.confirm('Deseja excluir APENAS esta parcela?')) {
        return;
      }
    } else {
      if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) {
        return;
      }
    }

    let error;

    if (shouldDeleteAll && installmentId) {
      const result = await supabase.from('expenses').delete().eq('installment_id', installmentId);
      error = result.error;
      if (!error) {
        invalidateCache();
        fetchExpenses(true);
      }
    } else {
      const result = await supabase.from('expenses').delete().eq('id', id);
      error = result.error;
      if (!error) {
        fetchExpenses(true);
      }
    }

    if (error) {
      console.error('Error deleting expense:', error);
      alert('Erro ao excluir despesa');
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); }
      else setCurrentMonth(currentMonth - 1);
    } else {
      if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); }
      else setCurrentMonth(currentMonth + 1);
    }
  };

  const currentDateDisplay = new Date(currentYear, currentMonth - 1);

  const cardFilterTotal = useMemo(() => {
    if (selectedCardId === null) return total;
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [selectedCardId, filteredExpenses, total]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary-100 p-2 rounded-lg">
              <TrendingDown className="w-5 h-5 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">myFinance</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </button>
            <button
              onClick={signOut}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation & Total */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-200/50">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-gray-900 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 min-w-[140px] text-center capitalize">
                {format(currentDateDisplay, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <button
                onClick={() => handleMonthChange('next')}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-gray-900 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center sm:text-right">
              <p className="text-sm text-gray-500 font-medium mb-1">
                {selectedCardId === null ? 'Total gasto no mês' : 'Total do filtro'}
              </p>
              <p className="text-4xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(cardFilterTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section — only on transactions tab */}
        {activeTab === 'transactions' && chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary-50 p-2 rounded-lg">
                <PieChart className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Gastos por Categoria</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab bar + actions */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Row 1: Tabs (mobile: full row) */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingDown className="w-4 h-4 shrink-0" />
              Transações
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              Cartões
              {cards.length > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {cards.length}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Action buttons — full width on mobile, side-by-side */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsSavingsOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Wallet className="w-4 h-4 text-green-600 shrink-0" />
              <span className="truncate">Quanto economizei?</span>
            </button>
            <Link
              to="/add"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Nova Despesa</span>
            </Link>
          </div>

          {/* Transactions tab filters */}
          {activeTab === 'transactions' && (
            <>
              {/* Card filter pills (only if user has cards) */}
              {cards.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCardId(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedCardId === null
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                    }`}
                  >
                    Todos
                  </button>
                  {cards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedCardId === card.id
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                      {card.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedCardId('')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedCardId === ''
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                    }`}
                  >
                    Sem cartão
                  </button>
                </div>
              )}

              {/* Search + category filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  />
                </div>
                <div className="relative min-w-[200px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">Todas as categorias</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Refresh row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchExpenses(true)}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                  title="Recarregar transações"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500">
                  {filteredExpenses.length} transaç{filteredExpenses.length === 1 ? 'ão' : 'ões'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'cards' ? (
          <CardsTab expenses={expenses} />
        ) : (
          /* Expenses List */
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando transações...</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingDown className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium mb-1">
                  {searchTerm || selectedCategory || selectedCardId !== null
                    ? 'Nenhuma despesa encontrada com estes filtros'
                    : 'Nenhuma despesa encontrada'}
                </p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || selectedCategory || selectedCardId !== null
                    ? 'Tente buscar com outros termos ou filtros.'
                    : 'Adicione sua primeira despesa para começar a controlar seus gastos.'}
                </p>
              </div>
            ) : (
              filteredExpenses.map(expense => {
                const expenseCard = cards.find(c => c.id === expense.card_id);
                return (
                <div
                  key={expense.id}
                  onClick={() => setSelectedExpense(expense)}
                  className="group bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all duration-200 flex items-stretch cursor-pointer overflow-hidden"
                >
                  {/* Borda colorida esquerda — cor do cartão */}
                  {expenseCard && (
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: expenseCard.color }} />
                  )}

                  <div className="flex items-center justify-between gap-4 flex-1 min-w-0 p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-center justify-center bg-gray-50 w-12 h-12 rounded-lg border border-gray-100 shrink-0">
                        <span className="text-xs font-bold text-gray-500 uppercase">
                          {format(new Date(expense.date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                        </span>
                        <span className="text-lg font-bold text-gray-900 leading-none">
                          {format(new Date(expense.date + 'T00:00:00'), 'dd')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                          {expense.payment_method && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                              {PAYMENT_METHODS.find(m => m.value === expense.payment_method)?.label || expense.payment_method}
                            </span>
                          )}
                          {expenseCard && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 shrink-0"
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: expenseCard.color }} />
                              {expenseCard.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{expense.category || 'Sem categoria'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                      <div
                        className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        <Link
                          to={`/edit/${expense.id}`}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(expense.id, expense.installment_id); }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <SavingsModal
        isOpen={isSavingsOpen}
        onClose={() => setIsSavingsOpen(false)}
        totalExpenses={total}
      />

      <ExpenseDetailModal
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Dashboard;
