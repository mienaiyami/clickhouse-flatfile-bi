import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validateRequestBody =
    (schema: AnyZodObject) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.path.includes("import")) {
                req.body = await schema.parseAsync(JSON.parse(req.body.body));
            } else {
                req.body = await schema.parseAsync(req.body);
            }
            // password can be empty
            // if (schema.shape.jwtToken && schema.shape.password) {
            //     if (!result.jwtToken && !result.password) {
            //         throw new Error(
            //             "JWT token and password cannot both be undefined"
            //         );
            //     }
            // }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: error.errors.map((err) => ({
                        field: err.path.join("."),
                        message: err.message,
                    })),
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: "An unexpected error occurred during validation",
            });
        }
    };
