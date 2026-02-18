export default async function handler(req, res) {
  const img = req.query.img;

  if (!img) {
    return res.status(400).json({ error: "Missing img param" });
  }

  // Solo permitir extensiones de imagen
  const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const ext = img.split('.').pop().toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: "Extension not allowed" });
  }

  const targetUrl = `https://perubpm.blob.core.windows.net/static/assets/categories/${img}`;

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Image not found" });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buffer));

  } catch (err) {
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
