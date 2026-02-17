# Tipos del Proyecto

Esta carpeta contiene todas las definiciones de tipos TypeScript del proyecto, organizadas por módulos.

## Estructura

```
types/
├── index.ts           # Exportaciones centralizadas
├── api.ts            # Tipos del cliente HTTP
└── entities/         # Entidades del CRM
    ├── ai-agent.ts   # Agentes de IA
    └── lead.ts       # Leads
```

## Módulos

### `api.ts` - Tipos del Cliente HTTP

Contiene todos los tipos relacionados con las respuestas de la API y el cliente HTTP:

- **`LaravelPaginatedResponse<T>`**: Respuestas paginadas de Laravel
- **`PaginationLink`**: Enlaces de paginación
- **`GenericEntityResponse<T>`**: Respuestas genéricas con arrays de entidades
- **`ApiErrorResponse`**: Estructura de respuestas de error
- **`ApiResponse<T>`**: Wrapper interno para manejo de éxito/error

### `entities/` - Entidades del CRM

Cada entidad del CRM tiene su propio archivo con:

- Interface principal de la entidad
- DTOs para crear (`Create*Dto`)
- DTOs para actualizar (`Update*Dto`)
- Interfaces auxiliares relacionadas

#### Entidades disponibles:

- **`ai-agent.ts`**: Agentes de IA del sistema de soporte
- **`lead.ts`**: Leads o prospectos del CRM

## Uso

Todos los tipos se exportan desde `index.ts`, por lo que puedes importarlos así:

```typescript
import type {
  // Tipos de API
  ApiResponse,
  LaravelPaginatedResponse,
  GenericEntityResponse,
  
  // Entidades
  AiAgent,
  Lead,
  
  // DTOs
  CreateLeadDto,
  UpdateAiAgentDto,
} from '../types/index.js'
```

## Agregar Nuevas Entidades

Para agregar una nueva entidad al CRM:

1. **Crear el archivo de la entidad**:
   ```bash
   src/types/entities/nombre-entidad.ts
   ```

2. **Definir la entidad y sus DTOs**:
   ```typescript
   /**
    * Descripción de la entidad
    */
   export interface MiEntidad {
     id: number
     nombre: string
     // ... más campos
     created_at: string
     updated_at: string
   }

   /**
    * DTO para crear la entidad
    */
   export interface CreateMiEntidadDto {
     nombre: string
     // ... campos requeridos para creación
   }

   /**
    * DTO para actualizar la entidad
    */
   export interface UpdateMiEntidadDto {
     nombre?: string
     // ... campos opcionales para actualización
   }
   ```

3. **Exportar desde `index.ts`**:
   ```typescript
   // En src/types/index.ts
   export type {
     MiEntidad,
     CreateMiEntidadDto,
     UpdateMiEntidadDto,
   } from './entities/mi-entidad.js'
   ```

## Convenciones

- **Nombres de archivos**: kebab-case (`ai-agent.ts`, `lead.ts`)
- **Nombres de interfaces**: PascalCase (`AiAgent`, `Lead`)
- **DTOs**: Sufijo `Dto` (`CreateLeadDto`, `UpdateAiAgentDto`)
- **Una entidad por archivo**: Mantener archivos pequeños y enfocados
- **Documentación**: Cada tipo debe tener un comentario JSDoc explicativo
- **DTOs opcionales**: En los `Update*Dto` todos los campos son opcionales

## Beneficios de esta Estructura

✅ **Organización clara**: Cada entidad en su propio archivo
✅ **Fácil navegación**: Encontrar tipos específicos es más sencillo
✅ **Escalabilidad**: Agregar nuevas entidades no afecta archivos existentes
✅ **Mantenibilidad**: Cambios en una entidad no requieren tocar otras
✅ **Autocomplete mejorado**: IDEs pueden indexar mejor los archivos pequeños
✅ **Import centralizado**: Un solo punto de entrada facilita el uso
