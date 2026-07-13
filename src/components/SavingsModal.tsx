import React, { useState, useEffect } from 'react';
import { useUserSettings } from '../context/UserSettingsContext';
import { X, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { formatCurrency } from '../lib/format';

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalExpenses: number;
}

const POSITIVE_MESSAGES = [
  "Parabéns! Você está no caminho certo!",
  "Ótimo trabalho! Continue assim!",
  "Sua carteira agradece!",
  "Economia garantida! Que tal investir esse valor?",
  "Você é um mestre da economia!"
];

const NEGATIVE_MESSAGES = [
  "Atenção! Vamos rever os gastos?",
  "Cuidado, o orçamento estourou.",
  "Não desanime, o próximo mês será melhor!",
  "Hora de cortar alguns gastos supérfluos.",
  "Mantenha o foco, você consegue recuperar!"
];

const SavingsModal: React.FC<SavingsModalProps> = ({ isOpen, onClose, totalExpenses }) => {
  const { salary, loading } = useUserSettings();
  const [message, setMessage] = useState('');

  const savings = (salary || 0) - totalExpenses;
  const isPositive = savings >= 0;

  useEffect(() => {
    if (isOpen) {
      const messages = isPositive ? POSITIVE_MESSAGES : NEGATIVE_MESSAGES;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setMessage(randomMessage);
    }
  }, [isOpen, isPositive]);

  if (!isOpen) return null;

  const gastoPct = salary ? Math.round((totalExpenses / salary) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div
        className="modal-bottom-sheet w-full max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-t-[24px] sm:rounded-[24px] sm:max-w-md sm:max-h-[90vh] border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="flex items-center gap-2.5 font-serif text-2xl" style={{ color: 'var(--text)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: isPositive ? 'var(--accent)' : 'var(--neg)' }} />
            Quanto economizei?
          </span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
          ) : !salary ? (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="p-4 rounded-full mb-4" style={{ background: 'var(--accent-soft)' }}>
                <AlertTriangle className="w-10 h-10" style={{ color: 'var(--accent)' }} />
              </div>
              <h4 className="font-serif text-xl mb-2" style={{ color: 'var(--text)' }}>Salário não definido</h4>
              <p className="mb-2 max-w-xs mx-auto text-sm" style={{ color: 'var(--text-2)' }}>
                Seu salário ainda não foi cadastrado. Clique no botão de configurações <Settings className="w-4 h-4 inline mx-1" /> no cabeçalho para configurar!
              </p>
            </div>
          ) : (
            <>
              <div className="text-center rounded-[18px] p-6 mb-5" style={{ background: 'var(--accent-soft)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Saldo do mês</p>
                <p className="font-serif text-4xl sm:text-5xl leading-tight mt-1 tabular-nums" style={{ color: isPositive ? 'var(--accent)' : 'var(--neg)' }}>
                  {formatCurrency(savings)}
                </p>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-2)' }}>{message}</p>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-semibold" style={{ color: 'var(--text-2)' }}>Salário</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(salary)}</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-2.5 rounded-full" style={{ background: 'var(--accent)', width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-semibold" style={{ color: 'var(--text-2)' }}>Gastos ({gastoPct}%)</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-2.5 rounded-full" style={{ background: 'var(--neg)', width: `${clampPct(gastoPct)}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsModal;
