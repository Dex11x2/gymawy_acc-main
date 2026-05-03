import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');

async function backup(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(BACKUP_DIR, timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`🔌 Connecting to MongoDB...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
  });
  console.log(`✅ Connected. Database: ${mongoose.connection.name}`);

  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log(`📚 Found ${collections.length} collections`);

  const summary: Array<{ name: string; documents: number; bytes: number }> = [];
  let totalDocs = 0;
  let totalBytes = 0;

  for (const col of collections) {
    const docs = await mongoose.connection.db!.collection(col.name).find({}).toArray();
    const json = JSON.stringify(docs, null, 2);
    const filePath = path.join(outDir, `${col.name}.json`);
    fs.writeFileSync(filePath, json, 'utf8');
    const bytes = Buffer.byteLength(json, 'utf8');
    summary.push({ name: col.name, documents: docs.length, bytes });
    totalDocs += docs.length;
    totalBytes += bytes;
    console.log(`  ✅ ${col.name.padEnd(35)} ${docs.length.toString().padStart(8)} docs  (${(bytes / 1024).toFixed(1)} KB)`);
  }

  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({
      backupAt: new Date().toISOString(),
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      totalCollections: collections.length,
      totalDocuments: totalDocs,
      totalBytes,
      collections: summary,
    }, null, 2),
    'utf8'
  );

  await mongoose.disconnect();
  console.log(`\n✅ Backup complete: ${outDir}`);
  console.log(`📦 ${totalDocs} documents, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  pruneOldBackups();
}

function pruneOldBackups(): void {
  if (!fs.existsSync(BACKUP_DIR)) return;
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
  if (deleted > 0) console.log(`🗑️  Pruned ${deleted} backups older than ${RETENTION_DAYS} days`);
}

backup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
