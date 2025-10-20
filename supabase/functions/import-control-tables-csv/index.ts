import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ControlRow {
  code: string;
  Cr1V?: string;
  Cr2H?: string;
  Cr3L?: string;
  Cr7R?: string;
  Cr4F?: string;
  Cr5W?: string;
  Cr6DB?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: hasRole } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasRole) {
      throw new Error('Admin privileges required');
    }

    const { csvContent, tableName } = await req.json();

    if (!csvContent || !tableName) {
      throw new Error('Missing required fields: csvContent, tableName');
    }

    const validTables = ['ball_control', 'hoop_control', 'clubs_control', 'ribbon_control'];
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name. Must be one of: ${validTables.join(', ')}`);
    }

    console.log(`Processing ${tableName} import`);

    const rows = csvContent.split('\n').map((row: string) => row.trim()).filter((row: string) => row.length > 0);
    
    if (rows.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headers = rows[0].split(',').map((h: string) => h.trim());
    console.log('Headers:', headers);

    const requiredColumns = ['code', 'Cr1V', 'Cr2H', 'Cr3L', 'Cr7R', 'Cr4F', 'Cr5W', 'Cr6DB'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const controlData: ControlRow[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',').map((v: string) => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}. Skipping.`);
        continue;
      }

      const rowData: ControlRow = { code: '' };
      
      headers.forEach((header: string, index: number) => {
        const value = values[index];
        if (header === 'code') {
          rowData.code = value;
        } else if (requiredColumns.includes(header)) {
          // Validate Y/N values for criteria columns
          if (value && value !== 'Y' && value !== 'N' && value !== '') {
            console.warn(`Invalid value "${value}" for ${header} in row ${i + 1}. Must be Y or N.`);
          }
          rowData[header as keyof ControlRow] = value || null;
        }
      });

      if (rowData.code) {
        controlData.push(rowData);
      }
    }

    console.log(`Parsed ${controlData.length} valid rows`);

    if (controlData.length === 0) {
      throw new Error('No valid data rows found in CSV');
    }

    // Delete existing data
    const { error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }

    // Insert new data
    const { error: insertError } = await supabaseClient
      .from(tableName)
      .insert(controlData);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert data: ${insertError.message}`);
    }

    console.log(`Successfully imported ${controlData.length} rows to ${tableName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${controlData.length} rows to ${tableName}`,
        rowCount: controlData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-control-tables-csv:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
