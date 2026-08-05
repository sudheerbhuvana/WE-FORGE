import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Contest from './lib/models/Contest.js';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const contests = await Contest.find({}, 'id title').lean();
    console.log("Contests:", contests);
    process.exit(0);
});
