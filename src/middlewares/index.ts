import { Request, Response, NextFunction } from "express";
import { z } from 'zod';
import { AppError } from 'middlewares/error';
import { verifyToken, verifyTokenInDatabase } from 'libs/jwt';
import User, { IUserDocument } from 'models/user.model';
import { encryptionMiddleware } from './encryption';

declare global {
  namespace Express {
    interface Request {
      user: IUserDocument;
    }
  }
}

export class Middleware {
    constructor() {

    }
    static verifyToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Extract JWT token from Authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return next(new AppError('Unauthorized: No token provided', 401));
            }

            const token = authHeader.replace('Bearer ', ''); // Remove 'Bearer ' prefix

            // Verify JWT signature
            const decoded = verifyToken(token, false);

            // Verify token exists in database (not revoked)
            const tokenExists = await verifyTokenInDatabase(token, 'access');
            if (!tokenExists) {
                return next(new AppError('Unauthorized: Token is invalid or expired', 401));
            }

            // Get user from database
            const user = await User.findById(decoded.userId);
            if (!user) {
                return next(new AppError('Unauthorized: User not found', 401));
            }

            // Attach user to request object
            req.user = user 
            next();

        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                return next(new AppError('Unauthorized: Token has expired', 401));
            }
            if (error.name === 'JsonWebTokenError') {
                return next(new AppError('Unauthorized: Invalid token', 401));
            }
            next(error);
        }
    }
    static encryption = encryptionMiddleware;

    static requestValidate = (schema: z.ZodSchema) => {
        const mw = async (req: Request, res: Response, next: NextFunction) => {
            try {
                console.info('Original Request Body:', req.body);
                req.body = await schema.parseAsync(req.body);
                console.info('New Request Body:', req.body);
                next();
            } catch (err: any) {
                next(err);
            }
        };
        // tagged so the auto-swagger generator can read the schema
        (mw as any)._zodSchema = schema;
        return mw;
    };
}

// tagged so the auto-swagger generator marks these routes as protected
(Middleware.verifyToken as any)._requiresAuth = true;

export { encryptionMiddleware };
