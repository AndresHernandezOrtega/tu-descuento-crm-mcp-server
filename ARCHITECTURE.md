# Arquitectura del Servidor MCP - TuDescuento CRM

## Descripción General

Este servidor MCP (Model Context Protocol) proporciona una interfaz para que el agente de IA de soporte al cliente pueda interactuar con la API del CRM de TuDescuento. El servidor expone herramientas (tools), prompts y recursos (resources) que el agente puede utilizar.

## Estructura del Proyecto

```
src/
├── config/           # Configuración del servidor
│   └── config.ts
├── services/         # Servicios para interactuar con la API
│   ├── api-client.ts      # Cliente HTTP base con axios
│   ├── base-service.ts    # Clase base para servicios
│   ├── ai-agent-service.ts    # Servicio de agentes IA (ejemplo)
│   └── lead-service.ts        # Servicio de leads (ejemplo)
├── tools/           # Herramientas disponibles para el agente
│   └── index.ts
├── prompts/         # Prompts predefinidos
│   └── index.ts
├── resources/       # Recursos de solo lectura
│   └── index.ts
├── types/           # Tipos TypeScript
│   └── index.ts
├── server.ts        # Servidor MCP sobre HTTP/SSE
└── index.ts         # Punto de entrada
```

## Componentes Principales

### 1. Sistema de Tipos (`src/types/index.ts`)

Define todos los tipos TypeScript para las respuestas de la API:

#### Tipos de Respuestas

- **`LaravelPaginatedResponse<T>`**: Respuestas paginadas de Laravel

  ```typescript
  {
    current_page: number
    data: T[]
    first_page_url: string
    from: number
    last_page: number
    // ... más campos de paginación
  }
  ```

- **`GenericEntityResponse<T>`**: Respuestas genéricas con arrays

  ```typescript
  {
    leads: Lead[]
  }
  ```

- **`ApiErrorResponse`**: Respuestas de error

  ```typescript
  {
    error: string
    message: string
    details?: any
  }
  ```

- **`ApiResponse<T>`**: Wrapper interno para manejar éxito/error
  ```typescript
  {
    success: boolean
    data?: T
    error?: ApiErrorResponse
  }
  ```

### 2. Cliente API (`src/services/api-client.ts`)

Clase base `ApiClient` que proporciona:

- Cliente HTTP configurado con axios
- Interceptores para autenticación automática
- Métodos HTTP genéricos: `get()`, `post()`, `put()`, `patch()`, `delete()`
- Manejo robusto de errores HTTP
- Conversión de errores axios a `ApiResponse<T>` consistentes

**Características:**

- Timeout de 30 segundos
- Token de autenticación automático desde `process.env.TUDESCUENTO_API_KEY`
- Manejo de errores de red, 4xx, 5xx
- Mensajes de error descriptivos según código HTTP

### 3. Servicio Base (`src/services/base-service.ts`)

Clase abstracta `BaseService` que extiende `ApiClient` y proporciona:

- Acceso a todos los métodos HTTP del cliente
- `validateResponse()`: Valida respuestas y lanza errores si fallan
- `getErrorMessage()`: Extrae mensajes de error de respuestas
- `buildQueryParams()`: Limpia query parameters (elimina null/undefined)

### 4. Servicios Específicos

Los servicios específicos extienden `BaseService` y encapsulan la lógica de negocio de cada módulo del CRM.

#### Ejemplo: AiAgentService (`src/services/ai-agent-service.ts`)

```typescript
export class AiAgentService extends BaseService {
  private readonly basePath = '/api/ai-support-agents'

  async getAgents(page: number = 1): Promise<ApiResponse<LaravelPaginatedResponse<AiAgent>>> {
    return this.get<LaravelPaginatedResponse<AiAgent>>(this.basePath, { page })
  }

  async getAgentById(id: number): Promise<ApiResponse<AiAgent>> {
    return this.get<AiAgent>(`${this.basePath}/${id}`)
  }

  async createAgent(data: Partial<AiAgent>): Promise<ApiResponse<AiAgent>> {
    return this.post<AiAgent>(this.basePath, data)
  }

  // ... más métodos
}
```

#### Ejemplo: LeadService (`src/services/lead-service.ts`)

```typescript
export class LeadService extends BaseService {
  private readonly basePath = '/api/leads'

  async getLeads(): Promise<ApiResponse<GenericEntityResponse<Lead>>> {
    return this.get<GenericEntityResponse<Lead>>(this.basePath)
  }

  async getLeadById(id: number): Promise<ApiResponse<Lead>> {
    return this.get<Lead>(`${this.basePath}/${id}`)
  }

  // ... más métodos
}
```

## Cómo Crear Nuevos Servicios

1. **Definir tipos en `src/types/index.ts`**:

   ```typescript
   export interface Cliente {
     id: number
     nombre: string
     email: string
     // ... más campos
   }
   ```

