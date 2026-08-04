import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function restore(): Promise<void> {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('Usage: npm run restore -- <path-to-backup-directory>');
    process.exit(1);
  }

  const absPath = path.resolve(backupPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Path not found: ${absPath}`);
    process.exit(1);
  }

  const manifestPath = path.join(absPath, '_manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📋 Manifest: ${manifest.totalDocuments} docs from ${manifest.backupAt}`);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log(`🔌 Connecting to ${uri.split('@')[1]?.split('/')[0] || 'database'}...`);
  await mongoose.connect(uri);
  console.log(`✅ Connected. Restoring INTO: ${mongoose.connection.name}`);
  console.log(`⚠️  This will INSERT documents. Existing duplicate _ids will be skipped.\n`);

  const files = fs.readdirSync(absPath).filter((f) => f.endsWith('.json') && f !== '_manifest.json');
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const colName = path.basename(file, '.json');
    const docs = JSON.parse(fs.readFileSync(path.join(absPath, file), 'utf8'));
    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`  ⏭️  ${colName.padEnd(35)} (empty)`);
      continue;
    }
    try {
      const result = await mongoose.connection.db!.collection(colName).insertMany(docs, { ordered: false });
      totalInserted += result.insertedCount;
      console.log(`  ✅ ${colName.padEnd(35)} inserted ${result.insertedCount}/${docs.length}`);
    } catch (err: any) {
      const inserted = err.result?.insertedCount || 0;
      const skipped = docs.length - inserted;
      totalInserted += inserted;
      totalSkipped += skipped;
      console.log(`  ⚠️  ${colName.padEnd(35)} inserted ${inserted}, skipped ${skipped} duplicates`);
    }
  }

  await mongoose.disconnect();
  console.log(`\n✅ Restore complete: ${totalInserted} inserted, ${totalSkipped} skipped (duplicates)`);
}

restore().catch((err) => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
