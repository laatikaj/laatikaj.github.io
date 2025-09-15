/**
 * Cloudflare Worker
 *
 */
export default {
  async fetch(request, env, ctx) {

    const url = new URL(request.url);
    const clientKey = url.searchParams.get("key");
    const portfolioKey = await env.PORTFOLIO_KEY.get();

    if (clientKey !== portfolioKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      });
    }

    const symbol = url.searchParams.get("symbol") || "AAPL";
    const apiKey = await env.FINNHUB_API_KEY.get(); 

    try {

      const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      const quote = await quoteRes.json();

      const responseData = {
        symbol: symbol,
        currentPrice: quote.c,
        open: quote.o,
        high: quote.h,
        low: quote.l,
        previousClose: quote.pc
      };

      return new Response(JSON.stringify(responseData), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
      
    } catch (err) {
      console.error("Virhe Workerissa:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      });
    }
  }
};

/*...tallessa kunnes turso tulee kuvioihin
    const tursoUrl = await env.TURSO_PORTFOLIO_URL.get();
    const tursoAuthToken = await env.TURSO_PORTFOLIO_TOKEN.get();

    let sql = "SELECT * FROM help ORDER BY sequence"; // oletuskysely

    // Lue SQL-kysely POST-pyynnön rungosta
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body && body.requests && body.requests[0] && body.requests[0].sql) {
          sql = body.requests[0].sql;
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: "Virheellinen JSON-pyyntö" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    const query = {
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" }
      ]
    };

    const tursoResponse = await fetch(tursoUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tursoAuthToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    const result = await tursoResponse.json();

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
*/
