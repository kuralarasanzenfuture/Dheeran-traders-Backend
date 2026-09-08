import db from "../config/db.js";

export const attachDb = (req, res, next) => {
  req.db = db;
  next();
};