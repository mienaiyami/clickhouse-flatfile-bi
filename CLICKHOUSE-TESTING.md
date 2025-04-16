# ClickHouse Testing Setup

This guide explains how to run a ClickHouse server for testing the bidirectional data flow application.

## Prerequisites

- Docker and Docker Compose installed on your machine
- PowerShell for running commands (or equivalent command line tool)

## Running ClickHouse with Docker Compose

1. Start the ClickHouse server:

```powershell
docker-compose up -d clickhouse
```

2. Verify the ClickHouse server is running:

```powershell
docker ps
```

You should see the `clickhouse_server` container running.

3. Test the connection to ClickHouse:

```powershell
Invoke-RestMethod -Uri "http://localhost:8123/ping"
```

You should receive an "Ok." response if the server is running correctly.

## Connection Details

Use these details to connect to the ClickHouse server from your application:

- Host: `localhost`
- HTTP Port: `8123`
- Native Protocol Port: `9000`
- Username: `default`
- Password: `password`
- Database: `default`

Example connection JSON for API calls:

```json
{
  "host": "localhost",
  "port": 8123,
  "database": "default",
  "username": "default",
  "password": "password",
  "protocol": "http"
}
```

## Interacting with ClickHouse

### Using HTTP Interface

You can interact with ClickHouse via HTTP requests:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8123/?user=default&password=password" -Body "SHOW DATABASES"
```

## Stopping the Server

When you're done testing, stop the ClickHouse server:

```powershell
docker-compose down
```

To remove the data volume as well:

```powershell
docker-compose down -v
```

## Troubleshooting

If you encounter any issues:

1. Check the ClickHouse logs:

```powershell
docker logs clickhouse_server
```

2. Ensure the ports 8123 and 9000 are not being used by other services.

3. Restart the container:

```powershell
docker-compose restart clickhouse
```
