import React, { useMemo, useState } from 'react';
import { X, PiggyBank } from 'lucide-react';
import { formatCurrency, formatCurrencyInput, parseCurrency } from '../lib/format';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INVESTMENTS = [
  { name: 'CDB 100% CDI (Nubank)', type: 'Renda fixa', percent: 25 },
  { name: 'GGRC11', type: 'FII de galpão logístico', percent: 12.5 },
  { name: 'HGBS11', type: 'FII de shopping', percent: 12.5 },
  { name: 'ITUB4 (Itaú)', type: 'Ação', percent: 12.5 },
  { name: 'SAPR4 (Sanepar)', type: 'Ação', percent: 12.5 },
  { name: 'IVV (ETF S&P 500, pela Nomad)', type: 'Ações dos EUA', percent: 25 },
];

const InvestmentModal: React.FC<InvestmentModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const amount = parseCurrency(input);

  const rows = useMemo(() => {
    const cents = Math.round(amount * 100);
    let allocated = 0;
    return INVESTMENTS.map((inv, i) => {
      const isLast = i === INVESTMENTS.length - 1;
      // o último absorve a diferença de arredondamento para a soma bater com o total
      const value = isLast ? cents - allocated : Math.round((cents * inv.percent) / 100);
      allocated += value;
      return { ...inv, value: value / 100 };
    });
  }, [amount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="modal-bottom-sheet bg-white w-full max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-2xl sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh] shadow-xl">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-100">
              <PiggyBank className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Simular investimento</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-50 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <label className="block text-sm font-medium text-gray-500 mb-2">Quanto vou investir?</label>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={input}
              onChange={e => setInput(e.target.value ? formatCurrencyInput(e.target.value) : '')}
              className="w-full pl-11 pr-4 py-3 text-2xl font-bold rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              autoFocus
            />
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {rows.map(row => (
              <div key={row.name} className="flex items-center justify-between gap-3 p-3 bg-white">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                  <p className="text-xs text-gray-500">
                    {row.type} · {row.percent.toLocaleString('pt-BR')}%
                  </p>
                </div>
                <p className="font-bold text-gray-900 shrink-0">{formatCurrency(row.value)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <p className="font-semibold text-gray-700">Total · 100%</p>
              <p className="font-bold text-gray-900">{formatCurrency(amount)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentModal;
