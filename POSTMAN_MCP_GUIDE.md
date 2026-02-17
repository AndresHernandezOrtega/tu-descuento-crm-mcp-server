# Guía: Usar MCP Server con Postman (Request Type: MCP)

## Prerrequisitos

- Postman versión 11+ (con soporte nativo para MCP)
- Servidor MCP corriendo en `http://localhost:3000`

## Paso 1: Crear una Nueva Request MCP en Postman

1. Abre Postman
2. Click en **"New"** → **"HTTP"** o click en el botón **"+"**
3. En el dropdown junto al método (GET/POST), busca y selecciona **"MCP"** como tipo de request
4. Si no ves la opción MCP, asegúrate de tener Postman 11+ o actualiza

## Paso 2: Configurar la Conexión

### URL del Servidor

```
http://localhost:3000/mcp
```

### Transport

Selecciona: **HTTP** (no SSE)

### Headers (Opcional)

Si quieres mantener sesión entre requests:

```
mcp-session-id: <tu-session-id>
```

## Paso 3: Initialize (Primera Conexión)

Postman maneja esto automáticamente cuando seleccionas el tipo MCP, pero la request será:

**Method:** `initialize`

**Body:**

```json
{
  "protocolVersion": "2025-03-26",
  "clientInfo": {
    "name": "postman-client",
    "version": "1.0.0"
  },
  "capabilities": {}
}
```

**Response esperado:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-03-26",
    "serverInfo": {
      "name": "tudescuento-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    }
  }
}
```

## Paso 4: Usar las Herramientas (Tools)

### 4.1 Listar Tools Disponibles

**Method:** `tools/list`

En la interfaz MCP de Postman:

- Method selector: Selecciona `tools/list`
- No requiere parámetros

**Response:**

```json
{
  "tools": [
    {
      "name": "search_benefits",
      "description": "Busca beneficios disponibles...",
      "inputSchema": { ... }
    },
    {
      "name": "get_benefit_by_id",
      "description": "Obtiene información detallada...",
      "inputSchema": { ... }
    },
    {
      "name": "search_services",
      "description": "Busca servicios disponibles...",
      "inputSchema": { ... }
    }
  ]
}
```

### 4.2 Ejecutar Tool: Search Benefits

**Method:** `tools/call`

**Tool Name:** `search_benefits`

**Parameters:**

```json
{
  "category": "restaurantes",
  "limit": 5
}
```

**Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "[...lista de beneficios en JSON...]"
    }
  ]
}
```

### 4.3 Ejecutar Tool: Get Benefit by ID

**Method:** `tools/call`

**Tool Name:** `get_benefit_by_id`

**Parameters:**

```json
{
  "id": "123"
}
```

### 4.4 Ejecutar Tool: Search Services

**Method:** `tools/call`

**Tool Name:** `search_services`

**Parameters:**

```json
{
  "category": "tecnología",
  "query": "smartphones",
  "limit": 10
}
```

## Paso 5: Usar Prompts

### 5.1 Listar Prompts Disponibles

**Method:** `prompts/list`

**Response:**

```json
{
  "prompts": [
    {
      "name": "customer_support",
      "description": "Prompt para agente de soporte..."
    },
    {
      "name": "benefit_recommendation",
      "description": "Genera recomendaciones..."
    },
    {
      "name": "benefit_explanation",
      "description": "Explica detalladamente..."
    }
  ]
}
```

### 5.2 Obtener un Prompt: Customer Support

**Method:** `prompts/get`

**Prompt Name:** `customer_support`

**Arguments:**

```json
{
  "customer_query": "¿Cómo puedo canjear un beneficio de restaurante?",
  "customer_context": "Cliente nuevo, primera vez usando la app"
}
```

