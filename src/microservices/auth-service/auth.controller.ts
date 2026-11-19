import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User,{IUserDocument} from "../../models/user.model";
import { AppError } from "middlewares/error";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken, saveTokenToDatabase, getTokenExpirationSeconds, revokeToken, verifyToken } from "libs/jwt";

/**
 * @description Create New User
 * @type POST 
 * @path /api/users/register
 */
const registerUser =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      let user: IUserDocument | undefined;
      await session.withTransaction(async () => {
        const [created] = await User.create([req.body], { session });
        user = created;
      });
      res.status(201).json({ data: user, success: true, statusCode: 201 });
    } catch (error) {
      console.warn(error)
      next(error)
    } finally {
      await session.endSession();
    }
  }

/**
 * @description User Login
 * @type POST 
 * @path /api/users/login
 */
const loginUser = 
  async (req: Request, res: Response, next: NextFunction):  Promise<void>  => {
    const session = await mongoose.startSession();
    try {
      const payload: IUserDocument = req.body;
    payload.email = payload.email.toLowerCase();

    let data: { user: any; accessToken: string; refreshToken: string; expiresIn: number } | undefined;
    await session.withTransaction(async () => {
      // Use a "where" clause to find the user by email
      const checkUser = await User.findOne( { email: payload.email  }, null, { session });
      if (!checkUser) {
        throw new AppError("No user found with provided email", 400);
      }

      if (!checkUser.isActive) {
        throw new AppError("Account is deactivated by owner!", 400);
      }
      if (checkUser.isBlocked) {
        throw new AppError("Account is blocked by owner!", 400);
      }
      const isMatch = await checkUser.matchPassword(payload.password as string, checkUser.password);
      if (!isMatch) {
        throw new AppError("Invalid credentials", 400);
      }

      // Generate JWT tokens
      const tokenPayload = {
        userId: checkUser._id.toString(),
        email: checkUser.email,
        role: checkUser.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save tokens to database with TTL
      const accessTokenExpiry = getTokenExpirationSeconds('access');
      const refreshTokenExpiry = getTokenExpirationSeconds('refresh');

      await saveTokenToDatabase(checkUser._id, accessToken, 'access', accessTokenExpiry, session);
      await saveTokenToDatabase(checkUser._id, refreshToken, 'refresh', refreshTokenExpiry, session);

      // Remove sensitive info from returned user data
      const { password, isBlocked, ...userData } = checkUser.toJSON();
      data = { user: userData, accessToken, refreshToken, expiresIn: accessTokenExpiry };
    });
      res.status(200).json({
        success: true,
        data,
        message: "Login successful",
      });
    } catch (error) {
      next(error)
    } finally {
      await session.endSession();
    }
  }





 const logout = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await session.withTransaction(async () => {
        await revokeToken(token, session);
      });
    }
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
} catch (error) {
  next(error)
} finally {
  await session.endSession();
}
};
const currentLoginUser = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user?._id
    let user: IUserDocument | null = null;
    await session.withTransaction(async () => {
      user = await User.findById(userId, null, { session });
    });
    if(!user){
      throw new AppError("User not found", 400);
    }
    res.status(200).json({ data: user, success: true, statusCode: 200 });
  } catch (error) {
    next(error)
  } finally {
    await session.endSession();
  }
}


export { registerUser, loginUser, logout, currentLoginUser };
