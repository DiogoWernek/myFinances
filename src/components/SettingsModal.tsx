import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../context/UserSettingsContext';
import { X, Save, Loader2, CreditCard, Calendar } from 'lucide-react';
import { formatCurrencyInput, parseCurrency } from '../lib/format';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { salary: contextSalary, updateSalary, loading: contextLoading } = useUserSettings();
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && contextSalary !== null) {
      setSalary(contextSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [isOpen, contextSalary]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const numericSalary = parseCurrency(salary);

    try {
      await updateSalary(numericSalary);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-[24px] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-serif text-2xl" style={{ color: 'var(--text)' }}>Configurações</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div>
            <label htmlFor="salary" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
              Salário mensal
            </label>
            <div className="flex items-center gap-2.5 rounded-[14px] border px-4 py-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)' }}>
              <span className="font-serif text-2xl shrink-0" style={{ color: 'var(--text-3)' }}>R$</span>
              <input
                type="text"
                id="salary"
                required
                value={salary}
                onChange={(e) => setSalary(formatCurrencyInput(e.target.value))}
                className="w-full min-w-0 bg-transparent outline-none font-serif text-2xl tabular-nums"
                style={{ color: 'var(--text)' }}
                placeholder="0,00"
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
              Usado para calcular seu saldo do mês.
            </p>
          </div>

          <div className="flex flex-col gap-2 my-6">
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-[13px] border opacity-60"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                <CreditCard className="w-4 h-4" />
                Moeda &amp; formato
              </span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--text-3)', background: 'var(--bg-2)' }}>Em breve</span>
            </div>
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-[13px] border opacity-60"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                <Calendar className="w-4 h-4" />
                Lembretes de fatura
              </span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--text-3)', background: 'var(--bg-2)' }}>Em breve</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
              style={{ background: 'transparent', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || contextLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
