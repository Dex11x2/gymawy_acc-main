import express from 'express';
import { protect } from '../middleware/auth.middleware';
import MediaPrice from '../models/MediaPrice';
import Employee from '../models/Employee';
import ContentType from '../models/ContentType';

const router = express.Router();

// دالة لجلب الأسعار الافتراضية ديناميكياً من جدول ContentType
async function getDefaultPrices(): Promise<Array<{
  type: string;
  nameAr: string;
  price: number;
  currency: 'SAR' | 'USD' | 'EGP';
}>> {
  try {
    const contentTypes = await ContentType.find({ isActive: true }).sort({ displayOrder: 1 });

    return contentTypes.map(ct => ({
      type: ct.key,
      nameAr: ct.nameAr,
      price: ct.defaultPrice,
      currency: ct.currency
    }));
  } catch (error) {
    console.error('Error fetching default prices from ContentType:', error);
    // Fallback to empty array if ContentType is not available yet
    return [];
  }
}

// جلب كل الموظفين مع أسعارهم (للإدارة) - يجب أن يكون قبل /employee/:employeeId
// يعرض فقط الموظفين ذوي الراتب المتغير (ميديا)
router.get('/all-employees', protect, async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;

    // جلب الموظفين النشطين ذوي الراتب المتغير فقط
    const employees = await Employee.find({
      companyId,
      isActive: true,
      salaryType: 'variable' // فقط الرواتب المتغيرة
    }).select('_id name position');

    // جلب أسعار كل موظف
    const employeesWithPrices = await Promise.all(
      employees.map(async (emp) => {
        try {
          let prices = await MediaPrice.find({ employeeId: emp._id }).sort({ type: 1 });

          // إنشاء أسعار افتراضية إذا لم توجد
          if (prices.length === 0) {
            const defaultPrices = await getDefaultPrices();
            const defaultPricesWithEmployee = defaultPrices.map(p => ({
              ...p,
              employeeId: emp._id,
              companyId
            }));
            // استخدام insertMany مع ordered: false لتجاهل الأخطاء المكررة
            try {
              await MediaPrice.insertMany(defaultPricesWithEmployee, { ordered: false });
            } catch (insertError: any) {
              // تجاهل أخطاء duplicate key
              if (insertError.code !== 11000) {
                console.error('Insert error:', insertError);
              }
            }
            prices = await MediaPrice.find({ employeeId: emp._id }).sort({ type: 1 });
          }

          return {
            employee: emp,
            prices
          };
        } catch (empError: any) {
          console.error(`Error processing employee ${emp._id}:`, empError);
          return {
            employee: emp,
            prices: []
          };
        }
      })
    );

    res.json(employeesWithPrices);
  } catch (error: any) {
    console.error('Error fetching all employees prices:', error);
    res.status(500).json({ message: error.message });
  }
});

// جلب أسعار موظف معين
router.get('/employee/:employeeId', protect, async (req: any, res) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.companyId || null;

    let prices = await MediaPrice.find({ employeeId }).sort({ type: 1 });

    // إذا لم توجد أسعار للموظف، إنشاء أسعار افتراضية
    if (prices.length === 0) {
      const defaultPrices = await getDefaultPrices();
      const defaultPricesWithEmployee = defaultPrices.map(p => ({
        ...p,
        employeeId,
        companyId
      }));

      try {
        await MediaPrice.insertMany(defaultPricesWithEmployee, { ordered: false });
      } catch (insertError: any) {
        // تجاهل أخطاء duplicate key
        if (insertError.code !== 11000) {
          console.error('Insert error:', insertError);
        }
      }
      prices = await MediaPrice.find({ employeeId }).sort({ type: 1 });
      console.log(`✅ Default media prices created for employee: ${employeeId}`);
    }

    res.json(prices);
  } catch (error: any) {
    console.error('Error fetching employee media prices:', error);
    res.status(500).json({ message: error.message });
  }
});

// تحديث سعر موظف معين
router.put('/employee/:employeeId/:priceId', protect, async (req: any, res) => {
  try {
    const { employeeId, priceId } = req.params;
    const { price, currency, nameAr } = req.body;

    const mediaPrice = await MediaPrice.findOneAndUpdate(
      { _id: priceId, employeeId },
      {
        price,
        currency,
        nameAr,
        updatedBy: req.user?.userId
      },
      { new: true }
    );

    if (!mediaPrice) {
      return res.status(404).json({ message: 'السعر غير موجود' });
    }

    console.log(`✅ Media price updated for employee ${employeeId}: ${mediaPrice.type} = ${price} ${currency}`);
    res.json(mediaPrice);
  } catch (error: any) {
    console.error('Error updating employee media price:', error);
    res.status(500).json({ message: error.message });
  }
});

// تحديث جميع أسعار موظف معين
router.put('/employee/:employeeId', protect, async (req: any, res) => {
  try {
    const { employeeId } = req.params;
    const { prices } = req.body;
    const companyId = req.user?.companyId || null;

    const updatedPrices = await Promise.all(
      prices.map(async (p: any) => {
        return MediaPrice.findOneAndUpdate(
          { type: p.type, employeeId },
          {
            price: p.price,
            currency: p.currency,
            nameAr: p.nameAr,
            companyId,
            updatedBy: req.user?.userId
          },
          { new: true, upsert: true }
        );
      })
    );

    console.log(`✅ Media prices bulk updated for employee ${employeeId}`);
    res.json(updatedPrices);
  } catch (error: any) {
    console.error('Error bulk updating employee media prices:', error);
    res.status(500).json({ message: error.message });
  }
});

// تهيئة أسعار لموظف جديد
router.post('/employee/:employeeId/initialize', protect, async (req: any, res) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.companyId || null;

    // التحقق من عدم وجود أسعار مسبقة
    const existingPrices = await MediaPrice.find({ employeeId });
    if (existingPrices.length > 0) {
      return res.json({ message: 'الأسعار موجودة بالفعل', prices: existingPrices });
    }

    const defaultPrices = await getDefaultPrices();
    const defaultPricesWithEmployee = defaultPrices.map(p => ({
      ...p,
      employeeId,
      companyId
    }));

    const prices = await MediaPrice.insertMany(defaultPricesWithEmployee);
    console.log(`✅ Media prices initialized for employee: ${employeeId}`);
    res.status(201).json(prices);
  } catch (error: any) {
    console.error('Error initializing employee media prices:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
