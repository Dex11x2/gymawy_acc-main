import { Schema } from 'mongoose';

// حذف ناعم: بدل ما نمسح السجل نهائيًا، نعلّمه isDeleted ونخفيه من الاستعلامات
export function softDeletePlugin(schema: Schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  });

  // استبعاد المحذوف من كل استعلامات find تلقائيًا (إلا لو طلبنا withDeleted صراحةً)
  const applyFilter = function (this: any, next: () => void) {
    const q = this.getQuery ? this.getQuery() : {};
    if (!q.withDeleted && q.isDeleted === undefined) {
      this.where({ isDeleted: { $ne: true } });
    } else if (q.withDeleted) {
      delete q.withDeleted;
    }
    next();
  };

  schema.pre(/^find/, applyFilter as any);
  schema.pre('countDocuments', applyFilter as any);
}
