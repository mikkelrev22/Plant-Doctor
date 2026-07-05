# Backend API Endpoints

This document lists the available API endpoints for the Node.js backend (Fastify).

## Base URL
Default: `http://localhost:4100`

---

## Root

### GET /
Returns a simple message confirming the backend is running.
- **Response**: `{ "message": "Node.js backend is running" }`

---

## Plants

### GET /plants
Lists preview plants for the Research User dropdown.
- **Response**: Array of plant objects from the database.

### POST /plants
Creates a plant for the Research User. If no name is provided, a friendly name is generated.
- **Body**: `{ "name": "string" }` (optional)
- **Response**: The created plant object.

### GET /plants/:plantId/reports
Returns the report history for a specific Research User plant.
- **Parameters**: `plantId` (integer)
- **Response**: Array of report summaries for the specified plant.

---

## Reports

### GET /reports/:reportId
Returns a full report including photo details, stress checklist, and LLM log summary.
- **Parameters**: `reportId` (integer)
- **Response**: Detailed report object or 404 if not found.

### POST /reports/analyze
Uploads a plant image, requests an LLM diagnosis, logs the request, and stores the resulting report.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `image` (file, required): The plant photo to analyze.
  - `plantId` (string, optional): ID of an existing plant.
  - `plantName` (string, optional): Name for a new or existing plant.
- **Response**: `{ "plant": { ... }, "report": { ... } }`
- **Errors**: 502 Bad Gateway if LLM analysis fails.

---

## Stress Signs

### GET /stress-signs
Returns the seeded stress checklist and the stress-variable taxonomy (nutrients, water, light, etc.).
- **Response**: Object containing stress signs and their associations.

---

## Static Files

### GET /uploads/plant-photos/*
Serves uploaded plant photos.
- **Example**: `/uploads/plant-photos/abcd-1234.jpg`
