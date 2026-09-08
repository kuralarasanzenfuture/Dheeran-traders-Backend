export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


import { asyncHandler } from "../utils/asyncHandler.js";

export const getCustomerSubscriptions = asyncHandler(async (req, res) => {
  const [rows] = await db.query("...");

  res.status(200).json({
    success: true,
    data: rows
  });
});