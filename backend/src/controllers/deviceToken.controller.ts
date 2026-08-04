import { Response } from 'express';
import DeviceToken from '../models/DeviceToken';

// حفظ/تحديث توكن جهاز المستخدم الحالي
export const register = async (req: any, res: Response) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token required' });
    const userId = req.user._id || req.user.id;
    // نفس التوكن لا يتكرر: نربطه بالمستخدم الحالي
    await DeviceToken.findOneAndUpdate(
      { token },
      { token, userId, platform: platform || 'android' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// إزالة توكن (عند تسجيل الخروج مثلاً)
export const remove = async (req: any, res: Response) => {
  try {
    const { token } = req.body;
    if (token) await DeviceToken.deleteOne({ token });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
