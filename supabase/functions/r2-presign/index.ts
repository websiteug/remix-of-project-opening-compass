import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT");
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME");

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
      console.error("Missing R2 configuration environment variables");
      return new Response(
        JSON.stringify({ error: "R2 configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileName, fileType, folder } = await req.json();

    if (!fileName || !fileType) {
      return new Response(
        JSON.stringify({ error: "fileName and fileType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating presigned URL for: ${fileName}, type: ${fileType}, folder: ${folder}`);

    // Generate unique key
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folderPath = folder || "uploads";
    const key = `${folderPath}/${timestamp}_${safeName}`;

    // Parse host from endpoint
    const endpoint = R2_ENDPOINT.replace(/\/$/, "");
    const urlObj = new URL(endpoint);
    const host = `${R2_BUCKET_NAME}.${urlObj.host}`;
    const bucketUrl = `${urlObj.protocol}//${host}/${key}`;

    // AWS Signature V4 for presigned URL
    const region = "auto";
    const service = "s3";
    const expiresIn = 3600; // 1 hour
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const shortDate = dateStamp.substring(0, 8);

    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
    const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

    // Query parameters for presigned URL
    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": dateStamp,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "content-type;host",
    });

    // Canonical request for presigned URL
    const canonicalRequest = [
      "PUT",
      `/${key}`,
      queryParams.toString(),
      `content-type:${fileType}\nhost:${host}\n`,
      "content-type;host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      dateStamp,
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    // Derive signing key
    const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${R2_SECRET_ACCESS_KEY}`), shortDate);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, "aws4_request");

    const signature = await hmacSha256Hex(kSigning, stringToSign);

    // Add signature to query params
    queryParams.set("X-Amz-Signature", signature);

    const presignedUrl = `${bucketUrl}?${queryParams.toString()}`;
    const publicUrl = bucketUrl;

    console.log(`Presigned URL generated for key: ${key}`);

    return new Response(
      JSON.stringify({ 
        presignedUrl, 
        publicUrl, 
        key,
        contentType: fileType 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Presign error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========== Crypto Helpers ==========

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const sig = await hmacSha256(key, message);
  return Array.from(sig)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
