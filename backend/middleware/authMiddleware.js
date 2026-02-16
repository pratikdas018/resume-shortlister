import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!token) {
      return res.status(401).json({ error: "Unauthorized. Missing token." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.sub) {
      return res.status(401).json({ error: "Unauthorized. Invalid token payload." });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized. User not found." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden. Insufficient role." });
  }

  return next();
};
