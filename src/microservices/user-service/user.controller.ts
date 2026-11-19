import { Request, Response, NextFunction } from "express";
import User from "../../models/user.model";
import { AppError } from "middlewares/error";
import { createRegex, parseJSON } from "libs";
import pagination from "utils/pagination";
import { Role } from "microservices/auth-service/types";
import { Types } from "mongoose";
import sendEmail from "libs/sendEmail";
import path from "path";
import ejs from "ejs";
import { UserPermissionChecker } from "services/roleBaseAccessControl";
import { deleteFileOnCommit } from "middlewares/transaction";
import File from "models/file.model";
import config from "config/env";

/**
 * @description Get All Users
 * @type GET 
 * @path /api/users/allusers
 */
const getAllUsers = 
  async (req: Request, res: Response, next: NextFunction):Promise<void>  => {
    try {
      const { page = 1, limit = 10, isActive="",isBlocked,search,role } = req.query;
    const currentRole = req.user?.role
    const matchSatge:Record<string,any>={
      createdBy: new Types.ObjectId(req.user?._id as unknown as string)
    }
    if (isActive) {
      matchSatge.isActive = parseJSON(isActive as string);
    }
    if (isBlocked) {
      matchSatge.isBlocked = parseJSON(isBlocked as string);
    }
    if (role) {
      matchSatge.role = role
    }
    if(currentRole === Role.SUPERADMIN){
      matchSatge.role={$ne:Role.SUPERADMIN,$in:[Role.ADMIN]}
    }
 
    if (search) {
      matchSatge.$or = [
        { name: createRegex(search as string) },
        { email: createRegex(search as string) },
      ];
     
    }
    const result = await User.aggregate([
      { $match: matchSatge },
      {
        $project: {
          password: 0,
          __v: 0,
      },
    },
      
      { 
        $facet: {
          data: pagination(page as string, limit as string), // Ensure pagination returns an array of valid pipeline stages
          total: [{ $count: "total" }]
        } 
      },
      { 
        $project: {
          data: 1,
          total: { $arrayElemAt: ["$total.total", 0] }, // Extract total count correctly
        }
      }
    ]);
    
    // Ensure result is not empty and extract data correctly
    const data = result.length > 0 ? result[0].data : [];
    const total = result.length > 0 ? result[0].total || 0 : 0;
    
    res.status(200).json({ data: data, success: true,
      pagination:{
        page: Number(page),
        limit: Number(limit),
        total: total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      statusCode: 200 });
    } catch (error) {
      next(error)
    }
  }


/**
 * @description Create a New User
 * @type POST 
 * @path /api/users/
 */
const createUser = 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
   try {
     req.body.createdBy =req.user?._id
    const targetRole = req.body.role as Role;
    req.body.updatedBy =req.user?._id
    // Permission checks
    const checker = new UserPermissionChecker(req.user?._id);
    await checker.canUserUpdate(targetRole);
    const created = await User.create([req.body], { session: req.dbSession });
    const user = created[0].toObject();
    res.status(201).json({
      data: user,
      success: true,
      message: "User created successfully",
      statusCode: 201,
    });
   } catch (error) {
    next(error)
   }
  }


/**
 * @description Get a Single User by ID
 * @type GET 
 * @path /api/users/:id
 */
const getUserById = 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
   try {
        const { id } = req.params;
    let user = await User.findById(id).lean()
    if(!user){
      throw new AppError("User not found", 404);
    }
 res.status(200).json({ data:user, success: true, statusCode: 200 });
   } catch (error) {
    next(error)
   }
  }


/**
 * @description Update User by ID
 * @type PUT 
 * @path /api/users/:id
 */
