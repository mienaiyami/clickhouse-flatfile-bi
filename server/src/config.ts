import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
    PORT: z
        .number({
            coerce: true,
        })
        .default(3000),
    CLIENT_URL: z.string().default("http://localhost:5173"),
});

export const config = envSchema.parse(process.env);
