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
import { Readable } from "stream";

type FileUploadRequest = Request & {
    file?: {
        buffer: Buffer;
        mimetype: string;
        originalname: string;
    };
};

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
            res.status(400).json({
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

    static async importData(req: FileUploadRequest, res: Response) {
        try {
            const config = req.body as DataTransferConfig;

            console.log(config);

            // Handle file upload if present in the request
            if (req.file && config.source.type === "flatfile") {
                // Convert the file buffer to a readable stream
                const stream = new Readable();
                stream.push(req.file.buffer);
                stream.push(null); // Signal the end of the stream

                // Store the stream and get a stream ID
                const streamId = clickhouseService.storeStream(
                    stream,
                    req.file.mimetype,
                    req.file.originalname
                );

                // Update the config with the stream ID
                config.source.streamId = streamId;
            }

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

            // If file content exists, send it as a download
            if (result.fileContent) {
                // Set headers for file download
                res.setHeader("Content-Type", "text/csv");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${
                        config.source.table
                    }_${Date.now()}.csv"`
                );

                // Send the file content
                res.send(result.fileContent);
                return;
            }

            // Otherwise just return the result
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
