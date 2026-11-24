
const SUPABASE_URL =
  "https://imqxdmmkmxpltosghzzc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_M7OVWWuO4ksT0pxV2t7v7w_fj4su0RV";

const MODEL =
  "@cf/black-forest-labs/flux-2-klein-4b";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify the Workers AI binding.

    if (!env.AI) {
      return json({
        success: false,
        message: "Workers AI binding is missing."
      }, 500);
    }

    // 2. Require a logged-in user.

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json({
        success: false,
        message: "Please log in first."
      }, 401);
    }

    // 3. Verify Supabase session.

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": authorization
        }
      }
    );

    if (!authResponse.ok) {
      return json({
        success: false,
        message: "Invalid login session."
      }, 401);
    }

    const user = await authResponse.json();

    if (!user.id) {
      return json({
        success: false,
        message: "User verification failed."
      }, 401);
    }

    // 4. Read generation settings.

    const body = await request.json();

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const style =
      typeof body.style === "string"
        ? body.style.slice(0, 40)
        : "Realistic";

    const ratio =
      typeof body.ratio === "string"
        ? body.ratio
        : "1:1";

    if (!prompt || prompt.length > 2000) {
      return json({
        success: false,
        message: "Enter a prompt of up to 2000 characters."
      }, 400);
    }

    // 5. Supported image dimensions.

    const dimensions = {
      "1:1": [1024, 1024],
      "9:16": [576, 1024],
      "9:20": [512, 1136],
      "16:9": [1024, 576],
      "4:3": [1024, 768],
      "3:4": [768, 1024]
    };

    const [width, height] =
      dimensions[ratio] || dimensions["1:1"];

    // 6. Build multipart input.

    const form = new FormData();

    form.append(
      "prompt",
      `${prompt}, ${style} art style, high detail`
    );

    form.append("width", String(width));
    form.append("height", String(height));

    const serialized = new Response(form);

    // 7. Generate image using FLUX.2 Klein 4B.

    const result = await env.AI.run(MODEL, {
      multipart: {
        body: serialized.body,
        contentType:
          serialized.headers.get("content-type")
      }
    });

    // 8. Return generated image.

    if (!result || !result.image) {
      return json({
        success: false,
        message: "The AI did not return an image."
      }, 502);
    }

    return json({
      success: true,
      image: `data:image/png;base64,${result.image}`,
      model: "FLUX.2 Klein 4B",
      width,
      height
    });

  } catch (error) {
    console.error("IWishAi generation error:", error);

    return json({
      success: false,
      message:
        "Image generation failed. Please try again."
    }, 500);
  }
}
