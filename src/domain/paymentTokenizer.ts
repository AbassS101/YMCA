export function luhnOk(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

export function tokenizePayment(input: { number: string }): { brand: string; last4: string } {
  const digits = input.number.replace(/\D/g, '');
  if (!luhnOk(digits)) throw new Error('Invalid card number');
  return { brand: detectBrand(digits), last4: digits.slice(-4) };
}

export function tokenizePaymentInput(input: {
  cardNumber: string;
  expiry?: string;
  cvc?: string;
  postalCode?: string;
}): { valid: boolean; brand: string; last4: string; error?: string } {
  const digits = (input.cardNumber || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return { valid: false, brand: 'Card', last4: '', error: 'Card number must be between 13 and 19 digits.' };
  }
  if (!luhnOk(digits)) {
    return { valid: false, brand: 'Card', last4: '', error: 'Invalid card number. Please check and try again.' };
  }
  if (input.expiry) {
    const cleanExpiry = input.expiry.replace(/\D/g, '');
    if (cleanExpiry.length >= 2) {
      const month = parseInt(cleanExpiry.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        return { valid: false, brand: detectBrand(digits), last4: digits.slice(-4), error: 'Invalid expiration month (01-12).' };
      }
    }
  }
  if (input.cvc) {
    const cleanCvc = input.cvc.replace(/\D/g, '');
    if (cleanCvc.length < 3 || cleanCvc.length > 4) {
      return { valid: false, brand: detectBrand(digits), last4: digits.slice(-4), error: 'Security code (CVC) must be 3 or 4 digits.' };
    }
  }
  return { valid: true, brand: detectBrand(digits), last4: digits.slice(-4) };
}
