import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is required");
    await mongoose.connect(mongoUri);
    console.log(`[SUCCESS] Connected to MongoDB`);
    
    // Listen for connection events
    mongoose.connection.on('error', (err: Error) => {
      console.error('[ERROR] MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('[WARNING] MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[INFO] MongoDB reconnected');
    });
    
  } catch (err) {
    console.error('[ERROR] MongoDB connection error:', err);
    process.exit(1); // Exit if can't connect to DB
  }
};

export default connectDB;
