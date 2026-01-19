import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import Papa from 'https://esm.sh/papaparse@5.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    // Get CSV content from request
    const { csvContent } = await req.json();
    
    if (!csvContent) {
      throw new Error('No CSV content provided');
    }

    console.log('📥 Parsing CSV content...');

    // Parse CSV using robust parser
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if ((result as any).errors && (result as any).errors.length > 0) {
      console.error('CSV parse errors:', (result as any).errors);
      const firstErr = (result as any).errors[0];
      throw new Error(`CSV parse error: ${firstErr.message} at row ${firstErr.row}`);
    }

    // Validate headers
    const requiredHeaders = ['code', 'name', 'description', 'value', 'turn_degrees', 'fouette', 'leg_level', 'flat', 'slow_turn', 'symbol_image'];
    const headers = Object.keys(((result as any).data?.[0]) || {});
    console.log('📋 CSV headers found:', headers);
    console.log('📋 Required headers:', requiredHeaders);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      console.error('❌ Missing headers:', missingHeaders);
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
    }

    // Helper to parse boolean values
    const parseBool = (val: unknown): boolean => {
      if (val === null || val === undefined || val === '') return false;
      const str = val.toString().trim().toLowerCase();
      return str === 'true' || str === '1' || str === 'yes';
    };

    // Build balances array with proper types
    const balances = ((result as any).data as any[]).map((raw: Record<string, unknown>, idx: number) => {
      const code = (raw.code ?? '').toString().trim() || null;
      const name = raw.name != null ? raw.name.toString().trim() : null;
      const description = raw.description != null ? raw.description.toString().trim() : null;
      const symbol_image = raw.symbol_image != null ? raw.symbol_image.toString().trim() : null;
      const turn_degrees = raw.turn_degrees != null ? raw.turn_degrees.toString().trim() : null;
      const leg_level = raw.leg_level != null ? raw.leg_level.toString().trim() : null;
      const fouette = parseBool(raw.fouette);
      const flat = parseBool(raw.flat);
      const slow_turn = parseBool(raw.slow_turn);
      
      let valueStr = raw.value != null ? raw.value.toString().trim() : null;

      // Support comma decimals like "0,10"
      if (valueStr && /^[0-9]+,[0-9]+$/.test(valueStr)) {
        valueStr = valueStr.replace(',', '.');
      }
      const value = valueStr !== null ? parseFloat(valueStr) : null;

      if (!code) throw new Error(`Row ${idx + 2}: code is required`);
      if (!description) throw new Error(`Row ${idx + 2}: description is required`);
      if (value === null || Number.isNaN(value)) throw new Error(`Row ${idx + 2}: value is required and must be a number`);

      return { code, name, description, value, turn_degrees, fouette, leg_level, flat, slow_turn, symbol_image };
    });

    console.log(`✅ Parsed ${balances.length} balances from CSV`);

    // Start transaction: delete all existing balances, then insert new ones
    console.log('🗑️  Deleting existing balances...');
    const { error: deleteError } = await supabase
      .from('balances')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete existing balances: ${deleteError.message}`);
    }

    console.log('📝 Inserting new balances...');
    const { data: insertedBalances, error: insertError } = await supabase
      .from('balances')
      .insert(balances)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert balances: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${insertedBalances.length} balances`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedBalances.length} balances`,
        count: insertedBalances.length,
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
