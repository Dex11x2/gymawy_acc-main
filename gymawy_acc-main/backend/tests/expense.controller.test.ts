import * as expenseController from '../src/controllers/expense.controller';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../src/models/Expense', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnThis(),
    // @ts-expect-error - Mock return value
    populate: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
}));

const ExpenseModel = require('../src/models/Expense').default;

const makeRes = () => {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
};

describe('expense.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll filters by companyId for non-super_admin', async () => {
    const req: any = { user: { role: 'employee', companyId: 'c1' } };
    const res = makeRes();
    await expenseController.getAll(req, res as any);
    expect(ExpenseModel.find).toHaveBeenCalledWith({ companyId: 'c1' });
  });

  it('create attaches createdBy and companyId', async () => {
    const req: any = { user: { id: 'u1', companyId: 'c1' }, body: { title: 'x', amount: 1, category: 'y' } };
    const res = makeRes();
    ExpenseModel.create.mockResolvedValue({ id: 'e1' });
    await expenseController.create(req, res as any);
    expect(ExpenseModel.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'u1', companyId: 'c1' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'e1' });
  });
});

