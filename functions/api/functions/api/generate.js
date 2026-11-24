
const SUPABASE_URL =
  "https://imqxdmmkmxpltosghzzc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_M7OVWWuO4ksT0pxV2t7v7w_fj4su0RV";

const MODEL =
  "@cf/black-forest-labs/flux-2-klein-9b";

export async function onRequestPost({ request, env }) {

  const json = (data, status = 200) =>
    Response.json(data, {
      status,
      headers: { "Cache-Control": "no-store" }
    });

  try {

    if (!env.AI) {
      return json({
        success: false,
        message: "Workers AI binding is missing. Redeploy first."
      }, 500);
    }

    // Verify login

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json({
        success: false,
        message: "Please log in first."
      }, 401);
    }

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: authorization
        }
      }
    );

    if (!authResponse.ok) {
      return json({
        success: false,
        message: "Invalid login session."
      }, 401);
    }

    // Read prompt

    const body = await request.json();

    const prompt = String(body.prompt || "").trim();

    if (!prompt || prompt.length > 2000) {
      return json({
        success: false,
        message: "Enter a prompt of up to 2000 characters."
      }, 400);
    }

    // Prepare image request

    const form = new FormData();
    form.append("prompt", prompt);

    const formResponse = new Response(form);

    // Generate image

    const result = await env.AI.run(MODEL, {
      multipart: {
        body: formResponse.body,
        contentType: formResponse.headers.get("content-type")
      }
    });

    if (!result?.image) {
      throw new Error("No image returned by AI.");
    }

    return json({
      success: true,
      image: `data:image/png;base64,${result.image}`,
      model: MODEL
    });

  } catch (error) {

    console.error("Image generation error:", error);

    return json({
      success: false,
      message: "Image generation failed. Please try again."
    }, 500);

  }
}
