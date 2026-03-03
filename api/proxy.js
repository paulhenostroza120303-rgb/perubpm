export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    return res.status(400).json({ error: "Missing url param" });
  }

  const allowedHosts = ["api.perubpm.com"];
  
  let host;
  try {
    host = new URL(target).hostname;
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!allowedHosts.includes(host)) {
    return res.status(403).json({ error: "Domain not allowed" });
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      }
    });

    const contentType = response.headers.get("content-type") || "application/json";
    
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `API Error: ${response.status}`, data });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=120");
    
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({
      error: "Proxy error",
      detail: err.message
    });
  }
}
