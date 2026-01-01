import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixMediaPriceIndex() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('mediaprices');

    // Get current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop the old index if it exists
    const oldIndexName = 'type_1_companyId_1';
    const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);

    if (hasOldIndex) {
      console.log(`\n🗑️ Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('✅ Old index dropped successfully');
    } else {
      console.log(`\n✅ Old index ${oldIndexName} not found (already removed)`);
    }

    // Also drop any records with null employeeId (orphaned data)
    const orphanedCount = await collection.countDocuments({ employeeId: null });
    if (orphanedCount > 0) {
      console.log(`\n🗑️ Removing ${orphanedCount} orphaned records (no employeeId)...`);
      await collection.deleteMany({ employeeId: null });
      console.log('✅ Orphaned records removed');
    }

    // Verify new indexes
    console.log('\n📋 Updated indexes:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixMediaPriceIndex();
