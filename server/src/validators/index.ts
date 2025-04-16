import { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const clickhouseAuthSchema = z.object({
    port: z.number().int().positive(),
    host: z.string().nonempty("Host is required"),
    username: z.string().nonempty("Username is required"),
    database: z.string().nonempty("Database is required"),
    jwtSecret: z.string().nonempty("JWT secret is required"),
});
export type ClickhouseAuthSchema = z.infer<typeof clickhouseAuthSchema>;

/*  */
export const validateRequest = (schema: z.ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const result = await schema.safeParseAsync(req);
        if (result.success) {
            next();
        } else {
            return res.status(400).json({
                message: "Invalid request",
                errors: result.error.errors,
            });
        }
    };
};

export const validateClickhouseAuth = validateRequest(clickhouseAuthSchema);
