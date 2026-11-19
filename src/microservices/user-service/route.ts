import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser, createUser,
  deleteUser,
  userActivate,
  userBlock,
} from "./user.controller";

import { requireRole } from "services/roleBaseAccessControl";
import { userRegistrationSchema, userUpdateSchema } from './user.validate';
import { Middleware } from "middlewares";
import { upload, withTransaction } from "middlewares";
import { Role } from "microservices/auth-service/types";

const router = Router();

// Validation middleware using Yup
const validateUserRegistration = Middleware.requestValidate(userRegistrationSchema);
const validateUserUpdate = Middleware.requestValidate(userUpdateSchema);
router.use(Middleware.verifyToken); // Apply authentication middleware to all routes in this router
router.route("/")
.get( requireRole([Role.ADMIN,Role.SUPERADMIN]), getAllUsers)
.post( requireRole([Role.ADMIN,Role.SUPERADMIN]), upload.single('avatar', { folder: 'users', types: ['image'] }), validateUserRegistration, withTransaction(createUser));

router.put("/activate/:id", requireRole([Role.ADMIN,Role.SUPERADMIN]), userActivate);
router.route("/block/:id")
.put( requireRole([Role.ADMIN,Role.SUPERADMIN]), userBlock);
router.route("/:id")
.get( getUserById)
.put( requireRole([Role.ADMIN,Role.SUPERADMIN]), upload.single('avatar', { folder: 'users', types: ['image'] }), validateUserUpdate, withTransaction(updateUser))
.delete( requireRole([Role.ADMIN,Role.SUPERADMIN]), withTransaction(deleteUser));
export default router;
