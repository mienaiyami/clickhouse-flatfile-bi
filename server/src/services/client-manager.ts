import { ClickHouseClient } from "@clickhouse/client";
import { createClient } from "@clickhouse/client";
import { ClickHouseConnection } from "../validators";

// Interface to track client with its creation time
interface ClientInfo {
    client: ClickHouseClient;
    createdAt: number; // Timestamp when the client was created
    lastUsed: number; // Timestamp when the client was last used
}

export class ClientManager {
    private static clients: Map<string, ClientInfo> = new Map();
    private static expirationTimeMs: number = 30 * 60 * 1000; // 30 minutes
    private static cleanupIntervalId: NodeJS.Timeout | null = null;

    /**
     * Get a client for the given connection configuration.
     * If a client already exists for this connection, return it.
     * Otherwise, create a new client.
     */
    public static getClient(config: ClickHouseConnection): ClickHouseClient {
        const key = this.getClientKey(config);
        const clientInfo = this.clients.get(key);

        if (clientInfo) {
            // Update the last used timestamp
            clientInfo.lastUsed = Date.now();
            return clientInfo.client;
        }

        const client = this.createClient(config);
        this.clients.set(key, {
            client,
            createdAt: Date.now(),
            lastUsed: Date.now(),
        });

        // Start cleanup interval if not already started
        this.startCleanupInterval();

        return client;
    }

    /**
     * Create a client key based on connection parameters
     */
    private static getClientKey(config: ClickHouseConnection): string {
        return `${config.host}:${config.port}:${config.database}:${
            config.username
        }:${config.jwtToken || config.password}`;
    }

    private static createClient(
        config: ClickHouseConnection
    ): ClickHouseClient {
        const options = {
            url: `${config.protocol || "http"}://${config.host}:${config.port}`,
            username: config.username,
            password: config.password || config.jwtToken,
            database: config.database,
        };

        // Add TLS options if needed
        // if (config.protocol === "https") {
        //     options.tls = {
        //         rejectUnauthorized: false,
        //     };
        // }

        return createClient(options);
    }

    /**
     * Start the interval that periodically checks for expired connections
     */
    private static startCleanupInterval(): void {
        // Only start if not already running
        if (!this.cleanupIntervalId) {
            this.cleanupIntervalId = setInterval(() => {
                this.cleanupExpiredConnections();
            }, 5 * 60 * 1000); // Check every 5 minutes
        }
    }

    /**
     * Clean up expired connections
     */
    private static async cleanupExpiredConnections(): Promise<void> {
        const now = Date.now();
        const expiredKeys: string[] = [];

        // Find expired clients
        for (const [key, clientInfo] of this.clients.entries()) {
            if (now - clientInfo.lastUsed > this.expirationTimeMs) {
                expiredKeys.push(key);
            }
        }

        // Close and remove expired clients
        for (const key of expiredKeys) {
            const clientInfo = this.clients.get(key);
            if (clientInfo) {
                try {
                    await clientInfo.client.close();
                    console.log(`Closed expired client connection: ${key}`);
                } catch (error) {
                    console.error(`Error closing expired client: ${error}`);
                }
                this.clients.delete(key);
            }
        }

        // If no more clients, clear the interval
        if (this.clients.size === 0 && this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
    }

    public static async closeClient(
        config: ClickHouseConnection
    ): Promise<void> {
        const key = this.getClientKey(config);
        const clientInfo = this.clients.get(key);

        if (clientInfo) {
            await clientInfo.client.close();
            this.clients.delete(key);
        }
    }

    public static async closeAllClients(): Promise<void> {
        for (const clientInfo of this.clients.values()) {
            await clientInfo.client.close();
        }
        this.clients.clear();

        // Clear cleanup interval if it exists
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
    }

    /**
     * Set the expiration time for connections
     * @param timeMs The expiration time in milliseconds
     */
    public static setExpirationTime(timeMs: number): void {
        this.expirationTimeMs = timeMs;
    }
}
