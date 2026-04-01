import { protect } from '../src/middleware/auth.middleware';
import type { Request, Response, NextFunction } from 'express';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../src/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

const mockUser = require('../src/models/User').default;
const mockJwt = require('jsonwebtoken').default;

const makeRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;
  return res;
};

describe('auth.middleware protect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no token provided', async () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    // @ts-ignore
    await protect(req, res as Response, next);

    expect((res.status as any)).toHaveBeenCalledWith(401);
    expect((res.json as any)).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token invalid', async () => {
    const req = { headers: { authorization: 'Bearer invalid' } } as unknown as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    mockJwt.verify.mockImplementation(() => { throw new Error('bad token'); });

    // @ts-ignore
    await protect(req, res as Response, next);

    expect((res.status as any)).toHaveBeenCalledWith(401);
    expect((res.json as any)).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user when token valid', async () => {
    const req: any = { headers: { authorization: 'Bearer valid' } } as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    mockJwt.verify.mockReturnValue({ id: 'u1' });
    mockUser.findById.mockResolvedValue({ _id: 'u1', toObject: () => ({ id: 'u1', role: 'employee' }) });

    await protect(req as any, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('u1');
  });
});

