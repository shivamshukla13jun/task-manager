import rateLimit, { Options } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./error";

export const createRateLimiter = ({limit, windowMinutes}: { limit: number; windowMinutes: number }) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: (
      req: Request,
      res: Response,
      next: NextFunction,
      options: Options
    ) => {
      next(
        new AppError(
          `Too many requests from this IP. Please try again after ${Math.ceil(
            (options.windowMs ?? 0) / 60000
          )} minutes.`,
          429
        )
      );
    },
  });
};