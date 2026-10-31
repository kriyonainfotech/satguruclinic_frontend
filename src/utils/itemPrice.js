// Appointment / sale me item "Name (₹500)" text me save hota hai.
// splitPrice: { name, price } deta hai; price raw text hai (input me waise hi dikhe), string me na ho to null
export const splitPrice = (str) => {
  const text = String(str || '');
  const m = text.match(/^(.*?)\s*\(₹\s*([\d.]*)\)/);
  return m ? { name: m[1].trim(), price: m[2] } : { name: text.trim(), price: null };
};

// Naam + price wapas "Name (₹500)" me
export const withPrice = (name, price) => `${name} (₹${price ?? ''})`;
