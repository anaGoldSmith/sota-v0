import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    const dl = url.searchParams.get('dl') === '1';

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the file from storage
    const { data, error } = await supabaseAdmin.storage
      .from('rulebooks')
      .download(filePath);

    if (error) {
      console.error('Storage download error:', error);
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract filename from path
    const fileName = filePath.split('/').pop() || 'document.pdf';

    // Set appropriate headers
    const disposition = dl ? 'attachment' : 'inline';
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
    };

    return new Response(data, { headers });
  } catch (error) {
    console.error('Error serving file:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
