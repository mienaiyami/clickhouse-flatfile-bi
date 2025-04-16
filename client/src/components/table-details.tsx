import { useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ColumnInfo = {
    name: string;
    type: string;
};

export function TableDetails() {
    const {
        connection,
        isConnected,
        tables,
        selectedTable,
        setSelectedTable,
        setTables,
    } = useConnection();

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

    const { data: columns, error } = useSWR(
        connection && selectedTable
            ? ["/columns", connection, selectedTable]
            : null,
        () =>
            selectedTable && connection
                ? apiService.getColumns(connection, selectedTable)
                : null
    );

    if (!isConnected) {
        return (
            <Alert>
                <AlertDescription>
                    Please connect to ClickHouse first to view tables and
                    columns.
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

            {selectedTable && (
                <Card>
                    <CardHeader>
                        <CardTitle>Columns for {selectedTable}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Error loading columns:{" "}
                                    {error instanceof Error
                                        ? error.message
                                        : String(error)}
                                </AlertDescription>
                            </Alert>
                        ) : !columns ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <Table>
                                <TableCaption>
                                    Columns for table {selectedTable}
                                </TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {columns.map((column: ColumnInfo) => (
                                        <TableRow key={column.name}>
                                            <TableCell>{column.name}</TableCell>
                                            <TableCell>{column.type}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
