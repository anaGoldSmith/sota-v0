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

    console.log('📥 Parsing Vertical Rotations CSV content...');

    // Parse CSV using robust parser
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy', // Skip all empty lines including those with just whitespace
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if ((result as any).errors && (result as any).errors.length > 0) {
      // Filter out errors that are just about empty rows
      const criticalErrors = (result as any).errors.filter((e: any) => 
        e.code !== 'TooFewFields' && e.code !== 'TooManyFields'
      );
      if (criticalErrors.length > 0) {
        console.error('CSV parse errors:', criticalErrors);
        throw new Error(`CSV parse error: ${criticalErrors[0].message}`);
      }
    }

    // Validate headers - columns: group, group_name, DB, code, name, description
    const requiredHeaders = ['group', 'group_name', 'db', 'code', 'name', 'description'];
    const headers = Object.keys(((result as any).data?.[0]) || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}`);
    }

    // Build vertical rotations array with proper types, filtering out empty rows
    const verticalRotations = ((result as any).data as any[])
      .map((raw: Record<string, unknown>, idx: number) => {
        const code = (raw.code ?? '').toString().trim() || null;
        
        // Skip empty rows (rows with no code)
        if (!code) {
          console.log(`Skipping row ${idx + 2}: empty code`);
          return null;
        }
        
        const group = raw.group != null ? raw.group.toString().trim() : null;
        const group_name = raw.group_name != null ? raw.group_name.toString().trim() : null;
        const db = raw.db != null ? raw.db.toString().trim() : null;
        const name = raw.name != null ? raw.name.toString().trim() : null;
        const description = raw.description != null ? raw.description.toString().trim() : null;

        return { group, group_name, db, code, name, description };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    console.log(`✅ Parsed ${verticalRotations.length} vertical rotations from CSV`);

    if (verticalRotations.length === 0) {
      throw new Error('No valid data found in CSV. Ensure rows have code values.');
    }

    // Start transaction: delete all existing vertical rotations, then insert new ones
    console.log('🗑️  Deleting existing vertical rotations...');
    const { error: deleteError } = await supabase
      .from('vertical_rotations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete existing vertical rotations: ${deleteError.message}`);
    }

    // Insert in batches to avoid payload limits
    console.log('📝 Inserting new vertical rotations...');
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < verticalRotations.length; i += batchSize) {
      const batch = verticalRotations.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('vertical_rotations')
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to insert vertical rotations: ${insertError.message}`);
      }
      insertedCount += batch.length;
    }

    console.log(`✅ Successfully imported ${insertedCount} vertical rotations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedCount} vertical rotations`,
        count: insertedCount,
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