**Response:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Eres un agente de soporte... [prompt completo]"
      }
    }
  ]
}
```

### 5.3 Obtener un Prompt: Benefit Recommendation

**Method:** `prompts/get`

**Prompt Name:** `benefit_recommendation`

**Arguments:**

```json
{
  "customer_interests": "Me gusta la comida italiana y la tecnología",
  "location": "Bogotá"
}
```

## Paso 6: Usar Resources

### 6.1 Listar Resources Disponibles

**Method:** `resources/list`

**Response:**

```json
{
  "resources": [
    {
      "uri": "tudescuento://categories/benefits",
      "name": "Categorías de Beneficios",
      "description": "Lista de todas las categorías..."
    },
    {
      "uri": "tudescuento://providers/benefits",
      "name": "Proveedores de Beneficios",
      "description": "Lista de todos los proveedores..."
    },
    {
      "uri": "tudescuento://info/company",
      "name": "Información de la Empresa",
      "description": "Información general..."
    }
  ]
}
```

### 6.2 Leer un Resource: Info de la Empresa

**Method:** `resources/read`

**URI:** `tudescuento://info/company`

**Response:**

```json
{
  "contents": [
    {
      "uri": "tudescuento://info/company",
      "mimeType": "text/plain",
      "text": "Tu Descuento Colombia\n\nTu Descuento es la plataforma..."
    }
  ]
}
```

### 6.3 Leer Resource: Categorías

**Method:** `resources/read`

**URI:** `tudescuento://categories/benefits`

**Response:**

```json
{
  "contents": [
    {
      "uri": "tudescuento://categories/benefits",
      "mimeType": "application/json",
      "text": "[\"restaurantes\", \"tecnología\", \"salud\", ...]"
    }
  ]
}
```

## Tips para Postman con MCP

### 1. Guardar la Sesión

- Crea una variable de entorno en Postman: `mcp_session_id`
- Después del `initialize`, guarda el header `mcp-session-id` de la respuesta
- Usa `{{mcp_session_id}}` en los siguientes requests

### 2. Colección de Requests

Crea una colección en Postman con:

- Initialize
- List Tools
- Ejemplos de cada tool
- List Prompts
- Ejemplos de cada prompt
- List Resources
- Ejemplos de cada resource

### 3. Tests Automáticos

En la pestaña "Tests" de Postman, puedes agregar:

```javascript
// Guardar session ID automáticamente
if (pm.response.headers.has('mcp-session-id')) {
  pm.environment.set('mcp_session_id', pm.response.headers.get('mcp-session-id'))
}

// Validar respuesta
pm.test('Status code is 200', () => {
  pm.response.to.have.status(200)
})

pm.test('Response has jsonrpc', () => {
  const jsonData = pm.response.json()
  pm.expect(jsonData).to.have.property('jsonrpc')
  pm.expect(jsonData.jsonrpc).to.eql('2.0')
})
```

### 4. Variables de Entorno

Crea variables para:

- `mcp_base_url`: `http://localhost:3000`
- `mcp_session_id`: (se guarda automáticamente)
- `mcp_protocol_version`: `2025-03-26`

## Troubleshooting

### Error: "Cannot find method..."

- Verifica que el servidor esté corriendo: `http://localhost:3000/health`
- Verifica el nombre del método exacto (case-sensitive)

### Error: "Session not found"

- Haz un nuevo `initialize` para obtener un nuevo session ID
- Verifica que el header `mcp-session-id` esté correcto

### No Response / Timeout

- Verifica que el servidor esté corriendo: `npm start`
- Verifica que el puerto 3000 no esté bloqueado por firewall
- Prueba primero con `http://localhost:3000/health` (debe responder OK)

## Ejemplo Completo de Flujo

1. **Initialize** → Guarda `mcp-session-id`
2. **tools/list** → Ve las herramientas disponibles
3. **tools/call** (`search_benefits`) → Busca beneficios
4. **prompts/get** (`customer_support`) → Obtén un prompt para soporte
5. **resources/read** → Lee información de la empresa

## Alternativa: Uso Manual con HTTP Requests

Si tu versión de Postman no tiene soporte MCP nativo, consulta [POSTMAN_TESTS.md](POSTMAN_TESTS.md) para ejemplos usando requests HTTP POST regulares.
