import { NextFunction, Request, Response } from "express";
import { z } from "zod";

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

export const clickhouseConnectionSchema = z.object({
    host: z.string().nonempty("Host is required"),
    port: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
    database: z.string().nonempty("Database is required"),
    username: z.string().nonempty("Username is required"),
    password: z.string().optional(),
    jwtToken: z.string().optional(),
    protocol: z.enum(["http", "https"]).optional().default("http"),
});
// .refine((data) => {
//     if (data.protocol === "https") {
//         return !!data.jwtToken;
//     }
//     return true;
// })
// .refine((data) => {
//     if (!data.jwtToken) {
//         return data.password !== undefined;
//     }
//     return true;
// });

export const clickhouseSourceSchema = z.object({
    type: z.literal("clickhouse"),
    connection: clickhouseConnectionSchema,
    table: z.string().nonempty("Table is required"),
    columns: z
        .array(z.string())
        .nonempty("At least one column must be selected"),
});

export const flatFileSourceSchema = z.object({
    type: z.literal("flatfile"),
    fileContent: z.string().optional(),
    streamId: z.string().optional(),
    delimiter: z.string().optional().default(","),
    headers: z.boolean().optional().default(true),
    fileName: z.string().optional(),
});

export const clickhouseTargetSchema = z.object({
    type: z.literal("clickhouse"),
    connection: clickhouseConnectionSchema,
    table: z.string().nonempty("Table is required"),
});

export const flatFileTargetSchema = z.object({
    type: z.literal("flatfile"),
    delimiter: z.string().optional().default(","),
});

export const dataTransferConfigSchema = z.object({
    source: z.union([clickhouseSourceSchema, flatFileSourceSchema]),
    target: z.union([clickhouseTargetSchema, flatFileTargetSchema]),
});

export const tableRequestSchema = z.object({
    ...clickhouseConnectionSchema.shape,
    table: z.string().nonempty("Table is required"),
});

export const columnsRequestSchema = z.object({
    ...clickhouseConnectionSchema.shape,
    table: z.string().nonempty("Table is required"),
});

export const previewDataRequestSchema = z.object({
    ...clickhouseConnectionSchema.shape,
    table: z.string().nonempty("Table is required"),
    columns: z.array(z.string()),
});

export const schemaRequestSchema = z.object({
    ...clickhouseConnectionSchema.shape,
    table: z.string().nonempty("Table is required"),
});

export type ClickHouseConnection = z.infer<typeof clickhouseConnectionSchema>;
export type ClickHouseSource = z.infer<typeof clickhouseSourceSchema>;
export type FlatFileSource = z.infer<typeof flatFileSourceSchema>;
export type ClickHouseTarget = z.infer<typeof clickhouseTargetSchema>;
export type FlatFileTarget = z.infer<typeof flatFileTargetSchema>;
export type DataTransferConfig = z.infer<typeof dataTransferConfigSchema>;
export type TableRequest = z.infer<typeof tableRequestSchema>;
export type ColumnsRequest = z.infer<typeof columnsRequestSchema>;
export type PreviewDataRequest = z.infer<typeof previewDataRequestSchema>;
export type SchemaRequest = z.infer<typeof schemaRequestSchema>;

export type ValidationResult = {
    success: boolean;
    error?: string;
};

export type ColumnInfo = {
    name: string;
    type: string;
    defaultType?: string;
    defaultExpression?: string;
};

export type TableSchema = {
    table: string;
    columns: ColumnInfo[];
};
