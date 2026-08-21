const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxVwBQT1qXh6yqWcgpzrPDYGafRc14yRYw-UR4yzF-0oUwbkJsMgRS6Q3wxZ7-DGr83/exec";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================================================
    // CORS
    // =========================================================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    // Requête OPTIONS envoyée par le navigateur
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================================================
    // API → GOOGLE APPS SCRIPT
    // =========================================================

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
                  success: false,
                  error: "Requête JSON invalide."
                }),
                {
                  status: 400,
                  headers: {
                    ...corsHeaders,
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

        const jsonBody = JSON.stringify(apiBody);

        // ---------------------------------------------------------
        // On contacte Apps Script SANS suivre automatiquement
        // la redirection.
        // ---------------------------------------------------------

        let response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          body: jsonBody,
          redirect: "manual"
        });

        // ---------------------------------------------------------
        // Apps Script peut répondre par une redirection.
        // On la suit nous-mêmes en conservant POST + JSON.
        // ---------------------------------------------------------

        let nombreRedirections = 0;

        while (
          response.status >= 300 &&
          response.status < 400 &&
          nombreRedirections < 5
        ) {
          const location = response.headers.get("Location");

          if (!location) {
            break;
          }

          response = await fetch(
            new URL(location, APPS_SCRIPT_URL).toString(),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8"
              },
              body: jsonBody,
              redirect: "manual"
            }
          );

          nombreRedirections++;
        }

        const responseText = await response.text();

        // ---------------------------------------------------------
        // Protection supplémentaire :
        // Apps Script doit nous renvoyer du JSON.
        // ---------------------------------------------------------

        const contentType =
          response.headers.get("Content-Type") || "";

        const texteTrim = responseText.trim();

        if (
          texteTrim.startsWith("<!DOCTYPE html") ||
          texteTrim.startsWith("<html") ||
          contentType.toLowerCase().includes("text/html")
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "Google Apps Script a renvoyé une page HTML au lieu du JSON. " +
                "La redirection Apps Script n'a pas pu être suivie correctement.",
              debug: responseText.substring(0, 500)
            }),
            {
              status: 502,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
              }
            }
          );
        }

        return new Response(responseText, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type":
              contentType || "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });

      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              error && error.message
                ? error.message
                : String(error)
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store"
            }
          }
        );
      }
    }

    // =========================================================
    // SITE WEB
    // =========================================================

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
