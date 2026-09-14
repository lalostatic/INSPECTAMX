export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  APP_URL: string;
  NODE_ENV: string;
  BETTER_AUTH_SECRET?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string | null;
  branch_id: string | null;
}

export interface AppContext {
  env: Env;
  user?: AuthUser;
}

export async function validateSession(
  request: Request,
  env: Env
): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');

  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      })
    );
    token = cookies['inspectamx_session'] || null;
  }

  if (!token) return null;

  try {
    const cached = await env.KV.get(`session:${token}`);
    if (cached) {
      return JSON.parse(cached) as AuthUser;
    }

    const session = await env.DB.prepare(
      `SELECT s.id, s.expires_at, u.id as user_id, u.email, u.name, u.role, u.tenant_id, u.branch_id
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    ).bind(token).first<{
      id: string; expires_at: string; user_id: string;
      email: string; name: string; role: string;
      tenant_id: string | null; branch_id: string | null;
    }>();

    if (!session) return null;

    const user: AuthUser = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      role: session.role,
      tenant_id: session.tenant_id,
      branch_id: session.branch_id,
    };

    await env.KV.put(`session:${token}`, JSON.stringify(user), { expirationTtl: 3600 });

    return user;
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | undefined): Response | null {
  if (!user) {
    return jsonError('No autenticado', 401);
  }
  return null;
}

export function requireRole(user: AuthUser | undefined, roles: string[]): Response | null {
  const authError = requireAuth(user);
  if (authError) return authError;
  if (!roles.includes(user!.role)) {
    return jsonError('Acceso no autorizado', 403);
  }
  return null;
}

export function requireTenant(user: AuthUser | undefined): Response | null {
  const authError = requireAuth(user);
  if (authError) return authError;
  if (!user!.tenant_id) {
    return jsonError('Sin tenant asignado', 403);
  }
  return null;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function jsonError(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function corsHeaders(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateFolio(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${prefix}-${year}${month}-${rand}`;
}
