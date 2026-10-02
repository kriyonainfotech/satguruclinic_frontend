/**
 * Sanitizes mobile number by removing spaces, dashes, and non-digit characters.
 * Handles pasted strings with +91 or leading 0, capping at 10 digits.
 */
export const sanitizeMobileNumber = (value) => {
  if (!value) return '';
  let digits = value.toString().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

/**
 * Checks if the mobile number is exactly 10 digits.
 */
export const isValidMobileNumber = (value) => {
  return /^\d{10}$/.test(value);
};
