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
import { Transform } from "stream";

export class ClickHouseService {
    async validateConnection(
        config: ClickHouseConnection
    ): Promise<ValidationResult> {
        try {
            const client = ClientManager.getClient(config);
            await client.ping();
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
            const filePath = path.resolve(config.source.filePath);
            const delimiter = config.source.delimiter || ",";

            // Parse the CSV file to get column names and sample data
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const lines = fileContent.split("\n");
            if (lines.length === 0) {
                throw new Error("Empty file");
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

    async exportToFlatFile(
        config: DataTransferConfig
    ): Promise<{ success: boolean; count?: number; error?: string }> {
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

            // Create a stream to write the data to a file
            const writeStream = fs.createWriteStream(config.target.filePath);

            // Create a transform stream to convert rows to CSV
            const transform = new Transform({
                objectMode: true,
                transform(chunk, encoding, callback) {
                    // Format as CSV
                    const row = columns
                        .map((col) => {
                            const value = chunk[col];
                            return value !== null && value !== undefined
                                ? String(value)
                                : "";
                        })
                        .join(delimiter);
                    callback(null, row + "\n");
                },
            });

            // Write headers
            writeStream.write(columns.join(delimiter) + "\n");

            // Query the data and pipe it to the file
            const columnsStr = columns.join(", ");
            const query = `SELECT ${columnsStr} FROM ${config.source.connection.database}.${tableName}`;

            // Create a readable stream from the query
            const stream = (await client.query({ query })).stream<any>();

            console.log({ stream });
            let count = 0;
            // stream.on("data", () => count++);

            // // Pipe the data through the transform stream to the file
            // await new Promise<void>((resolve, reject) => {
            //     stream
            //         .pipe(transform)
            //         .pipe(writeStream)
            //         .on("finish", () => {
            //             resolve();
            //         })
            //         .on("error", (err) => {
            //             reject(err);
            //         });
            // });

            return {
                success: true,
                count,
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
