import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  ALLIED_COMMERCE_CREATION_URI,
  CLIENT_CREATION_URI,
  readAlliedCommerceCreationResource,
  readClientCreationResource,
} from '@resources/form-catalog.js'

export { startFormCatalogHydration } from '@resources/form-catalog.js'

/**
 * Resources de catálogos de formulario.
 * No publica planes ni descuentos.
 */
export function registerFormResources(server: McpServer): void {
  server.registerResource(
    'client-creation',
    CLIENT_CREATION_URI,
    {
      title: 'Catálogo de creación de clientes',
      description:
        'Municipios, departamentos y tipos de documento de GET /clients/creation. ' +
        'La llave de tipos de documento llega con el typo del CRM: type_document_identifiactions. ' +
        'Úsalo para resolver municipalitie_id antes de get_commerce_branches. No incluye membresías ni descuentos. ' +
        'Si el CRM no respondió al arranque, la lectura devuelve error para reintentar.',
      mimeType: 'application/json',
    },
    async () => readClientCreationResource(),
  )

  server.registerResource(
    'allied-commerce-creation',
    ALLIED_COMMERCE_CREATION_URI,
    {
      title: 'Catálogo de creación de comercio aliado',
      description:
        'Opciones de formulario de GET /allied_commerces/create (tipos de documento). ' +
        'No es el listado de comercios. Si la respuesta no es un catálogo de formulario, la lectura falla y no publica comercios.',
      mimeType: 'application/json',
    },
    async () => readAlliedCommerceCreationResource(),
  )
}
