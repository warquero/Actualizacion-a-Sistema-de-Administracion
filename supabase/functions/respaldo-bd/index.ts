// supabase/functions/respaldo-bd/index.ts
// Función Edge para generar resumen y respaldo estructurado de tablas críticas

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Consultar el estado actual de todas las tablas
    const [mat, mov, sal, cli, pro, edi] = await Promise.all([
      supabase.from("materiales").select("*"),
      supabase.from("movimientos").select("*"),
      supabase.from("saldo_cuenta").select("*"),
      supabase.from("clientes").select("*"),
      supabase.from("proveedores").select("*"),
      supabase.from("ediciones").select("*"),
    ]);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      app: "ShuryStore Inventario",
      datos: {
        materiales: mat.data || [],
        movimientos: mov.data || [],
        saldo_cuenta: sal.data || [],
        clientes: cli.data || [],
        proveedores: pro.data || [],
        ediciones: edi.data || [],
      },
    };

    return new Response(JSON.stringify(backupPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
