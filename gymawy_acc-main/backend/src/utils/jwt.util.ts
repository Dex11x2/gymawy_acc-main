import jwt, { SignOptions } from 'jsonwebtoken';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }
  return secret;
};

export const generateToken = (userId: string): string => {
  const payload = { id: userId };
  const secret = getSecret();
  const options: any = {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getSecret());
};
