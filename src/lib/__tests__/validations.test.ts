import { describe, it, expect } from 'vitest';
import { addMemberSchema, posOrderSchema, mobileLoginSchema } from '../validations';

describe('addMemberSchema', () => {
  const validInput = {
    firstName: 'Karim',
    lastName: 'Benali',
    email: 'karim.benali@example.com',
    phone: '0550123456',
    planId: 'plan_abc123',
  };

  it('accepts a valid member input', () => {
    const result = addMemberSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email address', () => {
    const result = addMemberSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a firstName that is too short', () => {
    const result = addMemberSchema.safeParse({ ...validInput, firstName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects a firstName that exceeds max length', () => {
    const result = addMemberSchema.safeParse({ ...validInput, firstName: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid Algerian phone number', () => {
    const result = addMemberSchema.safeParse({ ...validInput, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid +213 international phone format', () => {
    const result = addMemberSchema.safeParse({ ...validInput, phone: '+213661987654' });
    expect(result.success).toBe(true);
  });

  it('accepts missing optional phone number', () => {
    const result = addMemberSchema.safeParse({ ...validInput, phone: undefined });
    expect(result.success).toBe(true);
  });

  it('strips XSS payloads from firstName', () => {
    const result = addMemberSchema.safeParse({ ...validInput, firstName: 'Ka<script>alert(1)</script>rim' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).not.toContain('<script>');
    }
  });

  it('lowercases the email address', () => {
    const result = addMemberSchema.safeParse({ ...validInput, email: 'KARIM@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('karim@example.com');
    }
  });
});

describe('posOrderSchema', () => {
  const validOrder = {
    items: [{ productId: 'prod_abc123', quantity: 2 }],
  };

  it('accepts a valid order', () => {
    const result = posOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('rejects an empty items array', () => {
    const result = posOrderSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects items with quantity 0', () => {
    const result = posOrderSchema.safeParse({
      items: [{ productId: 'prod_abc123', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects items with quantity exceeding 100', () => {
    const result = posOrderSchema.safeParse({
      items: [{ productId: 'prod_abc123', quantity: 101 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a productId that is too short', () => {
    const result = posOrderSchema.safeParse({
      items: [{ productId: 'ab', quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('mobileLoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = mobileLoginSchema.safeParse({ email: 'user@example.com', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = mobileLoginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = mobileLoginSchema.safeParse({ email: 'not-valid', password: 'pass1234' });
    expect(result.success).toBe(false);
  });
});