const updateUser = 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
    const targetRole = req.body.role as Role;
    req.body.updatedBy =req.user?._id
    // Permission checks
    const checker = new UserPermissionChecker(req.user?._id);
    await checker.canUserUpdate(targetRole);

    const user = await User.findById(id).session(req.dbSession || null);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const previousAvatar = user.avatar;

    // Update fields except password
    Object.entries(req.body).forEach(([key, value]) => {
      if (key !== 'password' && key in user) {
        (user as any)[key] = value;
      }
    });

    // Handle password separately if provided
    if (req.body.password) {
      user.password = req.body.password;
    }
    await user.save({ session: req.dbSession });

    // Queue the replaced avatar for deletion once the transaction commits
    if (req.body.avatar && previousAvatar && previousAvatar.toString() !== req.body.avatar.toString()) {
      const oldFile = await File.findById(previousAvatar).session(req.dbSession || null);
      if (oldFile) {
        deleteFileOnCommit(req, { key: oldFile.key, provider: oldFile.provider, fileId: oldFile._id });
      }
    }

    res.status(200).json({
      data: user,
      success: true,
      message: "User updated successfully",
      statusCode: 200,
    });
    } catch (error) {
      next(error)
    }
  }



/**
 * @description Delete User by ID
 * @type DELETE 
 * @path /api/users/:id
 */
const deleteUser =
  async (req: Request, res: Response, next: NextFunction): Promise<void>=> {
   try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id,{session:req.dbSession});

    if (!user) {
      throw new AppError("User not found", 404);
    }
    const targetRole = user.role as Role;
    // Permission checks
    const checker = new UserPermissionChecker(req.user?._id);
    await checker.canUserUpdate(targetRole);

    // Queue the user's avatar file for deletion once the transaction commits
    if (user.avatar) {
      const avatarFile = await File.findById(user.avatar).session(req.dbSession || null);
      if (avatarFile) {
        deleteFileOnCommit(req, { key: avatarFile.key, provider: avatarFile.provider, fileId: avatarFile._id });
      }
    }

    res
      .status(200)
      .json({
        success: true,
        message: "User deleted successfully",
        statusCode: 200,
      });
   } catch (error) {
     next(error);
   }
  }

const userActivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
   try {
     const { id } = req.params;
    const { isActive } = req.body;
    
    const user= await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const targetRole = user.role as Role;
      // Permission checks
    const checker = new UserPermissionChecker(req.user?._id);
    await checker.canUserUpdate(targetRole);
    user.isActive = isActive;
    user.updatedBy = req.user?._id as unknown as Types.ObjectId;
    await user.save();

    const message= isActive
      ? "User activated successfully"
      : "User deactivated successfully";
    res.status(200).json({
      data: user,
      success: true,
      message: message,
      statusCode: 200,
    });
   } catch (error) {
    next(error)
   }
  }

const userBlock = 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
       const { id } = req.params;
    const { isBlocked } = req.body;
    const user= await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const targetRole = user.role as Role;
      // Permission checks
    const checker = new UserPermissionChecker(req.user?._id);
    await checker.canUserUpdate(targetRole);
  
    user.isBlocked = isBlocked;
    user.updatedBy = req.user?._id as unknown as Types.ObjectId;
    await user.save();
    const message= isBlocked
      ? "User Blocked successfully"
      : "User Unblock successfully";
    res.status(200).json({
      data: user,
      success: true,
      message: message,
      statusCode: 200,
    });
    } catch (error) {
      next(error)
    }
  }


/**
 * @description Reset Password
 * @type Rabitmq 
 * @param data
 * @returns void
 */
const handleResetPasswordRabitMQ = async (data: any) => {
    try {
        const { id } = data;
        const user=await User.findById(id)
        if(!user){
            return 
        }
        console.log({user})
          // Create reset URL
        const resetUrl = `${config.FRONTEND_URL}/reset-password/${user.resetPasswordToken}`;
        const html=await ejs.renderFile(path.join(__dirname,"../auth-service/passwordreset.ejs"), { resetUrl });
        await sendEmail({to:user.email, subject:"Password Reset Request", html});
    } catch (error) {
        console.error('Error in bill generation:', error);
        throw error;
    }
};
export { handleResetPasswordRabitMQ, getAllUsers, getUserById, updateUser, deleteUser, createUser, userActivate, userBlock };
