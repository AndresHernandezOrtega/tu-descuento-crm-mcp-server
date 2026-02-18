# MCP Server - Tu Descuento Colombia - AI Coding Guide

## Architecture Overview

This is a **Model Context Protocol (MCP) Server** for Tu Descuento Colombia's AI support agent. It exposes an HTTP/SSE-based API that provides tools, prompts, and resources to AI agents for interacting with the Tu Descuento CRM.

**Key Components:**

- **Services** (`src/services/`): API client wrappers extending `BaseService`
- **Tools** (`src/tools/`): MCP tools (functions AI agents can call)
- **Types** (`src/types/`): Centralized TypeScript definitions organized by entity
- **Server** (`src/server.ts`): Express HTTP server with SSE transport for MCP

## Development Workflow

### Build & Run

```bash
npm run build      # Compile TypeScript + resolve path aliases with tsc-alias
npm start          # Run compiled server
npm run dev        # Build and run (no watch mode)
npm run watch      # Watch TypeScript compilation only
```

### Testing

Use **Postman** or similar HTTP clients to test MCP endpoints:

- **POST** `http://localhost:3000/mcp` with JSON-RPC 2.0 format
- See `POSTMAN_TESTS.md` for complete request examples
- All requests require `mcp-session-id` header (returned after `initialize` method)

## Critical Patterns

### 1. Service Architecture

All services **must** extend `BaseService` which provides:

- HTTP methods (`get`, `post`, `put`, `patch`, `delete`) returning `ApiResponse<T>`
- Automatic error handling and auth token injection
- No try-catch needed - errors are transformed to `{ success: false, error: {...} }`

```typescript
// src/services/example-service.ts
import { BaseService } from '@services/base-service.js'
import type { ApiResponse, YourEntity } from '@/types/index.js'

export class ExampleService extends BaseService {
  async getExample(id: number): Promise<ApiResponse<YourEntity>> {
    return this.get<YourEntity>(`/endpoint/${id}`)
  }
}
```

### 2. Type Organization

Types live in `src/types/entities/` with one file per CRM entity. **Always**:

- Define entity interfaces first
- Export response wrapper types (e.g., `PublicMembershipsResponse`)
- Export from `src/types/index.ts` for centralized imports
- Use string dates (`"2025-06-04T15:51:09.000000Z"`) not Date objects

```typescript
// src/types/entities/example.ts
export interface Example {
  id: number
  created_at: string // ISO string, not Date
  // ...
}

export interface ExampleResponse {
  example: Example
}
```

### 3. Tool Implementation Pattern

Tools are defined in `src/tools/` modules with **three required parts**:

1. **Tool Definition** (MCP schema):

```typescript
export const getExampleTool: Tool = {
  name: 'get_example',
  description: 'Detailed description for AI agent',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: '...' },
    },
    required: ['id'],
  },
}
```

2. **Handler Function** (async, returns MCP-formatted response):

```typescript
export async function handleGetExample(args: any) {
  const service = new ExampleService()
  const result = await service.getExample(args.id)

  if (!result.success || !result.data) {
    return {
      content: [{ type: 'text' as const, text: result.error?.message || 'Error' }],
      isError: true,
    }
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
  }
}
```

3. **Registration** in `src/tools/index.ts`:

```typescript
import { getExampleTool, handleGetExample } from '@tools/path/example.js'

export const tools: Tool[] = [
  // ... existing tools,
  getExampleTool,
]

export async function handleToolCall(request: CallToolRequest) {
  switch (request.params.name) {
    case 'get_example':
      return await handleGetExample(request.params.arguments)
    // ...
  }
}
```

### 4. Import Path Aliases

**Critical**: Use path aliases defined in `tsconfig.json`:

- `@/*` → `src/*`
- `@services/*` → `src/services/*`
- `@tools/*` → `src/tools/*`
- Always append `.js` extension: `from '@services/example-service.js'` (ES modules)

### 5. Multi-File Edits

When creating new tools/services, you'll typically modify **4 files**:

1. `src/types/entities/[entity].ts` - Define types
2. `src/types/index.ts` - Export types
3. `src/services/[entity]-service.ts` - Create service
4. `src/tools/[module]/[tool].ts` - Create tool + handler
5. `src/tools/index.ts` - Register tool

Use `multi_replace_string_in_file` to batch these edits efficiently.

## CRM API Integration

- Base URL: `process.env.TUDESCUENTO_API_URL`
- Auth: Bearer token from `process.env.TUDESCUENTO_API_KEY` (auto-injected)
- Response formats vary: `LaravelPaginatedResponse<T>`, `GenericEntityResponse<T>`, or direct arrays
- **Always** check response structure in API documentation before creating types

## Common Gotchas

1. **tsc-alias Required**: Build breaks without it - resolves `@/` paths after TypeScript compilation
2. **Type Consistency**: Backend sometimes returns `representante_legal: number` (ID) vs object - handle both with union types
3. **Tool Descriptions**: Make them detailed - they guide the AI agent's tool selection
4. **Error Handling**: Services return `ApiResponse<T>` - always check `.success` in tool handlers
5. **Session Management**: MCP requires stateful sessions - server tracks via `mcp-session-id` header

## Project Context

- **Purpose**: AI agent interface for Tu Descuento Colombia CRM system
- **Transport**: HTTP with Server-Sent Events (SSE) for MCP streaming
- **Primary Users**: AI assistants (Claude, GPT, etc.) via MCP protocol
- **Testing**: Manual via Postman using JSON-RPC 2.0 format (see `POSTMAN_TESTS.md`)
- **Deployment**: Docker-ready with health checks (`/health` endpoint)

## Documentation

- `ARCHITECTURE.md`: Comprehensive service/types/tools patterns with examples
- `README.md`: Setup, environment vars, API endpoints
- `POSTMAN_TESTS.md`: JSON-RPC request examples for all tools
- `src/types/README.md`: Type system organization

## Quick Reference: Adding a New Tool

```bash
# 1. Define entity types
# Edit: src/types/entities/new-entity.ts

# 2. Export types
# Edit: src/types/index.ts

# 3. Create service
# Create: src/services/new-entity-service.ts

# 4. Create tool + handler
# Create: src/tools/module/new-tool.ts

# 5. Register tool
# Edit: src/tools/index.ts (add to tools[] and handleToolCall switch)

# 6. Build and test
npm run build && npm start
# Test via Postman with JSON-RPC format
```
