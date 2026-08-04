import connectDB from './lib/db.js';
import Media from './lib/models/Media.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectDB();
  const m = await Media.findOne();
  console.log("Found:", m.title, "fav:", m.favorite);
  m.favorite = true;
  await m.save();
  const f = await Media.find({ favorite: true });
  console.log("Favorites count:", f.length);
  process.exit(0);
}
run();
