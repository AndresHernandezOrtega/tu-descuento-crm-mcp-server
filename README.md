# MCP Server - Tu Descuento Colombia

Servidor MCP (Model Context Protocol) para el chatbot de Tu Descuento Colombia. Este servidor proporciona herramientas, prompts y recursos para que agentes de IA puedan acceder a información actualizada sobre beneficios y servicios.

## 🚀 Características

- **Transporte HTTP Streameable (SSE)**: Compatible con n8n y otros sistemas de automatización
- **Tools**: Herramientas para buscar beneficios, servicios y obtener información detallada
- **Prompts**: Templates predefinidos para casos de uso comunes
- **Resources**: Acceso a información estática como categorías y proveedores
- **Docker Ready**: Configuración completa para despliegue en contenedores

## 📋 Requisitos

- Node.js 20+
- npm o yarn
- Docker (para despliegue en contenedor)

## 🔧 Instalación

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus configuraciones
# Especialmente TUDESCUENTO_API_URL y TUDESCUENTO_API_KEY

# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
```

### Con Docker

```bash
# Construir imagen
docker build -t tudescuento-mcp-server .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env tudescuento-mcp-server
```

### Con Docker Compose

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 📁 Estructura del Proyecto

```
mcp-server-ai-agent/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── server.ts             # Configuración del servidor MCP
│   ├── config/
│   │   └── config.ts         # Configuración centralizada
│   ├── tools/                # Herramientas MCP
│   │   ├── index.ts
│   │   └── tudescuento-tools.ts
│   ├── prompts/              # Prompts predefinidos
│   │   └── index.ts
│   ├── resources/            # Recursos estáticos
│   │   └── index.ts
│   ├── services/             # Servicios externos
│   │   └── api-client.ts    # Cliente API Tu Descuento
│   └── types/                # Tipos TypeScript
│       └── index.ts
├── dist/                     # Código compilado
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env.example
```

## 🛠️ Tools Disponibles

### `search_benefits`

Busca beneficios disponibles con filtros opcionales.

**Parámetros:**

- `category` (opcional): Categoría del beneficio
- `provider` (opcional): Proveedor específico
- `query` (opcional): Búsqueda por texto libre
- `limit` (opcional): Límite de resultados (default: 10)

### `get_benefit_by_id`

Obtiene información detallada de un beneficio específico.

**Parámetros:**

- `id` (requerido): ID del beneficio

### `search_services`

Busca servicios disponibles.

**Parámetros:**

- `category` (opcional): Categoría del servicio
- `query` (opcional): Búsqueda por texto libre
- `limit` (opcional): Límite de resultados (default: 10)

## 📝 Prompts Disponibles

### `customer_support`

Prompt para agente de soporte al cliente.

### `benefit_recommendation`

Genera recomendaciones personalizadas de beneficios.

### `benefit_explanation`

Explica detalladamente un beneficio específico.

## 📚 Resources Disponibles

- `tudescuento://categories/benefits` - Lista de categorías de beneficios
- `tudescuento://providers/benefits` - Lista de proveedores
- `tudescuento://info/company` - Información de la empresa

## 🔌 Endpoints HTTP

### `GET /health`

Endpoint de salud del servidor.

**Respuesta:**

```json
{
  "status": "ok",
  "server": "tudescuento-mcp-server",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /sse`

Endpoint SSE para conexión MCP desde n8n u otros clientes.

### `POST /message`

Endpoint para enviar mensajes al servidor MCP (usado internamente por SSE).

## 🔗 Integración con n8n

1. En n8n, usa el nodo HTTP Request
2. Configura la URL: `http://localhost:3000/sse`
3. Método: GET
4. Headers: `Accept: text/event-stream`

Para enviar comandos, usa POST a `/message` con el formato MCP apropiado.

## 🌍 Variables de Entorno

| Variable              | Descripción                              | Default                  |
| --------------------- | ---------------------------------------- | ------------------------ |
| `PORT`                | Puerto del servidor                      | `3000`                   |
| `TUDESCUENTO_API_URL` | URL de la API de Tu Descuento            | -                        |
| `TUDESCUENTO_API_KEY` | API Key de autenticación                 | -                        |
| `MCP_SERVER_NAME`     | Nombre del servidor MCP                  | `tudescuento-mcp-server` |
| `MCP_SERVER_VERSION`  | Versión del servidor                     | `1.0.0`                  |
| `LOG_LEVEL`           | Nivel de logging                         | `info`                   |
| `CORS_ORIGINS`        | Origins permitidos (separados por comas) | `*`                      |

## 🔐 Seguridad

- El Dockerfile usa un usuario no-root para mayor seguridad
- Se implementa CORS configurable
- Las API keys se manejan mediante variables de entorno

## 📊 Monitoreo

El servidor incluye:

- Health check endpoint (`/health`)
- Health check en Docker para auto-recuperación
- Logging configurable

## 🚧 Desarrollo

### Agregar Nuevas Tools

1. Crear archivo en `src/tools/` (ej: `new-tool.ts`)
2. Definir schema con Zod
3. Implementar función handler
4. Exportar en `src/tools/index.ts`

### Agregar Nuevos Prompts

1. Agregar definición en `src/prompts/index.ts`
2. Implementar handler en `handleGetPrompt`

### Agregar Nuevos Resources

1. Agregar definición en `src/resources/index.ts`
2. Implementar handler en `handleReadResource`

## 📄 Licencia

ISC

## 👥 Autor

Tres Dementes - Tu Descuento Colombia

## 🐛 Reporte de Issues

Para reportar problemas o sugerir mejoras, contacta al equipo de desarrollo.
