import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
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

    // Parse CSV with robust options
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy', // Skip all empty lines including those with just whitespace
      transformHeader: (header: string) => header.toLowerCase().trim().replace(/\s+/g, '_'),
    });

    if (parsed.errors.length > 0) {
      // Filter out errors that are just about empty rows
      const criticalErrors = parsed.errors.filter((e: any) => 
        e.code !== 'TooFewFields' && e.code !== 'TooManyFields'
      );
      if (criticalErrors.length > 0) {
        console.error('CSV parsing errors:', criticalErrors);
        return new Response(
          JSON.stringify({ error: 'CSV parsing failed', details: criticalErrors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate required headers
    const requiredHeaders = ['db_group', 'code'];
    const headers = parsed.meta.fields || [];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: `Missing required headers: ${missingHeaders.join(', ')}`,
          foundHeaders: headers
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to parse numeric values, handling comma decimals
    const parseNumeric = (val: unknown): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const strVal = String(val).trim().replace(',', '.');
      const num = parseFloat(strVal);
      return isNaN(num) ? null : num;
    };

    // Transform data - filter out rows that don't have required fields
    const elements = parsed.data
      .filter((row: any) => {
        // Must have db_group and code as minimum
        const dbGroup = row.db_group?.toString().trim();
        const code = row.code?.toString().trim();
        return dbGroup && code;
      })
      .map((row: any) => ({
        db_group: row.db_group?.toString().trim() || '',
        group: row.group?.toString().trim() || null,
        code: row.code?.toString().trim() || '',
        name: row.name?.toString().trim() || null,
        description: row.description?.toString().trim() || null,
        value: parseNumeric(row.value),
        turn_degrees: row.turn_degrees?.toString().trim() || null,
      }));

    if (elements.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data found in CSV. Ensure rows have db_group and code values.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${elements.length} valid rows from CSV`);

    // Delete existing records
    const { error: deleteError } = await supabase
      .from('dbs_for_risks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting existing records:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear existing data', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new records in batches to avoid payload limits
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('dbs_for_risks')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting records:', insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert data', 
            details: insertError.message,
            insertedSoFar: insertedCount
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, message: `Successfully imported ${insertedCount} DBs for Risks` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
