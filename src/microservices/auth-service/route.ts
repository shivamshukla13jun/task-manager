import { Router } from "express";
import {
  registerUser,
  loginUser,
  logout,
  currentLoginUser
} from "./auth.controller";

import { authRegistrationSchema, authLoginSchema} from './auth.validation';
import { Middleware } from "middlewares";
import { createRateLimiter } from "middlewares/createRateLimiter";
const router = Router();
const loginLimiter = createRateLimiter({ limit: 5, windowMinutes: 15 }); // Example: 5 attempts per 15 minutes
// Validation middleware using Yup
const validateRegistration = Middleware.requestValidate(authRegistrationSchema);
const validateLogin = Middleware.requestValidate(authLoginSchema);

router.post("/register", validateRegistration, registerUser);
router.post("/login", loginLimiter, validateLogin, loginUser);
router.post("/logout",Middleware.verifyToken, logout);
router.get('/current-user',Middleware.verifyToken, currentLoginUser)
export default router;
