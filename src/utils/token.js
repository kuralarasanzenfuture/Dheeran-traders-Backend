import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role_id: user.role_id
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
  );

};

export const generateRefreshToken = (user) => {

  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );

};