export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    return res.status(400).json({ error: "Missing url param" });
  }

  // Seguridad básica: solo permitir perubpm
  const allowedHosts = ["api.perubpm.com"];
  const host = new URL(target).hostname;

  if (!allowedHosts.includes(host)) {
    return res.status(403).json({ error: "Domain not allowed" });
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const contentType =
      response.headers.get("content-type") || "application/json";
    const data = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.status(response.status).send(data);

  } catch (err) {
    res.status(500).json({
      error: "Proxy error",
      detail: err.message
    });
  }
}
