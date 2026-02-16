import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import resumeRoutes from "./routes/resumeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { authenticate } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/resumes", authenticate, resumeRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Each file must be smaller than 5MB" });
    }
    return res.status(400).json({ error: err.message || "Upload validation failed" });
  }
  if (err) {
    return res.status(400).json({ error: err.message || "Bad request" });
  }
  return res.status(500).json({ error: "Unexpected server error" });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
