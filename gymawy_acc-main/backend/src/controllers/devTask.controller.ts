import { Request, Response } from 'express';
import DevTask from '../models/DevTask';

// Get all dev tasks
export const getAllDevTasks = async (req: Request, res: Response) => {
  try {
    const devTasks = await DevTask.find().sort({ createdAt: -1 });
    res.json(devTasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get dev task by ID
export const getDevTaskById = async (req: Request, res: Response) => {
  try {
    const devTask = await DevTask.findById(req.params.id);
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }
    res.json(devTask);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create dev task
export const createDevTask = async (req: Request, res: Response) => {
  try {
    console.log('🔵 createDevTask called');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', (req as any).user);

    const devTask = new DevTask(req.body);
    console.log('💾 Attempting to save dev task...');

    const savedDevTask = await devTask.save();
    console.log('✅ Dev task saved successfully:', savedDevTask._id);

    res.status(201).json(savedDevTask);
  } catch (error: any) {
    console.error('❌ Error creating dev task:', error.message);
    console.error('Stack:', error.stack);
    res.status(400).json({ message: error.message });
  }
};

// Update dev task
export const updateDevTask = async (req: Request, res: Response) => {
  try {
    const devTask = await DevTask.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }
    res.json(devTask);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Delete dev task
export const deleteDevTask = async (req: Request, res: Response) => {
  try {
    const devTask = await DevTask.findByIdAndDelete(req.params.id);
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }
    res.json({ message: 'Dev task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update task status
export const updateDevTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const devTask = await DevTask.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }
    res.json(devTask);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Update testing status
export const updateDevTaskTestingStatus = async (req: Request, res: Response) => {
  try {
    const { testingStatus, testingNotes } = req.body;
    const devTask = await DevTask.findByIdAndUpdate(
      req.params.id,
      { testingStatus, testingNotes, updatedAt: new Date() },
      { new: true }
    );
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }
    res.json(devTask);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Add comment
export const addDevTaskComment = async (req: Request, res: Response) => {
  try {
    const { userId, userName, content } = req.body;
    const devTask = await DevTask.findById(req.params.id);
    if (!devTask) {
      return res.status(404).json({ message: 'Dev task not found' });
    }

    const comment = {
      userId,
      userName,
      content,
      createdAt: new Date(),
    };

    devTask.comments = devTask.comments || [];
    devTask.comments.push(comment);
    devTask.updatedAt = new Date();

    await devTask.save();
    res.json(devTask);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
