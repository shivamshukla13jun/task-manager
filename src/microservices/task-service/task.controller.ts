import { Request, Response, NextFunction } from "express";
import mongoose, { ClientSession } from "mongoose";
import Task, { ITaskDocument } from "models/task.model";
import { AppError } from "middlewares/error";

const taskOwnerFilter = (req: Request) => ({ owner: req.user._id });

const findOwnedTask = async (req: Request, session: ClientSession) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid task id", 400);
  }
  const task = await Task.findOne({ _id: id, ...taskOwnerFilter(req) }, null, { session });
  if (!task) {
    throw new AppError("Task not found", 404);
  }
  return task;
};

/**
 * @description Create a new task
 * @type POST
 * @path /api/tasks
 */
const createTask =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      let task: ITaskDocument | undefined;
      await session.withTransaction(async () => {
        const [created] = await Task.create(
          [{ ...req.body, owner: req.user._id, createdBy: req.user._id }],
          { session }
        );
        task = created;
      });
      res.status(201).json({ data: task, success: true, statusCode: 201 });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };

/**
 * @description List the current user's tasks (supports ?status=&priority=&page=&limit=)
 * @type GET
 * @path /api/tasks
 */
const getTasks =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      let tasks: ITaskDocument[] = [];
      let total = 0;

      await session.withTransaction(async () => {
        const filter: Record<string, any> = { ...taskOwnerFilter(req) };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;

        const pageNumber = Number(req.query.page) || 1;
        const limitNumber = Number(req.query.limit) || 10;

        [tasks, total] = await Promise.all([
          Task.find(filter, null, { session })
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber),
          Task.countDocuments(filter, { session }),
        ]);
      });

      const pageNumber = Number(req.query.page) || 1;
      const limitNumber = Number(req.query.limit) || 10;
      res.status(200).json({
        data: tasks,
        success: true,
        statusCode: 200,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };

/**
 * @description Get a single task by id
 * @type GET
 * @path /api/tasks/:id
 */
const getTaskById =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      let task: ITaskDocument | undefined;
      await session.withTransaction(async () => {
        task = await findOwnedTask(req, session);
      });
      res.status(200).json({ data: task, success: true, statusCode: 200 });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };

/**
 * @description Update a task
 * @type PATCH
 * @path /api/tasks/:id
 */
const updateTask =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      let task: ITaskDocument | null = null;
      await session.withTransaction(async () => {
        await findOwnedTask(req, session);
        task = await Task.findByIdAndUpdate(
          req.params.id,
          { ...req.body, updatedBy: req.user._id },
          { new: true, runValidators: true, session }
        );
      });
      res.status(200).json({ data: task, success: true, statusCode: 200 });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };

/**
 * @description Delete a task
 * @type DELETE
 * @path /api/tasks/:id
 */
const deleteTask =
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const task = await findOwnedTask(req, session);
        await task.deleteOne({ session });
      });
      res.status(200).json({ success: true, statusCode: 200, message: "Task deleted" });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };

export { createTask, getTasks, getTaskById, updateTask, deleteTask };
