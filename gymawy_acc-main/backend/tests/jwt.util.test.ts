import { generateToken, verifyToken } from '../src/utils/jwt.util';
import { jest, describe, beforeEach, afterAll, it, expect } from '@jest/globals';

describe('jwt.util', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, JWT_SECRET: 'test-secret', JWT_EXPIRE: '1h' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('generates a JWT with the provided user id', () => {
    const token = generateToken('user-123');
    expect(typeof token).toBe('string');
    const decoded: any = verifyToken(token);
    expect(decoded.id).toBe('user-123');
  });
});

