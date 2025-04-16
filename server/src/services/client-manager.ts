import { ClickHouseClient } from "@clickhouse/client";
import { createClient } from "@clickhouse/client";
import { ClickHouseConnection } from "../validators";

export class ClientManager {
    private static clients: Map<string, ClickHouseClient> = new Map();

    /**
     * Get a client for the given connection configuration.
     * If a client already exists for this connection, return it.
     * Otherwise, create a new client.
     */
    public static getClient(config: ClickHouseConnection): ClickHouseClient {
        const key = this.getClientKey(config);
        let client = this.clients.get(key);

        if (!client) {
            client = this.createClient(config);
            this.clients.set(key, client);
        }
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

    public static async closeClient(
        config: ClickHouseConnection
    ): Promise<void> {
        const key = this.getClientKey(config);
        const client = this.clients.get(key);

        if (client) {
            await client.close();
            this.clients.delete(key);
        }
    }

    public static async closeAllClients(): Promise<void> {
        for (const client of this.clients.values()) {
            await client.close();
        }
        this.clients.clear();
    }
}
