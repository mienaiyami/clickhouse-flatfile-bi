import { createContext, useContext, useState, ReactNode } from "react";

export type ConnectionConfig = {
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    jwtToken?: string;
    protocol: "http" | "https";
};

type ConnectionContextType = {
    connection: ConnectionConfig | null;
    isConnected: boolean;
    tables: string[];
    selectedTable: string;
    setConnection: (connection: ConnectionConfig) => void;
    setIsConnected: (isConnected: boolean) => void;
    setTables: (tables: string[]) => void;
    setSelectedTable: (table: string) => void;
    clearConnection: () => void;
};

const defaultConnection: ConnectionConfig = {
    host: "localhost",
    port: 8123,
    database: "system",
    username: "default",
    password: "password",
    protocol: "http",
};

const ConnectionContext = createContext<ConnectionContextType | undefined>(
    undefined
);

export function ConnectionProvider({ children }: { children: ReactNode }) {
    const [connection, setConnection] = useState<ConnectionConfig | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>("");

    const clearConnection = () => {
        setConnection(null);
        setIsConnected(false);
        setTables([]);
        setSelectedTable("");
    };

    return (
        <ConnectionContext.Provider
            value={{
                connection,
                isConnected,
                tables,
                selectedTable,
                setConnection,
                setIsConnected,
                setTables,
                setSelectedTable,
                clearConnection,
            }}
        >
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnection() {
    const context = useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error(
            "useConnection must be used within a ConnectionProvider"
        );
    }
    return context;
}

export { defaultConnection };
