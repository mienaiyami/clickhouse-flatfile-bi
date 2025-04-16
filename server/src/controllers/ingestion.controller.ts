import { Request, Response } from "express";
import { clickhouseService } from "../services/clickhouse";
import {
    ClickHouseConnection,
    DataTransferConfig,
    TableRequest,
    ColumnsRequest,
    PreviewDataRequest,
    SchemaRequest,
} from "../validators";

export class IngestionController {
    private constructor() {}

    static async validateConnection(
        req: Request<{}, {}, ClickHouseConnection>,
        res: Response
    ) {
        try {
            const config = req.body;
            const result = await clickhouseService.validateConnection(config);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async getTables(
        req: Request<{}, {}, ClickHouseConnection>,
        res: Response
    ) {
        try {
            const config = req.body;
            const tables = await clickhouseService.getTables(config);
            res.json(tables);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async getColumns(
        req: Request<{}, {}, ColumnsRequest>,
        res: Response
    ) {
        try {
            const { table, ...config } = req.body;
            const columns = await clickhouseService.getColumns(config, table);
            res.json(columns);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async previewData(
        req: Request<{}, {}, PreviewDataRequest>,
        res: Response
    ) {
        try {
            const { table, columns, ...config } = req.body;
            const data = await clickhouseService.previewData(
                config,
                table,
                columns
            );
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async getTableSchema(
        req: Request<{}, {}, SchemaRequest>,
        res: Response
    ) {
        try {
            const { table, ...config } = req.body;
            const schema = await clickhouseService.getTableSchema(
                config,
                table
            );
            res.json(schema);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async startTransfer(
        req: Request<{}, {}, DataTransferConfig>,
        res: Response
    ) {
        try {
            const config = req.body;
            const status = await clickhouseService.startTransfer(config);
            res.json(status);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async importData(
        req: Request<{}, {}, DataTransferConfig>,
        res: Response
    ) {
        try {
            const config = req.body;
            const status = await clickhouseService.importFromFile(config);
            res.json(status);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async exportData(
        req: Request<{}, {}, DataTransferConfig>,
        res: Response
    ) {
        try {
            const config = req.body;

            if (
                config.source.type !== "clickhouse" ||
                config.target.type !== "flatfile"
            ) {
                res.status(400).json({
                    error: "Invalid source or target type",
                });
                return;
            }

            const result = await clickhouseService.exportToFlatFile(config);

            if ("error" in result) {
                res.status(500).json(result);
                return;
            }

            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    static async streamExport(
        req: Request<{}, {}, DataTransferConfig>,
        res: Response
    ) {
        try {
            const config = req.body;

            if (
                config.source.type !== "clickhouse" ||
                config.target.type !== "flatfile"
            ) {
                res.status(400).json({
                    error: "Invalid source or target type",
                });
                return;
            }

            const result = await clickhouseService.exportToFlatFile(config);

            // If there's an error in the result, return it
            if ("error" in result) {
                res.status(500).json(result);
                return;
            }

            // For streaming, we would need to modify the ClickHouse service to return a readable stream
            // Since our current implementation doesn't support streaming directly, we'll return the result
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
