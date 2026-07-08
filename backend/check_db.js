import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const session = await mongoose.connection.db.collection('sessions').findOne({ sessionCode: '1ED02A' });
  console.log("Session:", session);
  if (session) {
    const interviewer = await mongoose.connection.db.collection('users').findOne({ _id: session.interviewer });
    console.log("Interviewer:", interviewer);
  }
  process.exit(0);
});
