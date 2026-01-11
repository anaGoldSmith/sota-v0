import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { csvContent } = await req.json();

    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'No CSV content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        return header.trim().toLowerCase().replace(/\s+/g, '_');
      }
    });

    if (parseResult.errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'CSV parsing error', details: parseResult.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = parseResult.data as Record<string, string>[];

    // Validate required headers
    const requiredHeaders = ['risk_code', 'name'];
    const headers = Object.keys(data[0] || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required headers: ${missingHeaders.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean and validate data
    const cleanedData = data
      .filter(row => row.risk_code && row.risk_code.trim() !== '')
      .map(row => ({
        risk_code: row.risk_code.trim(),
        name: row.name?.trim() || '',
        rotations_value: row.rotations_value ? parseFloat(row.rotations_value) : null,
        series: row.series?.trim() || null,
      }));

    if (cleanedData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing data
    const { error: deleteError } = await supabase
      .from('prerecorded_risks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to clear existing data', details: deleteError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from('prerecorded_risks')
      .insert(cleanedData);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to insert data', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${cleanedData.length} prerecorded risks` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
