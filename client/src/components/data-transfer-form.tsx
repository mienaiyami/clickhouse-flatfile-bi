import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { useConnection } from "@/contexts/connection-context";
import { apiService } from "@/services/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Download,
    UploadCloud,
    Database,
    FileText,
} from "lucide-react";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

type ColumnInfo = {
    name: string;
    type: string;
};

const exportSchema = z.object({
    source: z.object({
        table: z.string().min(1, { message: "Table is required" }),
        columns: z
            .array(z.string())
            .min(1, { message: "Select at least one column" }),
    }),
    target: z.object({
        delimiter: z
            .string()
            .min(1, { message: "Delimiter is required" })
            .default(","),
    }),
});

const importSchema = z.object({
    source: z.object({
        delimiter: z
            .string()
            .min(1, { message: "Delimiter is required" })
            .default(","),
        hasHeaders: z.boolean().default(true),
    }),
    target: z.object({
        table: z.string().min(1, { message: "Table name is required" }),
    }),
});

type ExportFormValues = z.infer<typeof exportSchema>;
type ImportFormValues = z.infer<typeof importSchema>;

export function DataTransferForm() {
    const {
        connection,
        isConnected,
        tables,
        selectedTable,
        setSelectedTable,
        setTables,
    } = useConnection();
    const [activeTab, setActiveTab] = useState<string>("export");
    const [selectedExportTable, setSelectedExportTable] = useState<string>("");
    const [selectedExportColumns, setSelectedExportColumns] = useState<
        string[]
    >([]);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferResult, setTransferResult] = useState<{
        success: boolean;
        message: string;
        count?: number;
        fileContent?: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (selectedTable && selectedTable !== selectedExportTable) {
            setSelectedExportTable(selectedTable);
            exportForm.setValue("source.table", selectedTable);
            setSelectedExportColumns([]);
            exportForm.setValue("source.columns", []);
        }
    }, [selectedTable]);

    useEffect(() => {
        const fetchTables = async () => {
            if (connection && isConnected && tables.length === 0) {
                try {
                    const fetchedTables = await apiService.getTables(
                        connection
                    );
                    setTables(fetchedTables);
                } catch (error) {
                    console.error("Failed to load tables:", error);
                }
            }
        };

        fetchTables();
    }, [connection, isConnected, tables.length]);

    const exportForm = useForm({
        resolver: zodResolver(exportSchema),
        defaultValues: {
            source: {
                table: "",
                columns: [],
            },
            target: {
                delimiter: ",",
            },
        } as ExportFormValues,
    });

    const importForm = useForm({
        resolver: zodResolver(importSchema),
        defaultValues: {
            source: {
                delimiter: ",",
                hasHeaders: true,
            },
            target: {
                table: "",
            },
        } as ImportFormValues,
    });

    const { data: columns, error: columnsError } = useSWR(
        connection && selectedExportTable
            ? ["/columns", connection, selectedExportTable]
            : null,
        () =>
            selectedExportTable && connection
                ? apiService.getColumns(connection, selectedExportTable)
                : null
    );

    const handleExportTableChange = (value: string) => {
        setSelectedExportTable(value);
        setSelectedTable(value); // Update shared context
        setSelectedExportColumns([]);
        exportForm.setValue("source.table", value);
        exportForm.setValue("source.columns", []);
    };

    const handleExportColumnToggle = (columnName: string) => {
        const updatedColumns = selectedExportColumns.includes(columnName)
            ? selectedExportColumns.filter((col) => col !== columnName)
            : [...selectedExportColumns, columnName];

        setSelectedExportColumns(updatedColumns);
        exportForm.setValue("source.columns", updatedColumns);
    };

    const handleSelectAllColumns = () => {
        if (columns) {
            const allColumnNames = columns.map((col) => col.name);
            setSelectedExportColumns(allColumnNames);
            exportForm.setValue("source.columns", allColumnNames);
        }
    };

    const handleDeselectAllColumns = () => {
        setSelectedExportColumns([]);
        exportForm.setValue("source.columns", []);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const onExport = async (values: ExportFormValues) => {
        if (!connection) return;

        setTransferLoading(true);
        setTransferResult(null);

        try {
            const config = {
                source: {
                    type: "clickhouse" as const,
                    connection: connection,
                    table: values.source.table,
                    columns: values.source.columns,
                },
                target: {
                    type: "flatfile" as const,
                    delimiter: values.target.delimiter,
                },
            };

            const result = await apiService.exportData(config);

            if (result.success) {
                setTransferResult({
                    success: true,
                    message: `Export successful. ${result.count} rows exported.`,
                    count: result.count,
                    fileContent: result.fileContent,
                });

                // Trigger file download if there's content
                if (result.fileContent) {
                    const blob = new Blob([result.fileContent], {
                        type: "text/csv",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${values.source.table}_export.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } else {
                setTransferResult({
                    success: false,
                    message: result.error || "Export failed",
                });
            }
        } catch (error) {
            setTransferResult({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "An unknown error occurred",
            });
        } finally {
            setTransferLoading(false);
        }
    };

    const onImport = async (values: ImportFormValues) => {
        if (!connection || !selectedFile) return;

        setTransferLoading(true);
        setTransferResult(null);

        try {
            const config = {
                source: {
                    type: "flatfile" as const,
                    delimiter: values.source.delimiter,
                },
                target: {
                    type: "clickhouse" as const,
                    connection: connection,
                    table: values.target.table,
                },
            };

            const result = await apiService.importDataWithFile(
                config,
                selectedFile
            );

            setTransferResult({
                success: result.success,
                message: result.success
                    ? `Import successful. ${result.count} rows imported.`
                    : result.error || "Import failed",
                count: result.count,
            });
        } catch (error) {
            console.log(error);
            setTransferResult({
                success: false,
                message:
                    error instanceof Error
                        ? JSON.stringify(
                              (error as any)?.response?.data?.details,
                              null,
                              2
                          ) ||
                          JSON.stringify(
                              (error as any)?.response?.data?.error,
                              null,
                              2
                          ) ||
                          error.message
                        : "An unknown error occurred",
            });
        } finally {
            setTransferLoading(false);
        }
    };

    const downloadExport = async () => {
        if (
            !connection ||
            !exportForm.getValues().source.table ||
            !exportForm.getValues().source.columns.length
        )
            return;

        setTransferLoading(true);

        try {
            const config = {
                source: {
                    type: "clickhouse" as const,
                    connection: connection,
                    table: exportForm.getValues().source.table,
                    columns: exportForm.getValues().source.columns,
                },
                target: {
                    type: "flatfile" as const,
                    delimiter: exportForm.getValues().target.delimiter,
                },
            };

            const blob = await apiService.downloadExport(config);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${exportForm.getValues().source.table}_export.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setTransferResult({
                success: true,
                message: "File downloaded successfully",
            });
        } catch (error) {
            setTransferResult({
                success: false,
                message:
                    error instanceof Error ? error.message : "Download failed",
            });
        } finally {
            setTransferLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <Alert>
                <AlertDescription>
                    Please connect to ClickHouse first to perform data
                    transfers.
                </AlertDescription>
            </Alert>
        );
    }

    if (tables.length === 0) {
        return (
            <Alert>
                <AlertDescription>
                    No tables found in the connected database. Please ensure
                    your database has tables or check your connection settings.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="export">
                        <Database className="mr-2 h-4 w-4" />
                        Export to File
                    </TabsTrigger>
                    <TabsTrigger value="import">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import from File
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="export">
                    <Card>
                        <CardHeader>
                            <CardTitle>Export Data from ClickHouse</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...exportForm}>
                                <form
                                    onSubmit={exportForm.handleSubmit(onExport)}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <FormLabel>Table</FormLabel>
                                            <Select
                                                value={selectedExportTable}
                                                onValueChange={
                                                    handleExportTableChange
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a table" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tables.map((table) => (
                                                        <SelectItem
                                                            key={table}
                                                            value={table}
                                                        >
                                                            {table}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {selectedExportTable && columns && (
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <FormLabel>
                                                        Columns
                                                    </FormLabel>
                                                    <div className="space-x-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={
                                                                handleSelectAllColumns
                                                            }
                                                            size="sm"
                                                        >
                                                            Select All
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={
                                                                handleDeselectAllColumns
                                                            }
                                                            size="sm"
                                                        >
                                                            Deselect All
                                                        </Button>
                                                    </div>
                                                </div>

                                                {columnsError ? (
                                                    <Alert variant="destructive">
                                                        <AlertDescription>
                                                            Error loading
                                                            columns:{" "}
                                                            {columnsError instanceof
                                                            Error
                                                                ? columnsError.message
                                                                : String(
                                                                      columnsError
                                                                  )}
                                                        </AlertDescription>
                                                    </Alert>
                                                ) : (
                                                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {columns.map(
                                                                (
                                                                    column: ColumnInfo
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            column.name
                                                                        }
                                                                        className="flex items-center space-x-2"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`column-${column.name}`}
                                                                            checked={selectedExportColumns.includes(
                                                                                column.name
                                                                            )}
                                                                            onChange={() =>
                                                                                handleExportColumnToggle(
                                                                                    column.name
                                                                                )
                                                                            }
                                                                        />
                                                                        <Label
                                                                            htmlFor={`column-${column.name}`}
                                                                        >
                                                                            {
                                                                                column.name
                                                                            }{" "}
                                                                            <span className="text-muted-foreground">
                                                                                (
                                                                                {
                                                                                    column.type
                                                                                }

                                                                                )
                                                                            </span>
                                                                        </Label>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {exportForm.formState.errors
                                                    .source?.columns && (
                                                    <p className="text-destructive text-sm mt-1">
                                                        {
                                                            exportForm.formState
                                                                .errors.source
                                                                .columns.message
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <FormField
                                            control={exportForm.control}
                                            name="target.delimiter"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Delimiter
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder=","
                                                            {...field}
                                                            maxLength={1}
                                                            className="w-20"
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Character used to
                                                        separate fields in the
                                                        output file
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex space-x-4">
                                        <Button
                                            type="submit"
                                            disabled={
                                                transferLoading ||
                                                !selectedExportTable ||
                                                selectedExportColumns.length ===
                                                    0
                                            }
                                        >
                                            {transferLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Exporting...
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Export to File
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={downloadExport}
                                            disabled={
                                                transferLoading ||
                                                !selectedExportTable ||
                                                selectedExportColumns.length ===
                                                    0
                                            }
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Directly
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Data to ClickHouse</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...importForm}>
                                <form
                                    onSubmit={importForm.handleSubmit(onImport)}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <FormLabel>File</FormLabel>
                                            <div className="flex items-center gap-4">
                                                <Input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".csv,.txt"
                                                    onChange={handleFileChange}
                                                    className="flex-1"
                                                />
                                                {selectedFile && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedFile(
                                                                null
                                                            );
                                                            if (
                                                                fileInputRef.current
                                                            ) {
                                                                fileInputRef.current.value =
                                                                    "";
                                                            }
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                            {!selectedFile &&
                                                importForm.formState
                                                    .isSubmitted && (
                                                    <p className="text-destructive text-sm mt-1">
                                                        Please select a file
                                                    </p>
                                                )}
                                        </div>

                                        <FormField
                                            control={importForm.control}
                                            name="source.delimiter"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Delimiter
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder=","
                                                            {...field}
                                                            maxLength={1}
                                                            className="w-20"
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Character used to
                                                        separate fields in the
                                                        input file
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={importForm.control}
                                            name="source.hasHeaders"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                field.value
                                                            }
                                                            onChange={
                                                                field.onChange
                                                            }
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            File has headers
                                                        </FormLabel>
                                                        <FormDescription>
                                                            First row of the
                                                            file contains column
                                                            names
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={importForm.control}
                                            name="target.table"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Target Table
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter table name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        The table must exist in
                                                        the ClickHouse database
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={
                                            transferLoading || !selectedFile
                                        }
                                    >
                                        {transferLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="mr-2 h-4 w-4" />
                                                Import to ClickHouse
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {transferResult && (
                <Alert
                    variant={transferResult.success ? "default" : "destructive"}
                >
                    <AlertDescription>
                        {transferResult.message}
                        {transferResult.count !== undefined && (
                            <span className="font-medium">
                                {" "}
                                ({transferResult.count} rows affected)
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
