import { Request, Response } from 'express';
import RegistrationRequest from '../models/RegistrationRequest';

export const getAll = async (req: any, res: Response) => {
  try {
    const requests = await RegistrationRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const request = await RegistrationRequest.create(req.body);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const request = await RegistrationRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const request = await RegistrationRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
