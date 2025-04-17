# ClickHouse Flatfile BI

A web application for seamless data transfer between ClickHouse databases and flat files (CSV).

Live demo: <https://clickhouse-flatfile-bi.vercel.app/>

## Overview

This application provides a user-friendly interface for:

- Connecting to ClickHouse databases
- Exploring database schema and data
- Importing CSV files into ClickHouse tables
- Exporting ClickHouse tables to CSV files
- Previewing data before import/export operations

## Architecture

The project consists of two main components:

### Client (React + TypeScript)

- Modern React application with TypeScript
- Context-based state management
- Form validation with React Hook Form and Zod
- Responsive UI using shadcn/ui components

### Server (Node.js + Express + TypeScript)

- RESTful API built with Express
- ClickHouse client integration
- File stream handling for uploads/downloads
- Validation middleware
- Connection pooling and management

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm package manager
- ClickHouse server instance (or Docker)

### Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/clickhouse-flatfile-bi.git
cd clickhouse-flatfile-bi
```

2. Start the development environment with Docker (optional)

```bash
docker-compose up -d
```

3. Install dependencies and start the server

```bash
cd server
pnpm install
pnpm start
```

4. Install dependencies and start the client

```bash
cd client
pnpm install
pnpm dev
```

5. Access the application at <http://localhost:5173>

## Features

- **Connection Management**: Save and manage multiple ClickHouse connections
- **Database Explorer**: Browse tables and their schemas
- **Data Preview**: View sample data before transferring
- **CSV Import**: Upload CSV files with configurable delimiters and headers
- **Data Export**: Export query results to CSV files
- **Validation**: Form and data validation to prevent errors
- **Error Handling**: Clear error messages for troubleshooting
