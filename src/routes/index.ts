


import { Router } from "express";

import authRoutes from "microservices/auth-service/route";
import { microservicesConfig } from "microservices/microservices";

const rootRouter = Router();

rootRouter.use(microservicesConfig.auth.baseUrl, authRoutes);

export default rootRouter;
