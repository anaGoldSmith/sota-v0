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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { csvContent, apparatus } = await req.json();

    if (!csvContent || !apparatus) {
      return new Response(
        JSON.stringify({ success: false, error: 'CSV content and apparatus are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.error('CSV parsing errors:', parsed.errors);
      return new Response(
        JSON.stringify({ success: false, error: `CSV parsing failed: ${parsed.errors[0].message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requiredHeaders = ['code', 'comment'];
    const headers = Object.keys(parsed.data[0] || {});
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing required headers: ${missingHeaders.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const comments = parsed.data
      .map((row: any, idx: number) => {
        const code = row.code?.toString().trim();
        const comment = row.comment?.toString().trim();

        if (!code || !comment) {
          console.log(`Skipping row ${idx + 2}: ${!code ? 'code' : 'comment'} is missing`);
          return null;
        }

        return {
          apparatus,
          code,
          comment,
        };
      })
      .filter((item: any) => item !== null);

    console.log(`Parsed ${comments.length} DA comments for ${apparatus}`);

    // Delete existing comments for this apparatus
    const { error: deleteError } = await supabase
      .from('da_comments')
      .delete()
      .eq('apparatus', apparatus);

    if (deleteError) {
      console.error('Error deleting existing DA comments:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to delete existing comments: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new comments
    const { error: insertError } = await supabase
      .from('da_comments')
      .insert(comments);

    if (insertError) {
      console.error('Error inserting DA comments:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to insert comments: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${comments.length} DA comments for ${apparatus}`,
        count: comments.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-da-comments-csv function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});