# ClickHouse & Flat File Bidirectional Data Ingestion Server

A Node.js Express backend for handling bidirectional data transfer between ClickHouse databases and flat files (CSV).

## Features

- Connect to ClickHouse databases with username/password or JWT token authentication
- Fetch table schemas, columns, and preview data
- Import data from CSV files to ClickHouse tables
- Export data from ClickHouse tables to CSV files
- Bidirectional data flow

## Prerequisites

- Node.js 18+
- pnpm (Preferred package manager)
- ClickHouse database access

## Project Setup

1. Clone the repository
2. Install dependencies

```powershell
pnpm install
```

3. Create a `.env` file based on `.env.example` with your configuration

```
PORT=3000
CLIENT_URL=http://localhost:5173
```

4. Start the development server

```powershell
pnpm dev
```

5. Build for production

```powershell
pnpm build
```

6. Start the production server

```powershell
pnpm start
```

## Docker Setup

Build and run the Docker container:

```powershell
docker build -t clickhouse-flatfile-server .
docker run -p 3000:3000 clickhouse-flatfile-server
```

## API Endpoints

All endpoints accept POST requests and require ClickHouse connection details in the request body.

### Connection Validation

```
POST /api/ingestion/check-connection
```

Body:

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

### Get Tables

```
POST /api/ingestion/get-tables
```

Body: Same as check-connection

### Get Table Schema

```
POST /api/ingestion/get-schema
```

Body:

```json
{
  "host": "localhost",
  "port": 8123,
  "database": "default",
  "username": "default",
  "password": "password",
  "protocol": "http",
  "table": "example_table"
}
```

### Get Columns

```
POST /api/ingestion/get-columns
```

Body: Same as get-schema

### Preview Data

```
POST /api/ingestion/preview-data
```

Body:

```json
{
  "host": "localhost",
  "port": 8123,
  "database": "default",
  "username": "default",
  "password": "password",
  "protocol": "http",
  "table": "example_table",
  "columns": ["id", "name", "created_at"]
}
```

### Import Data (Flat File to ClickHouse)

```
POST /api/ingestion/import
```

Body:

```json
{
  "source": {
    "type": "flatfile",
    "filePath": "/path/to/file.csv",
    "delimiter": ","
  },
  "target": {
    "type": "clickhouse",
    "connection": {
      "host": "localhost",
      "port": 8123,
      "database": "default",
      "username": "default",
      "password": "password",
      "protocol": "http"
    },
    "table": "example_table"
  }
}
```

### Export Data (ClickHouse to Flat File)

```
POST /api/ingestion/export
```

Body:

```json
{
  "source": {
    "type": "clickhouse",
    "connection": {
      "host": "localhost",
      "port": 8123,
      "database": "default",
      "username": "default",
      "password": "password",
      "protocol": "http"
    },
    "table": "example_table",
    "columns": ["id", "name", "created_at"]
  },
  "target": {
    "type": "flatfile",
    "filePath": "/path/to/output.csv",
    "delimiter": ","
  }
}
```

## JWT Authentication

For ClickHouse instances that require JWT authentication, include the JWT token in the request:

```json
{
  "host": "clickhouse.example.com",
  "port": 8443,
  "database": "default",
  "username": "user",
  "jwtToken": "your.jwt.token",
  "protocol": "https"
}
```
