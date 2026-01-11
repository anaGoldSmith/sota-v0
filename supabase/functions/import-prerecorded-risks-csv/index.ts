import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Papa from 'https://esm.sh/papaparse@5.4.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user's JWT and get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the user is an admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    const { csvContent } = await req.json()

    if (!csvContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No CSV content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    })

    if (parsed.errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CSV parsing errors', 
          details: parsed.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate required headers
    const requiredHeaders = ['risk_code', 'risk_component_code']
    const headers = Object.keys(parsed.data[0] || {})
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required columns: ${missingHeaders.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean and validate data
    const riskComponents = (parsed.data as any[])
      .filter(row => row.risk_code && row.risk_component_code)
      .map(row => ({
        risk_code: String(row.risk_code).trim(),
        risk_component_code: String(row.risk_component_code).trim(),
        description: row.description ? String(row.description).trim() : null,
        value: row.value ? parseFloat(row.value) : null,
      }))

    if (riskComponents.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid data rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete existing records
    const { error: deleteError } = await supabase
      .from('prerecorded_risk_components')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (deleteError) {
      console.error('Error deleting existing records:', deleteError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to clear existing data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert new records
    const { error: insertError } = await supabase
      .from('prerecorded_risk_components')
      .insert(riskComponents)

    if (insertError) {
      console.error('Error inserting records:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to insert data', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${riskComponents.length} prerecorded risk components` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