2. **Crear servicio en `src/services/`**:

   ```typescript
   import { BaseService } from './base-service.js'
   import type { ApiResponse, Cliente } from '../types/index.js'

   export class ClienteService extends BaseService {
     private readonly basePath = '/api/clientes'

     async getClientes(): Promise<ApiResponse<Cliente[]>> {
       return this.get<Cliente[]>(this.basePath)
     }

     async getClienteById(id: number): Promise<ApiResponse<Cliente>> {
       return this.get<Cliente>(`${this.basePath}/${id}`)
     }

     async createCliente(data: Partial<Cliente>): Promise<ApiResponse<Cliente>> {
       return this.post<Cliente>(this.basePath, data)
     }
   }

   export const clienteService = new ClienteService()
   ```

3. **Usar el servicio en tools/prompts/resources** según sea necesario.

## Cómo Crear Tools

Los tools son funciones que el agente de IA puede ejecutar para realizar acciones o consultar información.

1. **Definir el tool en `src/tools/index.ts`**:

   ```typescript
   export const tools: Tool[] = [
     {
       name: 'get_clientes',
       description: 'Obtiene la lista de clientes del CRM',
       inputSchema: {
         type: 'object',
         properties: {
           page: {
             type: 'number',
             description: 'Número de página',
             default: 1,
           },
         },
       },
     },
   ]
   ```

2. **Implementar el handler**:

   ```typescript
   import { clienteService } from '../services/cliente-service.js'

   export async function handleToolCall(request: CallToolRequest) {
     const { name, arguments: args } = request.params

     switch (name) {
       case 'get_clientes': {
         const { page = 1 } = args as any
         const result = await clienteService.getClientes()

         if (!result.success) {
           return {
             content: [
               {
                 type: 'text' as const,
                 text: `Error: ${result.error?.message}`,
               },
             ],
             isError: true,
           }
         }

         return {
           content: [
             {
               type: 'text' as const,
               text: JSON.stringify(result.data, null, 2),
             },
           ],
         }
       }
       // ... más casos
     }
   }
   ```

## Cómo Crear Prompts

Los prompts son plantillas que guían al agente de IA en contextos específicos.

1. **Definir el prompt en `src/prompts/index.ts`**:

   ```typescript
   export const prompts: Prompt[] = [
     {
       name: 'customer_support',
       description: 'Prompt para atención al cliente',
       arguments: [
         {
           name: 'customer_query',
           description: 'Consulta del cliente',
           required: true,
         },
       ],
     },
   ]
   ```

2. **Implementar el handler**:

   ```typescript
   export async function handleGetPrompt(request: GetPromptRequest) {
     const { name, arguments: args } = request.params

     switch (name) {
       case 'customer_support': {
         const customerQuery = args?.customer_query as string

         return {
           messages: [
             {
               role: 'user' as const,
               content: {
                 type: 'text' as const,
                 text: `Eres un agente de soporte. Responde: ${customerQuery}`,
               },
             },
           ],
         }
       }
       // ... más casos
     }
   }
   ```

## Cómo Crear Resources

Los resources son datos de solo lectura que el agente puede consultar.

1. **Definir el resource en `src/resources/index.ts`**:

   ```typescript
   export const resources: Resource[] = [
     {
       uri: 'tudescuento://info/company',
       name: 'Información de la Empresa',
       description: 'Información general sobre TuDescuento',
       mimeType: 'text/plain',
     },
   ]
   ```

2. **Implementar el handler**:

   ```typescript
   export async function handleReadResource(request: ReadResourceRequest) {
     const { uri } = request.params

     switch (uri) {
       case 'tudescuento://info/company': {
         return {
           contents: [
             {
               uri,
               mimeType: 'text/plain',
               text: 'TuDescuento es una plataforma...',
             },
           ],
         }
       }
       // ... más casos
     }
   }
   ```

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# API Configuration
TUDESCUENTO_API_URL=http://localhost:8000
TUDESCUENTO_API_KEY=tu_api_key_aqui

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Comandos

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar servidor
npm start

# Desarrollo con watch mode
npm run watch

# Limpiar build
npm run clean
```

## Endpoints del Servidor

- **GET /health**: Health check del servidor
- **GET /mcp**: Endpoint SSE para recibir notificaciones
- **POST /mcp**: Endpoint para enviar mensajes MCP

## Próximos Pasos

1. Definir todos los tipos de entidades del CRM en `src/types/index.ts`
2. Crear un servicio para cada módulo del CRM en `src/services/`
3. Implementar los tools necesarios para el agente en `src/tools/index.ts`
4. Crear prompts específicos para diferentes escenarios en `src/prompts/index.ts`
5. Configurar resources con información estática útil en `src/resources/index.ts`

## Manejo de Errores

Todos los servicios devuelven `ApiResponse<T>` con la estructura:

```typescript
// Éxito
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    error: "Unauthorized",
    message: "Token de autenticación inválido",
    details: { ... }
  }
}
```

Los tools deben verificar `result.success` y manejar errores apropiadamente devolviendo mensajes con `isError: true`.

## Notas Importantes

- Todos los servicios extienden `BaseService` para heredar métodos HTTP
- Los métodos HTTP del cliente ya manejan errores y devuelven `ApiResponse<T>`
- No es necesario hacer try-catch en los servicios, el cliente ya maneja excepciones
- Los tipos deben definirse antes de crear los servicios
- Los servicios deben exportar una instancia singleton al final del archivo
