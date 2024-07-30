import { registerSchema, loginSchema } from '../../validators/auth.validator';

describe('auth validators', () => {
  it('validates registration input', () => {
    const result = registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Secure1pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('validates login input', () => {
    const result = loginSchema.safeParse({
      email: 'john@example.com',
      password: 'Secure1pass',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });
});
