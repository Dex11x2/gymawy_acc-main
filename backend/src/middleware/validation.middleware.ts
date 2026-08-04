import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId in route parameters
 * @param paramName - The name of the parameter to validate (default: 'id')
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    // Check if the ID exists and is not 'undefined'
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        message: `Invalid ${paramName}. Please provide a valid ${paramName}.`
      });
    }

    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName} format. Please provide a valid MongoDB ObjectId.`
      });
    }

    next();
  };
};

/**
 * Middleware to validate required fields in request body
 * @param fields - Array of required field names
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields
      });
    }

    next();
  };
};
