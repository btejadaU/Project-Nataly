import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Sesión no válida.');

    const { data: adminProfile } = await adminClient.from('perfiles_administradores').select('id').eq('id', user.id).maybeSingle();
    if (!adminProfile) throw new Error('Solo un administrador puede crear usuarios.');

    const { fullName, email, documentNumber, phone, role } = await request.json();
    if (!fullName || !email || !['teacher', 'guardian'].includes(role)) throw new Error('Datos de usuario incompletos.');

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, email_confirm: false, user_metadata: { full_name: fullName } });
    if (createError) throw createError;

    const roleTable = role === 'teacher' ? 'perfiles_profesores' : 'perfiles_acudientes';
    const { error: roleError } = await adminClient.from(roleTable).insert({ id: created.user.id, document_number: documentNumber || null, phone: phone || null });
    if (roleError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw roleError;
    }

    return new Response(JSON.stringify({ id: created.user.id, email }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
