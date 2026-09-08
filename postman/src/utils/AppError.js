export class AppError extends Error {
  constructor(message, status = 500, code = "SERVER_ERROR") {
    super(message);
    this.status = status;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}


import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, place } = req.body;

  const [result] = await db.query(
    "INSERT INTO chit_customers (name, phone, place) VALUES (?, ?, ?)",
    [name, phone, place]
  );

  if (!result.insertId) {
    throw new AppError("Failed to create customer", 500);
  }

  res.status(201).json({
    success: true,
    message: "Customer created"
  });
});