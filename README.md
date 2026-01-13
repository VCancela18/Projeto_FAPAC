# Express REST API Server

A simple Node.js REST API built with Express that demonstrates fundamental server concepts including routing, middleware, error handling, and external API integration.

## Features

- **Basic Routing**: Simple endpoints for testing and health monitoring
- **Request Logging Middleware**: Tracks request duration for all endpoints
- **Error Handling**: Global error middleware for consistent error responses
- **External API Integration**: Fetches data from JSONPlaceholder API
- **Query Parameter Processing**: Demonstrates parameter validation and usage

## Prerequisites

- Node.js
- npm (comes with Node.js)

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the server:
```bash
node server.js
```

The server will start on port 3001 (or the port specified in the `PORT` environment variable).

## API Endpoints

### `GET /`
Returns a simple "Hello World!" message.

**Example:**
```bash
curl http://localhost:3001/\
```
Or navigate to http://localhost:3001/ on your browser, or use Postman.

### `GET /health`
Returns the server health status and current timestamp.

**Response:**
```json
{
  "status": "active",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

### `GET /time`
Returns the current server time in ISO format.

**Example:**
```bash
curl http://localhost:3001/time
```

### `GET /echo`
Echoes back query parameters. Requires at least one of `category` or `color` parameters.

**Parameters:**
- `category` (optional): Any string value
- `color` (optional): Any string value

**Example:**
```bash
curl "http://localhost:3001/echo?category=books&color=blue"
```

**Response:**
```json
{
  "ok": true,
  "category": "books",
  "color": "blue"
}
```

### `GET /external`
Fetches posts from the JSONPlaceholder API.

**Parameters:**
- `userId` (optional, default: 1): User ID to filter posts
- `limit` (optional, default: 5): Maximum number of posts to return

**Example:**
```bash
curl "http://localhost:3001/external?userId=2&limit=3"
```

**Response:**
```json
{
  "ok": true,
  "data": [...],
  "params": {
    "userId": "2",
    "limit": "3"
  }
}
```

### `GET /error-route`
Intentionally throws an error to demonstrate error handling.

**Response:**
```json
{
  "ok": false,
  "error": "Something went wrong!"
}
```

## Project Structure

```
.
├── utils/              # Reusable utility functions and helper modules. Includes data validation, formatting, logging, and common operations
├── src/                # Main source code directory containing the application logic
│   ├── controllers/    # Business logic handlers that process requests and return responses. Each controller manages specific functionality (users, models, auth, etc.)
│   ├── middleware/     # Custom Express middleware functions for request processing. Includes authentication, validation, logging, and error handling
│   └── routes/         # API route definitions that map URLs to controller functions. Organized by feature or resource (user routes, model routes, etc.)
├── public/             # Static assets served directly by the web server
│   ├── css/            # Cascading Style Sheets for frontend styling and layout
│   ├── js/             # Client-side JavaScript files for browser functionality
│   ├── images/         # Static image assets (logos, icons, backgrounds, etc.)
│   └── html/           # Static HTML files and templates
├── app.js              # Main Express application setup with middleware configuration and route mounting
├── server.js           # Server entry point that starts the HTTP server and binds to a port
├── package.json        # Node.js project metadata, dependencies, scripts, and configuration
├── .env                # Environment-specific variables (API keys, database URLs, secrets). # This file is not tracked in version control for security
├── .env.example        # Template showing required environment variables without sensitive values
├── .gitignore          # Specifies files and directories to exclude from Git version control
└── README.md           # Project documentation with setup instructions and API reference
```

## Error Handling

All errors are caught by the global error middleware and returned in a consistent format:

```json
{
  "ok": false,
  "error": "Error message here"
}
```

## IFC Viewer (upload + preview)

This project includes a simple IFC viewer that allows uploading a `.ifc` file from your browser and visualizing it.

- Install the new dependencies:

```bash
npm install web-ifc-viewer three multer
```

- Start the server:

```bash
node server.js
```

- Open the viewer page in your browser:

```
http://localhost:3000/ifc-viewer
```

- Use the form to select a `.ifc` file and click **Upload e Visualizar**. The file is saved to `public/uploads` and returned as a URL for the viewer to load.

Notes:
- Only `.ifc` files are accepted and uploads are limited to ~200MB by default.
- Upload endpoint: `POST /api/ifc/upload` (field name: `ifcFile`).

---

## License

ISC