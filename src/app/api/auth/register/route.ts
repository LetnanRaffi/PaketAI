import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { TRIAL_DAYS } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey || !serviceKey) {
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

    const response = NextResponse.json({ success: true, needsVerification: true });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value)
            );
          }
        },
      },
    });

    // 1. Create auth user (uses anon key so session cookies get set)
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

    // 2-4. Use service role to bypass RLS for org/subscription inserts
    const admin = createClient(supabaseUrl, serviceKey);

    const slug =
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) +
      '-' +
      Date.now().toString(36);

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: orgName,
        slug,
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

    const { error: userError } = await admin.from('users').insert({
      id: authData.user.id,
      org_id: org.id,
      role: 'admin',
      full_name: fullName,
    });

    if (userError) {
      console.error('[Register] User link error:', userError);
    }

    await admin.from('subscriptions').insert({
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
