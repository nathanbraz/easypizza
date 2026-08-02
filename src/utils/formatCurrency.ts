export const formatCurrency = (val: string | number | undefined | null): string => {
  if (val === null || val === undefined) return '0,00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0,00';
  
  return num.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};
