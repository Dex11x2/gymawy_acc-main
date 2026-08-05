import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');

export interface BackupResult {
  outDir: string;
  totalCollections: number;
  totalDocuments: number;
  totalBytes: number;
}

/**
 * ياخد نسخة احتياطية كاملة من قاعدة البيانات (كل collection في ملف JSON).
 * بيستخدم اتصال منفصل (createConnection) عشان مايأثرش على اتصال السيرفر الأساسي —
 * فآمن يتنادى وهو السيرفر شغّال (من الـcron job) أو كـCLI.
 */
export async function runBackup(): Promise<BackupResult> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(BACKUP_DIR, timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  // اتصال مستقل خاص بالنسخ الاحتياطي (مش اتصال mongoose الافتراضي بتاع التطبيق)
  const conn = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
  }).asPromise();

  try {
    const db = conn.db!;
    const collections = await db.listCollections().toArray();

    const summary: Array<{ name: string; documents: number; bytes: number }> = [];
    let totalDocs = 0;
    let totalBytes = 0;

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      const json = JSON.stringify(docs, null, 2);
      fs.writeFileSync(path.join(outDir, `${col.name}.json`), json, 'utf8');
      const bytes = Buffer.byteLength(json, 'utf8');
      summary.push({ name: col.name, documents: docs.length, bytes });
      totalDocs += docs.length;
      totalBytes += bytes;
    }

    fs.writeFileSync(
      path.join(outDir, '_manifest.json'),
      JSON.stringify({
        backupAt: new Date().toISOString(),
        database: conn.name,
        host: conn.host,
        totalCollections: collections.length,
        totalDocuments: totalDocs,
        totalBytes,
        collections: summary,
      }, null, 2),
      'utf8'
    );

    pruneOldBackups();

    return { outDir, totalCollections: collections.length, totalDocuments: totalDocs, totalBytes };
  } finally {
    await conn.close();
  }
}

export function pruneOldBackups(): number {
  if (!fs.existsSync(BACKUP_DIR)) return 0;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (const entry of fs.readdirSync(BACKUP_DIR)) {
    const full = path.join(BACKUP_DIR, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && stat.mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      deleted++;
    }
  }
  return deleted;
}

// تشغيل مباشر كـCLI: `npm run backup`
if (require.main === module) {
  runBackup()
    .then((r) => {
      console.log(`\n✅ Backup complete: ${r.outDir}`);
      console.log(`📦 ${r.totalCollections} collections, ${r.totalDocuments} documents, ${(r.totalBytes / 1024 / 1024).toFixed(2)} MB`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Backup failed:', err);
      process.exit(1);
    });
}
