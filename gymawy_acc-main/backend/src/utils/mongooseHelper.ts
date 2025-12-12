import { Document } from 'mongoose';

/**
 * Convert Mongoose document(s) to JSON and ensure _id is always present
 * This fixes the issue where Mongoose sometimes returns 'id' instead of '_id'
 */
export function ensureId<T extends Document>(doc: T): any;
export function ensureId<T extends Document>(docs: T[]): any[];
export function ensureId<T extends Document>(docOrDocs: T | T[]): any | any[] {
  if (Array.isArray(docOrDocs)) {
    return docOrDocs.map(doc => {
      const obj = doc.toJSON();
      // Ensure _id is always present
      if (!obj._id && obj.id) {
        obj._id = obj.id;
      }
      return obj;
    });
  } else {
    const obj = docOrDocs.toJSON();
    // Ensure _id is always present
    if (!obj._id && obj.id) {
      obj._id = obj.id;
    }
    return obj;
  }
}
