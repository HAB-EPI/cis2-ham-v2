const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzsH2Gp-kjktV2sb0BtZgYS_PCvagZkcCPKr4b4E2ahWYNQXK7oDgHQmsvAowI4kKJ3/exec";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API : /api?action=...
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      try {
        const action = url.searchParams.get("action") || "";
        let body = {};

        if (request.method !== "GET" && request.method !== "HEAD") {
          const raw = await request.text();

          if (raw) {
            try {
              body = JSON.parse(raw);
            } catch (e) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Requête JSON invalide."
                }),
                {
                  status: 400,
                  headers: {
                    "Content-Type": "application/json; charset=utf-8"
                  }
                }
              );
            }
          }
        }

        const apiBody = {
          action,
          ...body
        };

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(apiBody),
          redirect: "follow"
        });

        const responseText = await response.text();

        return new Response(responseText, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") ||
              "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store"
          }
        });

      } catch (error) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: error && error.message
              ? error.message
              : String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "Erreur de configuration Cloudflare : binding ASSETS manquant.",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
};
