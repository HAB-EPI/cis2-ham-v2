const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzsH2Gp-kjktV2sb0BtZgYS_PCvagZkcCPKr4b4E2ahWYNQXK7oDgHQmsvAowI4kKJ3/exec";

export default {
  async fetch(request) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      const url = new URL(request.url);
      const targetUrl = APPS_SCRIPT_URL + url.search;

      const init = {
        method: request.method,
        redirect: "follow",
        headers: request.headers
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
      }

      const response = await fetch(targetUrl, init);

      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message || String(error) }),
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
};
