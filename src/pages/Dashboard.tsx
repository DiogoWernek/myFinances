import React, { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, LogOut, ChevronLeft, ChevronRight, TrendingDown, PieChart, Settings, Wallet } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { COLORS } from '../constants';
import SettingsModal from '../components/SettingsModal';
import SavingsModal from '../components/SavingsModal';

const Dashboard: React.FC = () => {
  const { signOut } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSavingsOpen, setIsSavingsOpen] = React.useState(false);
  const { 
    expenses, 
    loading, 
    total, 
    currentMonth, 
    currentYear, 
    setCurrentMonth, 
    setCurrentYear, 
    fetchExpenses,
    invalidateCache
  } = useExpenses();

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
      // Ask user if they want to delete all related installments
      // Use a custom dialog or simple confirm for now
      // Since window.confirm only returns boolean, we might need a more complex UI for "All" vs "One"
      // For simplicity in this iteration, let's ask two questions if the first is yes
      if (window.confirm('Esta despesa faz parte de um parcelamento. Deseja excluir TODAS as parcelas relacionadas?')) {
        shouldDeleteAll = true;
      } else if (!window.confirm('Deseja excluir APENAS esta parcela?')) {
        return; // Cancelled
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
          invalidateCache(); // Clear all cache as installments might span multiple months
          fetchExpenses(true); // Reload current month
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
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const currentDateDisplay = new Date(currentYear, currentMonth - 1);

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
              <p className="text-sm text-gray-500 font-medium mb-1">Total gasto no mês</p>
              <p className="text-4xl font-bold text-gray-900 tracking-tight">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {chartData.length > 0 && (
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
                  <Tooltip 
                    formatter={(value: any) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSavingsOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Wallet className="w-5 h-5 text-green-600" />
              <span className="hidden sm:inline">Quanto economizei?</span>
              <span className="sm:hidden">Economia</span>
            </button>
            <Link
              to="/add"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nova Despesa</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando transações...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">Nenhuma despesa encontrada</p>
              <p className="text-gray-500 text-sm">Adicione sua primeira despesa para começar a controlar seus gastos.</p>
            </div>
          ) : (
            expenses.map((expense) => (
              <div 
                key={expense.id} 
                className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
              >
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
                    <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                    <p className="text-sm text-gray-500 truncate">{expense.category || 'Sem categoria'}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">
                    {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/edit/${expense.id}`} className="p-1 text-gray-400 hover:text-primary-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(expense.id, expense.installment_id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      
      <SavingsModal
        isOpen={isSavingsOpen}
        onClose={() => setIsSavingsOpen(false)}
        totalExpenses={total}
      />
    </div>
  );
};

export default Dashboard;
