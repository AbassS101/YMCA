import { luhnOk, tokenizePayment } from '@/domain/paymentTokenizer';

test('tokenizes Visa test number to brand + last4', () => {
  expect(tokenizePayment({ number: '4242424242424242' })).toEqual({
    brand: 'Visa',
    last4: '4242',
  });
});

test('rejects invalid luhn', () => {
  expect(luhnOk('4242424242424241')).toBe(false);
  expect(() => tokenizePayment({ number: '1234' })).toThrow();
});

test('never returns full PAN', () => {
  const result = tokenizePayment({ number: '4111111111111111' });
  expect(JSON.stringify(result)).not.toMatch(/\d{13,19}/);
});
