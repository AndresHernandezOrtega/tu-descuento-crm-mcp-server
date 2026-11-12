import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

function instructions(text: string, context: Array<[string, string | undefined]>) {
  const lines = context
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([key, value]) => `- ${key}: ${value.trim()}`)
  const received = lines.length
    ? lines.join('\n')
    : 'No se recibieron argumentos. Pídelos en la conversación antes de llamar tools.'
  return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `${text.trim()}\n\nContexto recibido:\n${received}`,
        },
      },
    ],
  }
}

const dni = z.string().optional().describe('Documento, si ya se conoce')

/**
 * Prompts de encadenamiento para autoservicio de CS.
 * No indican cobro, alta de contrato ni reset de contraseña.
 */
export function registerAllPrompts(server: McpServer): void {
  server.registerPrompt(
    'identificar_cliente',
    {
      title: 'Identificar cliente',
      description:
        'Identifica a la persona por documento o, si no hay documento, por email o celular. No lista la base de clientes.',
      argsSchema: {
        numero_identificacion: dni,
        email: z.string().optional().describe('Email si no hay documento'),
        celular: z.string().optional().describe('Celular si no hay documento'),
      },
    },
    async (args) =>
      instructions(
        `Identifica a la persona sin listar la base de clientes.
1. Si hay número de identificación, usa get_costumer_by_identification (el alias get_customer_by_identification es la misma función). No uses find_client.
2. Si no hay documento y sí email y/o celular, usa find_client. El match es exacto.
3. Si find_client devuelve varios candidatos, pide el documento. No reconstruyas el documento con los últimos dígitos.
4. No vuelques contratos en la búsqueda. Con el documento confirmado, el estado de plan sigue en get_client_membership_status.`,
        [
          ['numero_identificacion', args.numero_identificacion],
          ['email', args.email],
          ['celular', args.celular],
        ],
      ),
  )

  server.registerPrompt(
    'estado_membresia',
    {
      title: 'Estado de membresía',
      description: 'Identifica al cliente y consulta si tiene un plan vigente. No crea contratos ni cobra.',
      argsSchema: { numero_identificacion: dni },
    },
    async (args) =>
      instructions(
        `Consulta el estado de la membresía.
1. Identifica primero (documento, o email/celular con find_client). No listes la base.
2. Con el documento, llama get_client_membership_status.
3. Si responde NO_ACTIVE_MEMBERSHIP, ofrece get_memberships con scope public, o get_membership si ya tienes el id del plan.
4. No pases query ni city a get_memberships. No crees un contrato y no inicies un pago.`,
        [['numero_identificacion', args.numero_identificacion]],
      ),
  )

  server.registerPrompt(
    'explorar_beneficios',
    {
      title: 'Explorar beneficios del plan',
      description: 'Parte del estado de membresía y lista los descuentos del plan vigente.',
      argsSchema: { numero_identificacion: dni },
    },
    async (args) =>
      instructions(
        `Explica los beneficios del plan vigente.
1. Llama get_client_membership_status.
2. Si hay plan activo, llama get_client_plan_benefits. No uses descuento_aplicable.
3. Para un descuento concreto usa search_discounts (una palabra por keyword, página 1, sin city) o get_membership_discounts.
4. Si no hay plan activo, get_memberships con scope public. No crees un contrato ni cobres.`,
        [['numero_identificacion', args.numero_identificacion]],
      ),
  )

  server.registerPrompt(
    'beneficiarios_contrato',
    {
      title: 'Beneficiarios del contrato',
      description: 'Lista beneficiarios solo del contrato vigente, después de tener el documento.',
      argsSchema: { numero_identificacion: dni },
    },
    async (args) =>
      instructions(
        `Consulta beneficiarios solo del contrato vigente.
1. Exige el documento. No pidas ni envíes otro contract_id.
2. Llama get_contract_beneficiaries. Solo lectura: no des de alta beneficiarios.
3. Si responde NO_ACTIVE_MEMBERSHIP, ofrece get_memberships (scope public) o create_lead. No crees un contrato.`,
        [['numero_identificacion', args.numero_identificacion]],
      ),
  )

  server.registerPrompt(
    'estado_pago',
    {
      title: 'Estado de un pago',
      description: 'Informa el estado Wompi de una referencia si pertenece al cliente. No inicia el pago.',
      argsSchema: {
        numero_identificacion: dni,
        reference: z.string().optional().describe('Referencia Wompi, si ya se conoce'),
      },
    },
    async (args) =>
      instructions(
        `Informa el estado de un pago ya hecho. No inicies un pago ni crees una compra.
1. Exige el documento y confírmalo con get_costumer_by_identification.
2. Llama get_payment_by_reference con ese documento y la referencia.
3. Si el tool devuelve wompi_status, informa solo ese estado (APPROVED, DECLINED, PENDING, VOIDED o ERROR).
4. Si responde VALIDATION_ERROR, no adivines el estado ni reintentes la referencia con otro documento.`,
        [
          ['numero_identificacion', args.numero_identificacion],
          ['reference', args.reference],
        ],
      ),
  )

  server.registerPrompt(
    'capturar_lead',
    {
      title: 'Capturar lead',
      description: 'Consulta cliente y lead antes de crear un prospecto. No actualiza leads existentes.',
      argsSchema: {
        numero_documento: z.string().optional().describe('Documento del prospecto'),
      },
    },
    async (args) =>
      instructions(
        `Registra interés solo si la persona no es cliente ni lead.
1. Antes de crear, consulta get_costumer_by_identification y get_lead con el documento.
2. Si ya es cliente, el alta responde ALREADY_CLIENT: no vuelvas a llamar create_lead.
3. Si ya es lead, ALREADY_LEAD incluye el estado: infórmalo y no crees otro. No hagas PUT ni subas archivos.
4. create_lead solo cuando no exista cliente ni lead.`,
        [['numero_documento', args.numero_documento]],
      ),
  )

  server.registerPrompt(
    'cobertura_municipio',
    {
      title: 'Cobertura en un municipio',
      description: 'Resuelve municipio, comercio y sucursales. No filtra membresías por ciudad.',
      argsSchema: {
        municipalitie_id: z.string().optional().describe('Id de municipio, si ya se resolvió'),
        keywords: z.string().optional().describe('Palabras sueltas del comercio, separadas por coma'),
      },
    },
    async (args) =>
      instructions(
        `Responde si hay sucursal en un municipio.
1. Lee el resource tudescuento://forms/client-creation para obtener municipalitie_id. No inventes ?city=.
2. Busca el comercio con search_allied_commerces. Cada keyword es una sola palabra, sin espacios y sin argumento city. El resultado es la página 1.
3. Con el id del comercio, llama get_commerce_branches. Si ya tienes municipalitie_id, pásalo: el filtro ocurre en el MCP.
4. No pases city ni query a get_memberships.`,
        [
          ['municipalitie_id', args.municipalitie_id],
          ['keywords', args.keywords],
        ],
      ),
  )

  server.registerPrompt(
    'cerrar_caso_soporte',
    {
      title: 'Cerrar caso de soporte',
      description: 'Revisa el historial y cierra el caso con nombre, email y teléfono.',
      argsSchema: { numero_identificacion: dni },
    },
    async (args) =>
      instructions(
        `Cierra el caso de soporte con el historial a la vista.
1. Revisa get_support_logs (puedes usar handovered, email y per_page) y el detalle con get_support_log.
2. Al final llama create_support_log. nombre, email y telefono son obligatorios, además de necesidad, solución y consideraciones.
3. handovered=true solo si la conversación se transfirió de verdad a un humano. Si el bot la resolvió, false.`,
        [['numero_identificacion', args.numero_identificacion]],
      ),
  )

  server.registerPrompt(
    'handover_humano',
    {
      title: 'Transferencia a un humano',
      description: 'Marca handovered=true solo cuando hubo una transferencia real.',
      argsSchema: { numero_identificacion: dni },
    },
    async (args) =>
      instructions(
        `La transferencia a un humano se registra en el caso de soporte.
1. handovered=true en create_support_log solo si la conversación se transfirió de verdad a un agente humano.
2. Si el bot resolvió el caso, handovered=false. No marques la transferencia por si acaso.
3. El caso exige nombre, email y teléfono. No elimines ni edites casos por otra vía.`,
        [['numero_identificacion', args.numero_identificacion]],
      ),
  )

  server.registerPrompt(
    'olvido_contrasena',
    {
      title: 'Olvido de contraseña',
      description: 'Envía el OTP de forgot_password solo si el usuario lo pide. No restablece la clave.',
      argsSchema: {
        email: z.string().optional().describe('Email del cliente, si ya lo dio'),
      },
    },
    async (args) =>
      instructions(
        `Usa forgot_password solo si el usuario pide explícitamente restaurar su contraseña.
Ese tool únicamente envía un OTP al email. No restablezcas la contraseña, no inventes una clave nueva y no pidas el OTP para guardarlo.
Si el usuario no lo pidió, no llames el tool.`,
        [['email', args.email]],
      ),
  )
}
