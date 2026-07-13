import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { TRIAL_DAYS } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const { fullName, email, password, orgName } = await request.json();

    if (!fullName || !email || !password || !orgName) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    });

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Gagal membuat akun.' },
        { status: 500 }
      );
    }

    // 2. Create organization
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: slug + '-' + Date.now().toString(36),
        plan: 'trial',
        trial_ends_at: new Date(
          Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error('[Register] Org creation error:', orgError);
      return NextResponse.json(
        { error: 'Gagal membuat organisasi.' },
        { status: 500 }
      );
    }

    // 3. Link user to org
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      org_id: org.id,
      role: 'admin',
      full_name: fullName,
    });

    if (userError) {
      console.error('[Register] User link error:', userError);
    }

    // 4. Create initial subscription
    await supabase.from('subscriptions').insert({
      org_id: org.id,
      status: 'pending',
      amount: 159000,
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Register] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
