import axios from "axios";
import { ConnectionConfig } from "@/contexts/connection-context";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000/api/ingestion";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

type ValidationResult = {
    success: boolean;
    error?: string;
};

type TableSchema = {
    table: string;
    columns: {
        name: string;
        type: string;
        defaultType?: string;
        defaultExpression?: string;
    }[];
};

type ColumnInfo = {
    name: string;
    type: string;
};

type DataTransferConfig = {
    source: {
        type: "clickhouse" | "flatfile";
        connection?: ConnectionConfig;
        table?: string;
        columns?: string[];
        fileContent?: string;
        streamId?: string;
        delimiter?: string;
        fileName?: string;
    };
    target: {
        type: "clickhouse" | "flatfile";
        connection?: ConnectionConfig;
        table?: string;
        delimiter?: string;
    };
};

type TransferResult = {
    success: boolean;
    count?: number;
    fileContent?: string;
    error?: string;
};

export const apiService = {
    checkConnection: async (
        config: ConnectionConfig
    ): Promise<ValidationResult> => {
        const response = await api.post("/check-connection", config);
        return response.data;
    },

    // Get tables
    getTables: async (config: ConnectionConfig): Promise<string[]> => {
        const response = await api.post("/tables", config);
        return response.data;
    },

    // Get columns for a table
    getColumns: async (
        config: ConnectionConfig,
        table: string
    ): Promise<ColumnInfo[]> => {
        const response = await api.post("/columns", { ...config, table });
        return response.data;
    },

    // Get table schema
    getTableSchema: async (
        config: ConnectionConfig,
        table: string
    ): Promise<TableSchema> => {
        const response = await api.post("/schema", { ...config, table });
        return response.data;
    },

    // Preview data
    previewData: async (
        config: ConnectionConfig,
        table: string,
        columns: string[]
    ): Promise<any[]> => {
        const response = await api.post("/preview", {
            ...config,
            table,
            columns,
        });
        return response.data;
    },

    // Export data (ClickHouse to flat file)
    exportData: async (config: DataTransferConfig): Promise<TransferResult> => {
        const response = await api.post("/export", config);
        return response.data;
    },

    // Import data (flat file to ClickHouse)
    importData: async (config: DataTransferConfig): Promise<TransferResult> => {
        const response = await api.post("/import", config);
        return response.data;
    },

    // Import data with file upload
    importDataWithFile: async (
        config: DataTransferConfig,
        file: File
    ): Promise<TransferResult> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("body", JSON.stringify(config));

        const response = await api.post("/import", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    // Download exported data
    downloadExport: async (config: DataTransferConfig): Promise<Blob> => {
        const response = await api.post("/stream-export", config, {
            responseType: "blob",
        });
        return response.data;
    },
};
