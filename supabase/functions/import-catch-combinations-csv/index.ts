import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { data: hasRole } = await supabaseClient.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!hasRole) throw new Error('Admin privileges required');

    const { csvContent } = await req.json();
    if (!csvContent) throw new Error('Missing csvContent');

    const rows = csvContent.split('\n').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
    if (rows.length < 2) throw new Error('CSV must have headers and at least one data row');

    const headers = rows[0].split(',').map((h: string) => h.trim());
    const requiredColumns = ['code', 'Catch8', 'Catch9'];
    const missing = requiredColumns.filter(c => !headers.includes(c));
    if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',').map((v: string) => v.trim());
      if (values.length < headers.length) continue;
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx]; });
      if (row.code) {
        data.push({
          code: row.code,
          Catch8: row.Catch8 || 'N',
          Catch9: row.Catch9 || 'N',
        });
      }
    }

    if (data.length === 0) throw new Error('No valid rows found');

    const { error: deleteError } = await supabaseClient
      .from('catch_combinations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

    const { error: insertError } = await supabaseClient
      .from('catch_combinations')
      .insert(data);
    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    return new Response(
      JSON.stringify({ success: true, count: data.length, message: `Imported ${data.length} catch combinations` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
