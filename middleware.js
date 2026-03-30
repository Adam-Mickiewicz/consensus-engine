import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth', '/api/auth', '/api/cron', '/api/sync'];

// Map of path prefixes to tool_id in tools_registry
const TOOL_PATH_MAP = {
  '/tools/brand-media-studio': 'brand-media-studio',
  '/tools/marketing-brief':    'marketing-brief',
  '/tools/countdown':          'countdown',
  '/tools/znakowanie':         'znakowanie',
  '/tools/brand-settings':     'brand-settings',
  '/sock-designer':            'sock-designer',
  '/newsletter-builder':       'newsletter-builder',
  '/design-judge':             'design-judge',
  '/debate':                   'debate',
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes — require admin role
  if (pathname.startsWith('/admin')) {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleRow?.role !== 'admin') {
      const denied = request.nextUrl.clone();
      denied.pathname = '/';
      denied.searchParams.set('access_denied', '1');
      return NextResponse.redirect(denied);
    }
  }

  // Tool-specific permission check
  const matchedTool = Object.keys(TOOL_PATH_MAP).find(prefix => pathname.startsWith(prefix));
  if (matchedTool) {
    const toolId = TOOL_PATH_MAP[matchedTool];
    const { data: perm } = await supabase
      .from('user_permissions')
      .select('can_access')
      .eq('user_id', user.id)
      .eq('tool', toolId)
      .maybeSingle();

    // If a permission row exists and explicitly denies access
    if (perm && perm.can_access === false) {
      const denied = request.nextUrl.clone();
      denied.pathname = '/';
      denied.searchParams.set('access_denied', '1');
      return NextResponse.redirect(denied);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|png|ico)$).*)',
  ],
};
