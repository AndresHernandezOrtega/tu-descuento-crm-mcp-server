/**
 * Smoke tests for MCP auth / sessions / rate-limit.
 * Usage: node scripts/verify-auth.mjs
 */
const BASE = process.env.MCP_BASE || 'http://localhost:3010'
const TOKEN_A = process.env.TOKEN_A || 'mcp_live_mghfbV1BOOMZLTYL8iEvUhg2Y8AX9TC28F5DdBY8eXg'
const TOKEN_B = process.env.TOKEN_B || 'mcp_live_DlgE7WugVZB4PcFlOaiVkHb1Xh4mJhbxdxrEzrtz4_w'

async function req(path, { method = 'POST', token, session, body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (session) headers['Mcp-Session-Id'] = session

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 200) }
  }

  return {
    status: res.status,
    www: res.headers.get('www-authenticate'),
    session: res.headers.get('mcp-session-id'),
    retryAfter: res.headers.get('retry-after'),
    json,
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

async function main() {
  console.log(`Base: ${BASE}\n`)

  console.log('1) No token → 401')
  {
    const r = await req('/mcp', {
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } },
      },
    })
    assert(r.status === 401, `status 401 (got ${r.status})`)
    assert(!!r.www && r.www.includes('Bearer'), `WWW-Authenticate present (${r.www})`)
  }

  console.log('2) Invalid token → 401')
  {
    const r = await req('/mcp', {
      token: 'invalid_token_that_is_long_enough_abcdefghijkl',
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } },
      },
    })
    assert(r.status === 401, `status 401 (got ${r.status})`)
  }

  console.log('3) Valid initialize + tools/list')
  let sessionA
  {
    const init = await req('/mcp', {
      token: TOKEN_A,
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'verify-a', version: '1' },
        },
      },
    })
    assert(init.status === 200, `initialize 200 (got ${init.status})`)
    assert(!!init.session, `session id returned: ${init.session}`)
    sessionA = init.session

    await req('/mcp', {
      token: TOKEN_A,
      session: sessionA,
      body: { jsonrpc: '2.0', method: 'notifications/initialized' },
    })

    const list = await req('/mcp', {
      token: TOKEN_A,
      session: sessionA,
      body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    })
    assert(list.status === 200, `tools/list 200 (got ${list.status})`)
    const tools = list.json?.result?.tools || []
    assert(tools.length === 10, `10 tools (got ${tools.length})`)
    const cat = tools.find((t) => t.name === 'get_categories')
    assert(!!cat?.annotations?.readOnlyHint, 'get_categories has readOnlyHint')
    assert(!!cat?.outputSchema, 'get_categories has outputSchema')
  }

  console.log('4) Cross-client session → 403')
  {
    const r = await req('/mcp', {
      token: TOKEN_B,
      session: sessionA,
      body: { jsonrpc: '2.0', id: 3, method: 'tools/list' },
    })
    assert(r.status === 403, `status 403 (got ${r.status})`)
  }

  console.log('5) Rate limit → 429')
  {
    // Use TOKEN_B: burn requests until 429 (limit configured to 5 on test server)
    let saw429 = false
    for (let i = 0; i < 12; i++) {
      const r = await req('/mcp', {
        token: TOKEN_B,
        body: {
          jsonrpc: '2.0',
          id: 100 + i,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: `rl-${i}`, version: '1' },
          },
        },
      })
      console.log(`   burn ${i + 1}: HTTP ${r.status}`)
      if (r.status === 429) {
        saw429 = true
        assert(!!r.retryAfter, `Retry-After present (${r.retryAfter})`)
        break
      }
    }
    assert(saw429, 'eventually received 429')
  }

  console.log('6) Health public → 200')
  {
    const r = await req('/health', { method: 'GET' })
    assert(r.status === 200, `health 200 (got ${r.status})`)
  }

  console.log('\nAll verification checks passed.')
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
