# Pruebas MCP Server - Tu Descuento

## Endpoint

`POST http://localhost:3000/mcp`

## Headers

```
Content-Type: application/json
```

## 1. Initialize (Conectar al servidor)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "clientInfo": {
      "name": "postman-client",
      "version": "1.0.0"
    },
    "capabilities": {}
  }
}
```

**Respuesta esperada:**

- Header: `mcp-session-id` (guarda este valor para las siguientes requests)
- Body: Capacidades del servidor

## 2. List Tools (Listar herramientas disponibles)

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

## 3. Search Benefits (Buscar beneficios)

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_benefits",
    "arguments": {
      "category": "restaurantes",
      "limit": 5
    }
  }
}
```

## 4. Get Benefit by ID

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_benefit_by_id",
    "arguments": {
      "id": "123"
    }
  }
}
```

## 5. List Prompts

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "prompts/list"
}
```

## 6. Get Prompt

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "prompts/get",
  "params": {
    "name": "customer_support",
    "arguments": {
      "customer_query": "¿Cómo puedo usar un beneficio?"
    }
  }
}
```

## 7. List Resources

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "resources/list"
}
```

## 8. Read Resource

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "resources/read",
  "params": {
    "uri": "tudescuento://info/company"
  }
}
```

## Notas

- El `mcp-session-id` se genera automáticamente en la primera request (initialize)
- Puedes incluir el header `mcp-session-id` en las siguientes requests para mantener la sesión
- Todos los requests usan JSON-RPC 2.0
- El `id` debe ser único por request
