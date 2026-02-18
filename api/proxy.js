export default async function handler(req, res) {
  const target = req.query.url;

  console.log('📥 Proxy recibe request:', target);

  if (!target) {
    return res.status(400).json({ error: "Missing url param" });
  }

  // Seguridad básica: solo permitir perubpm
  const allowedHosts = ["api.perubpm.com"];
  
  let host;
  try {
    host = new URL(target).hostname;
  } catch (e) {
    console.log('❌ URL inválida:', e.message);
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!allowedHosts.includes(host)) {
    console.log('❌ Host no permitido:', host);
    return res.status(403).json({ error: "Domain not allowed" });
  }

  try {
    console.log('🌐 Haciendo fetch a:', target);
    
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      }
    });

    console.log('📬 Respuesta:', response.status, response.statusText);

    const contentType = response.headers.get("content-type") || "application/json";
    console.log('📋 Content-Type:', contentType);
    
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      console.log('❌ API error:', response.status);
      return res.status(response.status).json({ error: `API Error: ${response.status}`, data });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    
    console.log('✅ Enviando respuesta');
    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({
      error: "Proxy error",
      detail: err.message
    });
  }
}
