import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET || 'secret', {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '2d') as any,
  });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'rsecret', {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as { userId: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'rsecret') as { userId: string };
};
