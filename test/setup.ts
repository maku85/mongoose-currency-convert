import mongoose from 'mongoose';

export async function connectTestDB() {
  const uri = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/test';
  await mongoose.connect(uri, {
    dbName: 'test',
    autoIndex: true,
  });
}

export async function disconnectTestDB() {
  await mongoose.disconnect();
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
