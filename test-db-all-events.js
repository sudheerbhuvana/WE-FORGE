import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Event from './lib/models/Event.js';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const events = await Event.find({}, 'id title').lean();
    console.log("Events:", events);
    process.exit(0);
});
