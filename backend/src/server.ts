import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { profileRouter } from "./routes/profile.js"; //adding js extension for NodeNext module resolution
import { planRouter } from "./routes/plan.js"; //adding js extension for NodeNext module resolution

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/profile", profileRouter);
app.use("/api/plan", planRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
