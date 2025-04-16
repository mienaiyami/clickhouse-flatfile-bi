import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionForm } from "@/components/connection-form";
import { DataTransferForm } from "@/components/data-transfer-form";
import { TableDetails } from "@/components/table-details";
import { DataPreview } from "@/components/data-preview";
import { ConnectionProvider } from "@/contexts/connection-context";
import { ThemeProvider } from "./contexts/theme-provider";

function App() {
    return (
        <ConnectionProvider>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <div className="container mx-auto py-10">
                    <h1 className="text-3xl font-bold mb-6 text-center">
                        ClickHouse & Flat File Bidirectional Data Flow
                    </h1>

                    <Tabs defaultValue="connection" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="connection">
                                Connection
                            </TabsTrigger>
                            <TabsTrigger value="tables">
                                Tables & Columns
                            </TabsTrigger>
                            <TabsTrigger value="preview">
                                Data Preview
                            </TabsTrigger>
                            <TabsTrigger value="transfer">
                                Data Transfer
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="connection">
                            <div className="p-4 border rounded-md mt-4">
                                <h2 className="text-xl font-semibold mb-4">
                                    ClickHouse Connection
                                </h2>
                                <ConnectionForm />
                            </div>
                        </TabsContent>

                        <TabsContent value="tables">
                            <div className="p-4 border rounded-md mt-4">
                                <h2 className="text-xl font-semibold mb-4">
                                    Tables & Columns
                                </h2>
                                <TableDetails />
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="p-4 border rounded-md mt-4">
                                <h2 className="text-xl font-semibold mb-4">
                                    Data Preview
                                </h2>
                                <DataPreview />
                            </div>
                        </TabsContent>

                        <TabsContent value="transfer">
                            <div className="p-4 border rounded-md mt-4">
                                <h2 className="text-xl font-semibold mb-4">
                                    Data Transfer
                                </h2>
                                <DataTransferForm />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </ThemeProvider>
        </ConnectionProvider>
    );
}

export default App;
