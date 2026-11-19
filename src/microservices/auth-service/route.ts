import { Router } from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logout,
  currentLoginUser,
  refreshAccessToken
} from "./auth.controller";

import { authRegistrationSchema, authLoginSchema, authPasswordResetRequestSchema, authPasswordResetSchema } from './auth.validation';
import { Middleware } from "middlewares";
import { createRateLimiter } from "middlewares/createRateLimiter";
const router = Router();
const loginLimiter = createRateLimiter({ limit: 5, windowMinutes: 15 }); // Example: 5 attempts per 15 minutes
// Validation middleware using Yup
const validateRegistration = Middleware.requestValidate(authRegistrationSchema);
const validateLogin = Middleware.requestValidate(authLoginSchema);
const validatePasswordResetRequest = Middleware.requestValidate(authPasswordResetRequestSchema);
const validatePasswordReset = Middleware.requestValidate(authPasswordResetSchema);

router.post("/register", validateRegistration, registerUser);
router.post("/login", loginLimiter, validateLogin, loginUser);
router.post("/logout",Middleware.verifyToken, logout);
router.post('/refresh-token', refreshAccessToken);
router.post('/forget-password', loginLimiter, validatePasswordResetRequest, forgotPassword);
router.post('/reset-password', loginLimiter, validatePasswordReset, resetPassword);
router.get('/current-user',Middleware.verifyToken, currentLoginUser)
export default router;
