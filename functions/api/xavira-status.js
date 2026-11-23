
export async function onRequestGet({ request, env }) {

  const json = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  };

  try {

    // 1. Check the Xavira secret exists.

    if (!env.XAVIRA_API_KEY) {
      return json({
        success: false,
        message: "Xavira API secret is missing."
      }, 500);
    }

    // 2. Require a logged-in IWishAi user.

    const authorization =
      request.headers.get("Authorization");

    if (!authorization ||
        !authorization.startsWith("Bearer ")) {

      return json({
        success: false,
        message: "Please log in first."
      }, 401);
    }

    // 3. Verify the Supabase session.

    const SUPABASE_URL =
      "https://imqxdmmkmxpltosghzzc.supabase.co";

    const SUPABASE_KEY =
      "sb_publishable_M7OVWWuO4ksT0pxV2t7v7w_fj4su0RV";

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": authorization
        }
      }
    );

    if (!authResponse.ok) {
      return json({
        success: false,
        message: "Your login session is invalid. Please log in again."
      }, 401);
    }

    // 4. Check Xavira account without generating an image.

    const xaviraResponse = await fetch(
      "https://api.xavira.ai/v1/account",
      {
        method: "GET",
        headers: {
          "Authorization":
            `Bearer ${env.XAVIRA_API_KEY}`,
          "Accept": "application/json"
        }
      }
    );

    if (!xaviraResponse.ok) {

      return json({
        success: false,
        message: xaviraResponse.status === 401
          ? "Xavira rejected the API key. Check your secret."
          : "Unable to contact Xavira. Please try again.",
        upstream_status: xaviraResponse.status
      }, 502);

    }

    const account = await xaviraResponse.json();

    // 5. Return only the information we need.

    return json({
      success: true,
      message: "IWishAi is connected to Xavira!",
      credits_remaining: account.credits_remaining
    });

  } catch (error) {

    console.error("Xavira connection error:", error);

    return json({
      success: false,
      message: "Connection failed. Please try again."
    }, 500);

  }

}
