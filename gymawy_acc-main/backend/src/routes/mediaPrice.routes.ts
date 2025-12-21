import express from 'express';
import { protect } from '../middleware/auth.middleware';
import MediaPrice from '../models/MediaPrice';

const router = express.Router();

// Get all prices
router.get('/', protect, async (req: any, res) => {
  try {
    const companyId = req.user?.companyId || null;

    let prices = await MediaPrice.find({ companyId }).sort({ type: 1 });

    // If no prices exist, create defaults
    if (prices.length === 0) {
      const defaultPrices: Array<{
        type: 'short_video' | 'long_video' | 'vlog' | 'podcast' | 'post_design' | 'thumbnail';
        nameAr: string;
        price: number;
        currency: 'SAR' | 'USD' | 'EGP';
        companyId: any;
      }> = [
        { type: 'short_video', nameAr: 'فيديو قصير', price: 50, currency: 'SAR', companyId },
        { type: 'long_video', nameAr: 'فيديو طويل', price: 150, currency: 'SAR', companyId },
        { type: 'vlog', nameAr: 'فلوج', price: 200, currency: 'SAR', companyId },
        { type: 'podcast', nameAr: 'بودكاست', price: 100, currency: 'SAR', companyId },
        { type: 'post_design', nameAr: 'تصميم بوست', price: 30, currency: 'SAR', companyId },
        { type: 'thumbnail', nameAr: 'صورة مصغرة', price: 20, currency: 'SAR', companyId },
      ];

      await MediaPrice.insertMany(defaultPrices);
      prices = await MediaPrice.find({ companyId }).sort({ type: 1 });
      console.log('✅ Default media prices created');
    }

    res.json(prices);
  } catch (error: any) {
    console.error('Error fetching media prices:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update price
router.put('/:id', protect, async (req: any, res) => {
  try {
    const { price, currency, nameAr } = req.body;

    const mediaPrice = await MediaPrice.findByIdAndUpdate(
      req.params.id,
      {
        price,
        currency,
        nameAr,
        updatedBy: req.user?.userId
      },
      { new: true }
    );

    if (!mediaPrice) {
      return res.status(404).json({ message: 'Price not found' });
    }

    console.log(`✅ Media price updated: ${mediaPrice.type} = ${price} ${currency}`);
    res.json(mediaPrice);
  } catch (error: any) {
    console.error('Error updating media price:', error);
    res.status(500).json({ message: error.message });
  }
});

// Bulk update prices
router.put('/', protect, async (req: any, res) => {
  try {
    const { prices } = req.body;
    const companyId = req.user?.companyId || null;

    const updatedPrices = await Promise.all(
      prices.map(async (p: any) => {
        return MediaPrice.findOneAndUpdate(
          { type: p.type, companyId },
          {
            price: p.price,
            currency: p.currency,
            nameAr: p.nameAr,
            updatedBy: req.user?.userId
          },
          { new: true, upsert: true }
        );
      })
    );

    console.log('✅ Media prices bulk updated');
    res.json(updatedPrices);
  } catch (error: any) {
    console.error('Error bulk updating media prices:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
