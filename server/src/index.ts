import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import ingestionRoutes from "./routes/ingestion.routes";
import { ClientManager } from "./services/client-manager";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/ingestion", ingestionRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        console.error(err.stack);
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: err.message,
        });
    }
);

const PORT = config.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const gracefulShutdown = async () => {
    console.log("Shutting down gracefully...");

    try {
        await ClientManager.closeAllClients();

        server.close(() => {
            console.log("Server closed");
            process.exit(0);
        });

        setTimeout(() => {
            console.error(
                "Could not close connections in time, forcefully shutting down"
            );
            process.exit(1);
        }, 10000);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;
