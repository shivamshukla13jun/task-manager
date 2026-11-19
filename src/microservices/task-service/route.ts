import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "./task.controller";

import { taskCreateSchema, taskUpdateSchema } from "./task.validation";
import { Middleware } from "middlewares";

const router = Router();

// All task routes require authentication
router.use(Middleware.verifyToken);

const validateTaskCreate = Middleware.requestValidate(taskCreateSchema);
const validateTaskUpdate = Middleware.requestValidate(taskUpdateSchema);

router.post("/", validateTaskCreate, createTask);
router.get("/", getTasks);
router.get("/:id", getTaskById);
router.patch("/:id", validateTaskUpdate, updateTask);
router.delete("/:id", deleteTask);

export default router;
