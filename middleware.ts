import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/webhook/chatwoot',
  '/api/webhook/uazapi',
  '/api/google/callback',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Permitir assets estáticos
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  // Se não tem token e é API, retorna 401
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Se não tem token e é página, deixa o frontend lidar (mostra Login)
  if (!token) {
    return NextResponse.next();
  }

  // Verificar token
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token inválido - limpar cookie e redirecionar
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
      : NextResponse.next();

    response.cookies.set('session', '', { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    // Proteger todas as rotas exceto estáticas
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
