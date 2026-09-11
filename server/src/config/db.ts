import mongoose from 'mongoose';

const connectWithRetry = async (retries = 5, delayMs = 5000): Promise<void> => {
  const mongoURI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/warenova';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${retries} failed:`,
        error
      );
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export const connectDB = connectWithRetry;

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export default mongoose;
