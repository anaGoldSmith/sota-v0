import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('❌ Role check failed:', roleError);
      throw new Error('Failed to verify admin role');
    }

    if (!isAdmin) {
      throw new Error('User is not an admin');
    }

    console.log('📥 Parsing CSV content...');
    const csvContent = await req.text();
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.error('❌ CSV parsing errors:', parsed.errors);
      throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
    }

    // Validate headers
    const requiredHeaders = ['code', 'name', 'description', 'symbol_image'];
    const headers = Object.keys(parsed.data[0] || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    // Transform and validate data
    const criteria = parsed.data.map((row: any) => {
      return {
        code: row.code?.trim() || '',
        name: row.name?.trim() || '',
        description: row.description?.trim() || '',
        symbol_image: row.symbol_image?.trim() || null,
      };
    }).filter(c => c.code && c.name);

    console.log(`✅ Parsed ${criteria.length} criteria from CSV`);

    // Delete existing criteria
    console.log('🗑️  Deleting existing criteria...');
    const { error: deleteError } = await supabase
      .from('criteria')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error deleting criteria:', deleteError);
      throw new Error(`Failed to delete existing criteria: ${deleteError.message}`);
    }

    // Insert new criteria
    console.log('📝 Inserting new criteria...');
    const { error: insertError } = await supabase
      .from('criteria')
      .insert(criteria);

    if (insertError) {
      console.error('❌ Error inserting criteria:', insertError);
      throw new Error(`Failed to insert criteria: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${criteria.length} criteria`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: criteria.length,
        message: `Successfully imported ${criteria.length} criteria` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message === 'User is not an admin' ? 403 : 500
      }
    );
  }
});