import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import Papa from 'https://esm.sh/papaparse@5.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    const { csvContent } = await req.json();
    
    if (!csvContent) {
      throw new Error('No CSV content provided');
    }

    console.log('📥 Parsing hoop bases CSV content...');

    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    if ((result as any).errors && (result as any).errors.length > 0) {
      console.error('CSV parse errors:', (result as any).errors);
      const firstErr = (result as any).errors[0];
      throw new Error(`CSV parse error: ${firstErr.message} at row ${firstErr.row}`);
    }

    const requiredHeaders = ['code', 'name', 'description', 'value'];
    const headers = Object.keys(((result as any).data?.[0]) || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const hoopBases = ((result as any).data as any[])
      .filter((raw: Record<string, unknown>) => {
        // Skip rows where code is empty (handles trailing empty rows)
        const code = (raw.code ?? '').toString().trim();
        return code.length > 0;
      })
      .map((raw: Record<string, unknown>, idx: number) => {
      const code = (raw.code ?? '').toString().trim() || null;
      const name = raw.name != null ? raw.name.toString().trim() : null;
      const description = raw.description != null ? raw.description.toString().trim() : null;
      let valueStr = raw.value != null ? raw.value.toString().trim() : null;

      if (valueStr && /^[0-9]+,[0-9]+$/.test(valueStr)) {
        valueStr = valueStr.replace(',', '.');
      }
      const value = valueStr !== null ? parseFloat(valueStr) : null;

      if (!code) throw new Error(`Row ${idx + 2}: code is required`);
      if (!name) throw new Error(`Row ${idx + 2}: name is required`);
      if (!description) throw new Error(`Row ${idx + 2}: description is required`);
      if (value === null || Number.isNaN(value)) throw new Error(`Row ${idx + 2}: value is required and must be a number`);

      return { code, name, description, value };
    });

    console.log(`✅ Parsed ${hoopBases.length} hoop bases from CSV`);

    console.log('🗑️  Deleting existing hoop bases...');
    const { error: deleteError } = await supabase
      .from('hoop_bases')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete existing hoop bases: ${deleteError.message}`);
    }

    console.log('📝 Inserting new hoop bases...');
    const { data: insertedData, error: insertError } = await supabase
      .from('hoop_bases')
      .insert(hoopBases)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert hoop bases: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${insertedData.length} hoop bases`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedData.length} hoop bases`,
        count: insertedData.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('❌ Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
