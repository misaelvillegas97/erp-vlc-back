export const parseCommaAndDotToNumber = (value: string): number => {
  const parsedValue = value.replace(/\./g, '').replace(',', '.');
  return Number(parsedValue) || 0;
};
