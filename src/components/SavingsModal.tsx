import React, { useState, useEffect } from 'react';
import { useUserSettings } from '../context/UserSettingsContext';
import { X, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { formatCurrency } from '../lib/format';

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
              {isPositive ? (
                <TrendingUp className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
              ) : (
                <AlertTriangle className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Quanto economizei?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-50 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 text-center">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : !salary ? (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="bg-yellow-100 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Salário não definido</h4>
              <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                Seu salário ainda não foi cadastrado. Clique no botão de configurações <Settings className="w-4 h-4 inline mx-1" /> no cabeçalho para configurar!
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-500 mb-2 font-medium">Seu resultado este mês</p>
              <div className={`text-4xl font-bold mb-6 tracking-tight ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(savings)}
              </div>
              
              <div className={`p-4 rounded-xl mb-6 ${isPositive ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <p className={`font-medium ${isPositive ? 'text-green-800' : 'text-red-800'}`}>
                  {message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Salário</p>
                  <p className="text-gray-900 font-semibold">
                    {formatCurrency(salary || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Gastos</p>
                  <p className="text-red-600 font-semibold">
                    {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
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
