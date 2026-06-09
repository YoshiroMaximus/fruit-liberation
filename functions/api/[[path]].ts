/**
 * Cloudflare Pages Function — edge proxy for the Falling Fruit API.
 *
 * Why a proxy?
 *  - Keeps the API key server-side (out of the client bundle).
 *  - Same-origin requests (no CORS preflight) and one place to swap the key.
 *  - Edge-caches the hot, identical-across-users GET endpoints (clusters,
 *    locations, types) on Cloudflare's CDN — much faster + kinder to the
 *    Falling Fruit servers.
 *
 * Maps  /api/<path>?<query>  ->  https://fallingfruit.org/api/0.3/<path>?<query>
 */

interface Env {
  /** Optional override; defaults to the public Falling Fruit production key. */
  FF_API_KEY?: string
}

const UPSTREAM = 'https://fallingfruit.org/api/0.3'
const DEFAULT_KEY = 'AKDJGHSD'

/**
 * Per-endpoint edge cache lifetime (seconds). 0 = never cache.
 * The Cache API (no enterprise cache-tags on Pages) can't be selectively
 * purged on write, so map-data TTLs are kept short to bound how long a freshly
 * added/edited location stays hidden from anonymous viewers. Signed-in users
 * bypass the cache entirely (their reads carry Authorization → not cacheable),
 * so the contributor always sees their own change immediately.
 */
function cacheTtl(path: string): number {
  if (path === '/types') return 86_400 // catalog rarely changes
  if (path === '/types/counts') return 120
  if (path === '/clusters') return 120
  if (path === '/locations') return 60
  if (/^\/locations\/\d+$/.test(path)) return 60
  return 0
}

function withCors(res: Response): Response {
  const h = new Headers(res.headers)
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Expose-Headers', 'x-total-count')
  return new Response(res.body, { status: res.status, headers: h })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const path = url.pathname.replace(/^\/api/, '')
  const target = `${UPSTREAM}${path}${url.search}`
  const isGet = request.method === 'GET' || request.method === 'HEAD'
  const hasAuth = request.headers.has('authorization')
  const ttl = cacheTtl(path)
  const cacheable = isGet && !hasAuth && ttl > 0

  const cache = caches.default
  const cacheKey = new Request(target, { method: 'GET' })

  if (cacheable) {
    const hit = await cache.match(cacheKey)
    if (hit) return withCors(hit)
  }

  const headers = new Headers(request.headers)
  headers.set('x-api-key', env.FF_API_KEY || DEFAULT_KEY)
  headers.delete('host')
  headers.delete('cookie')

  // Buffer write bodies (JSON + multipart photo uploads) so they forward
  // reliably without request-stream/duplex concerns. Content-Type (incl. the
  // multipart boundary) is preserved via the copied headers.
  const reqBody = isGet ? undefined : await request.arrayBuffer()

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: reqBody,
      redirect: 'follow',
    })
  } catch {
    return withCors(
      new Response(JSON.stringify({ error: 'Upstream unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  const resHeaders = new Headers(upstream.headers)
  if (cacheable && upstream.ok) {
    resHeaders.set('Cache-Control', `public, max-age=${ttl}`)
  } else {
    resHeaders.set('Cache-Control', 'no-store')
  }

  const body = await upstream.arrayBuffer()
  const response = new Response(body, { status: upstream.status, headers: resHeaders })

  if (cacheable && upstream.ok) {
    waitUntil(cache.put(cacheKey, response.clone()))
  }
  return withCors(response)
}
