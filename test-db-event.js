import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Event from './lib/models/Event.js';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const event = await Event.findOne({ id: 'tes-2026-08-18' }).lean();
    console.log("Event:", event);
    process.exit(0);
});
