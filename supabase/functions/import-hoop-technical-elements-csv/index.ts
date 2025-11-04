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

    console.log('📥 Parsing hoop technical elements CSV content...');

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

    const requiredHeaders = ['parentgroup', 'parentgroupcode', 'technicalelement', 'da', 'specialcode', 'code', 'name', 'description'];
    const headers = Object.keys(((result as any).data?.[0]) || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const technicalElements = ((result as any).data as any[])
      .filter((raw: Record<string, unknown>) => {
        // Skip rows where required fields are empty
        const parentGroup = raw.parentgroup != null ? raw.parentgroup.toString().trim() : '';
        const code = raw.code != null ? raw.code.toString().trim() : '';
        const name = raw.name != null ? raw.name.toString().trim() : '';
        return parentGroup && code && name;
      })
      .map((raw: Record<string, unknown>, idx: number) => {
        const parentGroup = raw.parentgroup != null ? raw.parentgroup.toString().trim() : null;
        const parentGroupCode = raw.parentgroupcode != null ? raw.parentgroupcode.toString().trim() : null;
        const code = raw.code != null ? raw.code.toString().trim() : null;
        const name = raw.name != null ? raw.name.toString().trim() : null;
        const description = raw.description != null ? raw.description.toString().trim() : null;
        
        const technicalElementStr = raw.technicalelement != null ? raw.technicalelement.toString().trim().toUpperCase() : 'N';
        const technicalElement = technicalElementStr === 'Y' || technicalElementStr === 'TRUE' || technicalElementStr === '1';
        
        const daStr = raw.da != null ? raw.da.toString().trim().toUpperCase() : 'N';
        const da = daStr === 'Y' || daStr === 'TRUE' || daStr === '1';
        
        const specialCodeStr = raw.specialcode != null ? raw.specialcode.toString().trim().toUpperCase() : 'N';
        const specialCode = specialCodeStr === 'Y' || specialCodeStr === 'TRUE' || specialCodeStr === '1';
        
        const dataInformationAboutTe = raw.datainformationaboutte != null ? raw.datainformationaboutte.toString().trim() : null;

        if (!parentGroup) throw new Error(`Row ${idx + 2}: parentGroup is required (value: "${raw.parentgroup}")`);
        if (!parentGroupCode) throw new Error(`Row ${idx + 2}: parentGroupCode is required`);
        if (!code) throw new Error(`Row ${idx + 2}: code is required`);
        if (!name) throw new Error(`Row ${idx + 2}: name is required`);
        if (!description) throw new Error(`Row ${idx + 2}: description is required`);

        return {
          parent_group: parentGroup,
          parent_group_code: parentGroupCode,
          technical_element: technicalElement,
          da: da,
          special_code: specialCode,
          code,
          name,
          description,
          data_information_about_te: dataInformationAboutTe,
        };
      });

    console.log(`✅ Parsed ${technicalElements.length} hoop technical elements from CSV`);

    console.log('🗑️  Deleting existing hoop technical elements...');
    const { error: deleteError } = await supabase
      .from('hoop_technical_elements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete existing hoop technical elements: ${deleteError.message}`);
    }

    console.log('📝 Inserting new hoop technical elements...');
    const { data: insertedData, error: insertError } = await supabase
      .from('hoop_technical_elements')
      .insert(technicalElements)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert hoop technical elements: ${insertError.message}`);
    }

    console.log(`✅ Successfully imported ${insertedData.length} hoop technical elements`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedData.length} hoop technical elements`,
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
