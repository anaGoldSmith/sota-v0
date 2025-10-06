import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim());

    // Validate headers
    const requiredHeaders = ['code', 'name', 'description', 'value', 'turn_degrees', 'symbol_image'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    const jumps = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v: string) => v.trim());
      const row: any = {};
      
      headers.forEach((header: string, index: number) => {
        let value = values[index] || null;
        
        // Handle quoted values
        if (value && value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        // Convert empty strings to null
        if (value === '' || value === '""') {
          value = null;
        }
        
        // Convert value to number
        if (header === 'value' && value !== null) {
          value = parseFloat(value);
        }
        
        row[header] = value;
      });

      jumps.push(row);
    }

    console.log(`✅ Parsed ${jumps.length} jumps from CSV`);

    // Start transaction: delete all existing jumps, then insert new ones
    console.log('🗑️  Deleting existing jumps...');
    const { error: deleteError } = await supabase
      .from('jumps')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete existing jumps: ${deleteError.message}`);
    }

    console.log('📝 Inserting new jumps...');
    const { data: insertedJumps, error: insertError } = await supabase
      .from('jumps')
      .insert(jumps)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert jumps: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${insertedJumps.length} jumps`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedJumps.length} jumps`,
        count: insertedJumps.length,
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
