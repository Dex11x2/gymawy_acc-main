import mongoose from 'mongoose';

// Global JSON transform: expose `id` and remove `_id` and `__v`
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    if (ret?._id && !ret.id) {
      ret.id = ret._id.toString();
    }
    if (ret?._id) delete ret._id;
    return ret;
  }
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi-accounting';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Disconnected - Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected');
    });
    
  } catch (error) {
    console.error('❌ Database Connection Failed:', error);
    process.exit(1);
  }
};
