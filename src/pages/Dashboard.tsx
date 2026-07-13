import React, { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { useCards } from '../context/CardsContext';
import { useFixedExpenses } from '../context/FixedExpensesContext';
import { useUserSettings } from '../context/UserSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../lib/format';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, LogOut, ChevronLeft, ChevronRight,
  TrendingUp, Settings, RefreshCcw, Sun, Moon,
  Search, CreditCard, RefreshCw, List, Repeat1,
} from 'lucide-react';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CATEGORIES, PAYMENT_METHODS } from '../constants';
import { DisplayExpense } from '../types';
import SettingsModal from '../components/SettingsModal';
import SavingsModal from '../components/SavingsModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import CardsTab from '../components/CardsTab';
import FixedExpensesTab from '../components/FixedExpensesTab';
import DonutChart from '../components/DonutChart';

type ActiveTab = 'transactions' | 'cards' | 'fixed';

const Dashboard: React.FC = () => {
  const { signOut } = useAuth();
  const { cards } = useCards();
  const { fixedExpenses } = useFixedExpenses();
  const { salary } = useUserSettings();
  const { isDark, toggleTheme } = useTheme();

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSavingsOpen, setIsSavingsOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<DisplayExpense | null>(null);
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

  // Gera entradas virtuais para os gastos fixos no mês corrente
  const virtualFixedExpenses = useMemo((): DisplayExpense[] => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    return fixedExpenses
      .filter(fe => fe.active)
      .map(fe => {
        const day = Math.min(fe.day_of_month, daysInMonth);
        const mm = String(currentMonth).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        return {
          id: `fixed_${fe.id}`,
          user_id: fe.user_id,
          description: fe.description,
          amount: fe.amount,
          category: fe.category,
          payment_method: fe.payment_method,
          card_id: fe.card_id,
          date: dateStr,
          month: currentMonth,
          year: currentYear,
          installment_id: undefined,
          created_at: dateStr,
          updated_at: dateStr,
          is_fixed: true,
          day_of_month: fe.day_of_month,
        };
      });
  }, [fixedExpenses, currentMonth, currentYear]);

  // Mesclagem: despesas reais + gastos fixos virtuais, ordenados por data desc
  const allDisplayExpenses = useMemo((): DisplayExpense[] => {
    const real: DisplayExpense[] = expenses.map(e => ({ ...e }));
    return [...real, ...virtualFixedExpenses].sort(
      (a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime()
    );
  }, [expenses, virtualFixedExpenses]);

  const filteredExpenses = useMemo((): DisplayExpense[] => {
    return allDisplayExpenses.filter(expense => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? expense.category === selectedCategory : true;
      const matchesCard =
        selectedCardId === null ? true :
        selectedCardId === '' ? !expense.card_id :
        expense.card_id === selectedCardId;
      return matchesSearch && matchesCategory && matchesCard;
    });
  }, [allDisplayExpenses, searchTerm, selectedCategory, selectedCardId]);

  // Total incluindo gastos fixos
  const fixedTotal = useMemo(
    () => virtualFixedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [virtualFixedExpenses]
  );
  const combinedTotal = total + fixedTotal;

  // Total exibido no header (respeita filtro de cartão)
  const displayTotal = useMemo(() => {
    if (selectedCardId === null) return combinedTotal;
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [selectedCardId, filteredExpenses, combinedTotal]);

  const saldo = (salary ?? 0) - combinedTotal;
  const saldoIsPositive = saldo >= 0;

  const chartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    allDisplayExpenses.forEach(expense => {
      const category = expense.category || 'Outros';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ id: name, label: name, value, color: getCategoryMeta(name).color }))
      .sort((a, b) => b.value - a.value);
  }, [allDisplayExpenses]);

  const handleDelete = async (id: string, installmentId?: string) => {
    let shouldDeleteAll = false;

    if (installmentId) {
      if (window.confirm('Esta despesa faz parte de um parcelamento. Deseja excluir TODAS as parcelas relacionadas?')) {
        shouldDeleteAll = true;
      } else if (!window.confirm('Deseja excluir APENAS esta parcela?')) {
        return;
      }
    } else {
      if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
    }

    let error;
    if (shouldDeleteAll && installmentId) {
      const result = await supabase.from('expenses').delete().eq('installment_id', installmentId);
      error = result.error;
      if (!error) { invalidateCache(); fetchExpenses(true); }
    } else {
      const result = await supabase.from('expenses').delete().eq('id', id);
      error = result.error;
      if (!error) fetchExpenses(true);
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

  const tabBtn = (tab: ActiveTab, label: string, Icon: React.ElementType, badge?: number) => (
    <button
      onClick={() => setActiveTab(tab)}
      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[11px] text-sm font-semibold transition-all"
      style={
        activeTab === tab
          ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }
          : { background: 'transparent', color: 'var(--text-2)' }
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  const pill = (active: boolean) =>
    active
      ? 'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all'
      : 'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border';

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-serif italic text-lg" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              m
            </div>
            <h1 className="font-serif text-xl" style={{ color: 'var(--text)' }}>
              <span className="italic">my</span>Finance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Tema claro' : 'Tema escuro'}
              className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </button>
            <button
              onClick={signOut}
              className="text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation & Total */}
        <div className="rounded-[22px] border p-4 sm:p-6 mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleMonthChange('prev')}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all shrink-0"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-[120px] sm:min-w-[150px] text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Período</p>
                <h2 className="font-serif text-xl sm:text-2xl mt-0.5 capitalize" style={{ color: 'var(--text)' }}>
                  {format(currentDateDisplay, 'MMMM yyyy', { locale: ptBR })}
                </h2>
              </div>
              <button
                onClick={() => handleMonthChange('next')}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all shrink-0"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex items-end justify-between gap-5 flex-wrap" style={{ borderColor: 'var(--border)' }}>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                {selectedCardId === null ? 'Total gasto no período' : 'Total do filtro'}
              </p>
              <p className="font-serif text-[34px] sm:text-[44px] md:text-[60px] leading-none mt-2 tabular-nums break-words" style={{ color: 'var(--text)' }}>
                {formatCurrency(displayTotal)}
              </p>
              {fixedTotal > 0 && selectedCardId === null && (
                <p className="text-xs font-medium mt-2" style={{ color: 'var(--neg)' }}>
                  Inclui {formatCurrency(fixedTotal)} em gastos fixos
                </p>
              )}
            </div>
            {salary !== null && selectedCardId === null && (
              <div className="text-right min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Saldo do mês</p>
                <p className="font-serif text-xl sm:text-2xl md:text-3xl mt-1.5 tabular-nums break-words" style={{ color: saldoIsPositive ? 'var(--accent)' : 'var(--neg)' }}>
                  {saldoIsPositive ? '+ ' : '− '}{formatCurrency(Math.abs(saldo))}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Salário {formatCurrency(salary)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs + actions */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex gap-1.5 rounded-[15px] border p-1.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            {tabBtn('transactions', 'Transações', List)}
            {tabBtn('cards', 'Cartões', CreditCard, cards.length || undefined)}
            {tabBtn('fixed', 'Fixos', Repeat1, fixedExpenses.filter(fe => fe.active).length || undefined)}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setIsSavingsOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl font-semibold border transition-all active:scale-95"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text)', background: 'transparent' }}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">Quanto economizei?</span>
            </button>
            <Link
              to="/add"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl font-bold transition-all active:scale-95"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Nova Despesa</span>
            </Link>
          </div>

          {/* Filtros — só na aba Transações */}
          {activeTab === 'transactions' && (
            <>
              {/* Card filter pills */}
              {cards.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCardId(null)}
                    className={pill(selectedCardId === null)}
                    style={selectedCardId === null
                      ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                      : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border)' }}
                  >
                    Todos
                  </button>
                  {cards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`${pill(selectedCardId === card.id)} inline-flex items-center gap-1.5`}
                      style={selectedCardId === card.id
                        ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                        : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border)' }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                      {card.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedCardId('')}
                    className={pill(selectedCardId === '')}
                    style={selectedCardId === ''
                      ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                      : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border)' }}
                  >
                    Sem cartão
                  </button>
                </div>
              )}

              {/* Search + category */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div
                  className="relative flex-1 flex items-center gap-2.5 rounded-[13px] border px-3.5 py-2.5"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 bg-transparent outline-none text-[14px]"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="rounded-[13px] border px-3.5 py-2.5 text-[14px] font-medium cursor-pointer outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Refresh + count */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchExpenses(true)}
                  className="p-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  title="Recarregar"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {filteredExpenses.length} transaç{filteredExpenses.length === 1 ? 'ão' : 'ões'}
                  {virtualFixedExpenses.length > 0 && (
                    <span style={{ color: 'var(--neg)' }}> · {virtualFixedExpenses.length} fixo{virtualFixedExpenses.length !== 1 ? 's' : ''}</span>
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'cards' && <CardsTab expenses={expenses} />}

        {activeTab === 'fixed' && <FixedExpensesTab />}

        {activeTab === 'transactions' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
            {/* Donut — só quando há dados */}
            {chartData.length > 0 && (
              <div className="rounded-[22px] border p-6 order-first lg:order-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
                  Gastos por categoria
                </p>
                <DonutChart data={chartData} wrapperClassName="w-[180px] h-[180px] mx-auto" />
              </div>
            )}

            <div className={chartData.length === 0 ? 'lg:col-span-2' : ''}>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
                  <p style={{ color: 'var(--text-3)' }}>Carregando transações...</p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-16 rounded-[22px] border border-dashed" style={{ borderColor: 'var(--border-strong)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                    <Search className="w-7 h-7" style={{ color: 'var(--text-3)' }} />
                  </div>
                  <p className="font-serif text-xl" style={{ color: 'var(--text-2)' }}>Nada por aqui</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                    {searchTerm || selectedCategory || selectedCardId !== null
                      ? 'Nenhuma despesa encontrada com estes filtros.'
                      : 'Adicione sua primeira despesa para começar.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:gap-0 sm:rounded-[22px] sm:border sm:px-5 sm:bg-[var(--surface)] border-[var(--border)]">
                  {filteredExpenses.map((expense, idx) => {
                    const expenseCard = cards.find(c => c.id === expense.card_id);
                    const meta = getCategoryMeta(expense.category);
                    const CatIcon = meta.Icon;
                    const isLast = idx === filteredExpenses.length - 1;
                    return (
                      <div
                        key={expense.id}
                        onClick={() => {
                          if (expense.is_fixed) {
                            setActiveTab('fixed');
                          } else {
                            setSelectedExpense(expense);
                          }
                        }}
                        className={`group flex items-center gap-3.5 cursor-pointer rounded-[15px] border p-3 bg-[var(--surface)] sm:rounded-none sm:border-x-0 sm:border-t-0 sm:p-0 sm:py-3.5 sm:bg-transparent border-[var(--border)] ${isLast ? 'sm:border-b-0' : 'sm:border-b'}`}
                      >
                        <span className="w-1 h-10 rounded shrink-0" style={{ background: expenseCard ? expenseCard.color : (expense.is_fixed ? 'var(--neg)' : meta.color) }} />

                        <div className="text-center min-w-[34px] shrink-0">
                          {expense.is_fixed ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mx-auto" style={{ color: 'var(--neg)' }} />
                              <div className="font-serif text-lg leading-none mt-0.5" style={{ color: 'var(--text)' }}>
                                {String(expense.day_of_month).padStart(2, '0')}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                                {format(new Date(expense.date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                              </div>
                              <div className="font-serif text-lg leading-none" style={{ color: 'var(--text)' }}>
                                {format(new Date(expense.date + 'T00:00:00'), 'dd')}
                              </div>
                            </>
                          )}
                        </div>

                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--surface-2)', color: meta.color }}
                        >
                          <CatIcon className="w-[18px] h-[18px]" />
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text)' }}>{expense.description}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{expense.category || 'Sem categoria'}</span>
                            {expense.is_fixed && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}>
                                Fixo
                              </span>
                            )}
                            {expense.payment_method && !expense.is_fixed && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                {PAYMENT_METHODS.find(m => m.value === expense.payment_method)?.label || expense.payment_method}
                              </span>
                            )}
                            {expenseCard && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: expenseCard.color }} />
                                {expenseCard.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-[15px] tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(expense.amount)}</p>
                          {expense.is_fixed ? (
                            <p className="text-xs mt-1" style={{ color: 'var(--neg)' }}>Dia {expense.day_of_month}</p>
                          ) : (
                            <div
                              className="flex justify-end gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => e.stopPropagation()}
                            >
                              <Link
                                to={`/edit/${expense.id}`}
                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                                style={{ color: 'var(--text-3)' }}
                                onClick={e => e.stopPropagation()}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(expense.id, expense.installment_id); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                                style={{ color: 'var(--text-3)' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <SavingsModal
        isOpen={isSavingsOpen}
        onClose={() => setIsSavingsOpen(false)}
        totalExpenses={combinedTotal}
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
