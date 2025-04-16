import { useState, useEffect } from "react";
import useSWR from "swr";
import { useConnection } from "@/contexts/connection-context";
import { apiService } from "@/services/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type ColumnInfo = {
    name: string;
    type: string;
};

export function DataPreview() {
    const {
        connection,
        isConnected,
        tables,
        selectedTable,
        setSelectedTable,
        setTables,
    } = useConnection();
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        setSelectedColumns([]);
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

    const { data: columns, error: columnsError } = useSWR(
        connection && selectedTable
            ? ["/columns", connection, selectedTable]
            : null,
        () =>
            selectedTable && connection
                ? apiService.getColumns(connection, selectedTable)
                : null
    );

    const {
        data: previewData,
        error: previewError,
        mutate: refreshPreview,
    } = useSWR(
        connection && selectedTable && selectedColumns.length > 0
            ? ["/preview", connection, selectedTable, selectedColumns]
            : null,
        () => {
            if (connection && selectedTable && selectedColumns.length > 0) {
                setIsPreviewLoading(true);
                return apiService
                    .previewData(connection, selectedTable, selectedColumns)
                    .finally(() => setIsPreviewLoading(false));
            }
            return null;
        }
    );

    const handleColumnToggle = (columnName: string) => {
        setSelectedColumns((prev) => {
            if (prev.includes(columnName)) {
                return prev.filter((col) => col !== columnName);
            } else {
                return [...prev, columnName];
            }
        });
    };

    const handleSelectAllColumns = () => {
        if (columns) {
            setSelectedColumns(columns.map((col) => col.name));
        }
    };

    const handleDeselectAllColumns = () => {
        setSelectedColumns([]);
    };

    if (!isConnected) {
        return (
            <Alert>
                <AlertDescription>
                    Please connect to ClickHouse first to preview data.
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
            <Card>
                <CardHeader>
                    <CardTitle>Select Table</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedTable}
                        onValueChange={setSelectedTable}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                            {tables.map((table) => (
                                <SelectItem key={table} value={table}>
                                    {table}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedTable && columns && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Columns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {columnsError ? (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Error loading columns:{" "}
                                    {columnsError instanceof Error
                                        ? columnsError.message
                                        : String(columnsError)}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                <div className="flex space-x-4 mb-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleSelectAllColumns}
                                        size="sm"
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDeselectAllColumns}
                                        size="sm"
                                    >
                                        Deselect All
                                    </Button>
                                    <Button
                                        onClick={() => refreshPreview()}
                                        disabled={
                                            selectedColumns.length === 0 ||
                                            isPreviewLoading
                                        }
                                        size="sm"
                                    >
                                        {isPreviewLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            "Refresh Preview"
                                        )}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {columns.map((column: ColumnInfo) => (
                                        <div
                                            key={column.name}
                                            className="flex items-center space-x-2"
                                        >
                                            <Checkbox
                                                id={`column-${column.name}`}
                                                checked={selectedColumns.includes(
                                                    column.name
                                                )}
                                                onCheckedChange={() =>
                                                    handleColumnToggle(
                                                        column.name
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor={`column-${column.name}`}
                                            >
                                                {column.name}{" "}
                                                <span className="text-muted-foreground">
                                                    ({column.type})
                                                </span>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {selectedColumns.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {previewError ? (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Error loading preview:{" "}
                                    {previewError instanceof Error
                                        ? previewError.message
                                        : String(previewError)}
                                </AlertDescription>
                            </Alert>
                        ) : isPreviewLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : previewData && previewData.length > 0 ? (
                            <div className="border rounded-md overflow-auto max-h-96">
                                <Table className="w-full overflow-x-scroll">
                                    <TableCaption>
                                        Preview of {selectedTable} (max 20 rows)
                                    </TableCaption>
                                    <TableHeader>
                                        <TableRow>
                                            {selectedColumns.map((column) => (
                                                <TableHead key={column}>
                                                    {column}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                {selectedColumns.map(
                                                    (column) => (
                                                        <TableCell
                                                            key={`${rowIndex}-${column}`}
                                                        >
                                                            {String(
                                                                row[column] !==
                                                                    undefined
                                                                    ? row[
                                                                          column
                                                                      ]
                                                                    : ""
                                                            )}
                                                        </TableCell>
                                                    )
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <Alert>
                                <AlertDescription>
                                    No data to preview. Click "Refresh Preview"
                                    to load data.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
