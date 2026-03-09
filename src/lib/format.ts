export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove currency symbol, spaces, and dots (thousands separator)
  const cleanValue = value.replace(/[^\d,]/g, '').replace(/\./g, '');
  // Replace comma with dot for float parsing
  return parseFloat(cleanValue.replace(',', '.')) || 0;
};

export const formatCurrencyInput = (value: string): string => {
  // Remove all non-digit characters
  const cleanValue = value.replace(/\D/g, '');
  
  // Convert to number and divide by 100 to get cents
  const numberValue = Number(cleanValue) / 100;
  
  // Format as currency but without the symbol "R$"
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
