


import { Router } from "express";

import authRoutes from "microservices/auth-service/route";
import taskRoutes from "microservices/task-service/route";
import { microservicesConfig } from "microservices/microservices";

const rootRouter = Router();

rootRouter.use(microservicesConfig.auth.baseUrl, authRoutes);
rootRouter.use(microservicesConfig.task.baseUrl, taskRoutes);

export default rootRouter;
