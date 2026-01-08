import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      throw new Error('Unauthorized');
    }

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
    const body = await req.json();
    const { csvContent } = body;
    
    if (!csvContent) {
      throw new Error('No CSV content provided in request body');
    }

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/ /g, '_'),
    });

    if (parsed.errors.length > 0) {
      console.error('❌ CSV parsing errors:', parsed.errors);
      const firstError = parsed.errors[0];
      throw new Error(`CSV parsing failed at row ${firstError.row || 0}: ${firstError.message}`);
    }

    const requiredHeaders = ['code', 'name'];
    const headers = Object.keys(parsed.data[0] || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const criteria = parsed.data.map((row: any) => {
      return {
        code: row.code?.trim() || '',
        name: row.name?.trim() || '',
      };
    }).filter(c => c.code && c.name);

    console.log(`✅ Parsed ${criteria.length} general criteria from CSV`);

    console.log('🗑️  Deleting existing general criteria...');
    const { error: deleteError } = await supabase
      .from('dynamic_general_criteria')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error deleting general criteria:', deleteError);
      throw new Error(`Failed to delete existing general criteria: ${deleteError.message}`);
    }

    console.log('📝 Inserting new general criteria...');
    const { error: insertError } = await supabase
      .from('dynamic_general_criteria')
      .insert(criteria);

    if (insertError) {
      console.error('❌ Error inserting general criteria:', insertError);
      throw new Error(`Failed to insert general criteria: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${criteria.length} general criteria`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: criteria.length,
        message: `Successfully imported ${criteria.length} general criteria` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorMessage === 'Unauthorized' || errorMessage === 'User is not an admin' ? 403 : 500
      }
    );
  }
});
