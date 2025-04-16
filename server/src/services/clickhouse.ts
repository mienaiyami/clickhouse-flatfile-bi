import { ClickHouseClient } from "@clickhouse/client";
import fs from "fs";
import path from "path";
import {
    ClickHouseConnection,
    DataTransferConfig,
    TableSchema,
    ValidationResult,
} from "../validators";
import { ClientManager } from "./client-manager";
import { Transform, Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { stringify } from "csv-stringify/sync";

// store for temporary file streams
const streamStore: Map<
    string,
    {
        stream: Readable;
        contentType: string;
        fileName: string;
        expiresAt: number;
    }
> = new Map();

export class ClickHouseService {
    async validateConnection(
        config: ClickHouseConnection
    ): Promise<ValidationResult> {
        try {
            // Get the client connection
            const client = ClientManager.getClient(config);

            // Check if the database exists
            const query = `SELECT name FROM system.databases WHERE name = '${config.database}'`;
            const result = await client.query({ query, format: "JSONEachRow" });
            const rows = await result.json();

            if (rows.length === 0) {
                return {
                    success: false,
                    error: `Database '${config.database}' does not exist`,
                };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getTables(config: ClickHouseConnection): Promise<string[]> {
        const client = ClientManager.getClient(config);
        try {
            // const query = `SELECT name FROM system.tables`;
            const query = `SHOW TABLES FROM ${config.database}`;
            const rows = await (
                await client.query({ query, format: "JSONEachRow" })
            ).json();
            return rows.map((row: any) => row.name);
        } catch (error) {
            throw error;
        }
    }

    async getColumns(
        config: ClickHouseConnection,
        table: string
    ): Promise<{ name: string; type: string }[]> {
        const client = ClientManager.getClient(config);
        try {
            const query = `SELECT name, type FROM system.columns WHERE database = '${config.database}' AND table = '${table}'`;
            const rows = await (
                await client.query({ query, format: "JSONEachRow" })
            ).json();
            return rows.map((row: any) => ({
                name: row.name as string,
                type: row.type as string,
            }));
        } catch (error) {
            throw error;
        }
    }

    async getTableSchema(
        config: ClickHouseConnection,
        table: string
    ): Promise<TableSchema> {
        const client = ClientManager.getClient(config);
        try {
            const query = `DESCRIBE TABLE ${config.database}.${table}`;
            const rows = await (
                await client.query({ query, format: "JSONEachRow" })
            ).json();

            const columns = rows.map((row: any) => ({
                name: row.name as string,
                type: row.type as string,
                defaultType: row.default_type as string,
                defaultExpression: row.default_expression as string,
            }));

            return {
                table,
                columns,
            };
        } catch (error) {
            throw error;
        }
    }

    async previewData(
        config: ClickHouseConnection,
        table: string,
        columns: string[]
    ): Promise<Record<string, any>[]> {
        const client = ClientManager.getClient(config);
        try {
            const columnsStr = columns.length > 0 ? columns.join(", ") : "*";
            const query = `SELECT ${columnsStr} FROM ${config.database}.${table} LIMIT 20`;
            const rows = await (
                await client.query({ query, format: "JSONEachRow" })
            ).json();
            return rows as unknown as Record<string, any>[];
        } catch (error) {
            throw error;
        }
    }

    async startTransfer(
        config: DataTransferConfig
    ): Promise<{ success: boolean; count?: number; error?: string }> {
        if (
            config.source.type === "clickhouse" &&
            config.target.type === "flatfile"
        ) {
            return this.exportToFlatFile(config);
        } else if (
            config.source.type === "flatfile" &&
            config.target.type === "clickhouse"
        ) {
            return this.importFromFile(config);
        } else {
            throw new Error("Invalid source or target type");
        }
    }

    // Method to store a stream and return an ID
    storeStream(
        stream: Readable,
        contentType: string,
        fileName: string
    ): string {
        const streamId = uuidv4();
        // 30 minute expiration
        const expiresAt = Date.now() + 30 * 60 * 1000;
        streamStore.set(streamId, { stream, contentType, fileName, expiresAt });

        // Schedule cleanup for expired streams
        this.cleanupExpiredStreams();

        return streamId;
    }

    // Method to retrieve a stream by ID
    getStream(
        streamId: string
    ): { stream: Readable; contentType: string; fileName: string } | undefined {
        const streamData = streamStore.get(streamId);
        if (!streamData) return undefined;

        // If the stream has expired, remove it and return undefined
        if (Date.now() > streamData.expiresAt) {
            streamStore.delete(streamId);
            return undefined;
        }

        return streamData;
    }

    // Cleanup expired streams periodically
    private cleanupExpiredStreams() {
        const now = Date.now();
        for (const [id, data] of streamStore.entries()) {
            if (now > data.expiresAt) {
                streamStore.delete(id);
            }
        }
    }

    async importFromFile(
        config: DataTransferConfig
    ): Promise<{ success: boolean; count?: number; error?: string }> {
        if (
            config.source.type !== "flatfile" ||
            config.target.type !== "clickhouse"
        ) {
            throw new Error("Invalid source or target type");
        }

        const client = ClientManager.getClient(config.target.connection);

        try {
            let fileContent: string;

            // Determine the source of the file content
            if (config.source.fileContent) {
                // Use the provided file content directly
                fileContent = config.source.fileContent;
            } else if (config.source.streamId) {
                // Get the stream from the store
                const streamData = this.getStream(config.source.streamId);
                if (!streamData) {
                    throw new Error("Stream not found or has expired");
                }

                // Read the stream contents into a string
                fileContent = await this.streamToString(streamData.stream);
            } else {
                throw new Error("No file content or stream ID provided");
            }

            const delimiter = config.source.delimiter || ",";
            const lines = fileContent.split("\n");

            if (lines.length === 0) {
                throw new Error("Empty content");
            }

            const headers = lines[0].split(delimiter).map((h) => h.trim());

            // Create a temporary table or insert into an existing one
            const tableName = config.target.table;

            // Get columns from the target table
            const tableColumns = await this.getColumns(
                config.target.connection,
                tableName
            );
            const columnMap = new Map(
                tableColumns.map((col) => [col.name, col.type])
            );

            // Filter the columns to only include those that exist in the table
            const validColumns = headers.filter((h) => columnMap.has(h));

            if (validColumns.length === 0) {
                throw new Error("No valid columns found in the file");
            }

            // Prepare the data for insertion
            const dataRows = lines
                .slice(1)
                .filter((line) => line.trim() !== "")
                .map((line) => {
                    const values = line.split(delimiter);
                    const row: Record<string, any> = {};
                    validColumns.forEach((col, index) => {
                        row[col] = values[index]?.trim() || null;
                    });
                    return row;
                });

            // Insert the data in chunks to avoid large queries
            const chunkSize = 1000;
            let insertedCount = 0;

            for (let i = 0; i < dataRows.length; i += chunkSize) {
                const chunk = dataRows.slice(i, i + chunkSize);
                await client.insert({
                    table: tableName,
                    values: chunk,
                    format: "JSONEachRow",
                });
                insertedCount += chunk.length;
            }

            return {
                success: true,
                count: insertedCount,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    // Helper method to convert a stream to a string
    private streamToString(stream: Readable): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("error", (err) => reject(err));
            stream.on("end", () =>
                resolve(Buffer.concat(chunks).toString("utf8"))
            );
        });
    }

    async exportToFlatFile(config: DataTransferConfig): Promise<{
        success: boolean;
        count?: number;
        fileContent?: string;
        error?: string;
    }> {
        if (
            config.source.type !== "clickhouse" ||
            config.target.type !== "flatfile"
        ) {
            throw new Error("Invalid source or target type");
        }

        const client = ClientManager.getClient(config.source.connection);

        try {
            const tableName = config.source.table;
            const columns = config.source.columns;
            const delimiter = config.target.delimiter || ",";

            // Query the data
            const columnsStr = columns.length > 0 ? columns.join(", ") : "*";
            const query = `SELECT ${columnsStr} FROM ${config.source.connection.database}.${tableName}`;

            const result = await (
                await client.query({ query, format: "JSONEachRow" })
            ).json();

            // Prepare the data for CSV generation
            const rows = [];

            // Add header row (column names)
            rows.push(columns);

            // Add data rows
            for (const row of result as any[]) {
                const dataRow = columns.map((col) => {
                    const value = row[col];
                    return value !== null && value !== undefined ? value : "";
                });
                rows.push(dataRow);
            }

            const fileContent = stringify(rows, {
                delimiter,
                header: false, // We already included the header row in our data
            });

            // Return the CSV content
            return {
                success: true,
                count: rows.length - 1, // Subtract 1 for header row
                fileContent,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
}

export const clickhouseService = new ClickHouseService();
