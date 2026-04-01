import jwt, { SignOptions } from 'jsonwebtoken';

const getSecret = (): string => {
  return process.env.JWT_SECRET || 'default-secret-key-change-this';
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
