import * as revenueController from '../src/controllers/revenue.controller';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../src/models/Revenue', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnThis(),
    // @ts-expect-error - Mock return value
    populate: jest.fn().mockResolvedValue([]),
  },
}));

const RevenueModel = require('../src/models/Revenue').default;

const makeRes = () => {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
};

describe('revenue.controller getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses empty filter for super_admin', async () => {
    const req: any = { user: { role: 'super_admin' } };
    const res = makeRes();
    await revenueController.getAll(req, res as any);
    expect(RevenueModel.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('filters by companyId for non-super_admin', async () => {
    const req: any = { user: { role: 'employee', companyId: 'c1' } };
    const res = makeRes();
    await revenueController.getAll(req, res as any);
    expect(RevenueModel.find).toHaveBeenCalledWith({ companyId: 'c1' });
  });
});

