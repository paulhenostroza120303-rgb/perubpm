export default async function handler(req, res) {
  const ref = req.query.ref;
  const name = req.query.name || 'preview.mp3';

  if (!ref) {
    return res.status(400).json({ error: "Missing ref param" });
  }

  const allowedExts = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];
  const ext = name.split('.').pop().toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: "Extension not allowed" });
  }

  // Calcular tamaño basado en formato
  // MP3: 3MB (aprox 3 min a 128kbps)
  // WAV: 10MB (aprox 50-60 seg a 1.4Mbps)
  // Otros: 2MB
  let MAX_BYTES;
  if (ext === 'mp3') {
    MAX_BYTES = 3000000;
  } else if (ext === 'wav') {
    MAX_BYTES = 10000000;
  } else {
    MAX_BYTES = 2000000;
  }

  const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(name)}`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Audio not found" });
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    let bytesSent = 0;
    const stream = response.body;
    
    for await (const chunk of stream) {
      if (bytesSent >= MAX_BYTES) break;
      res.write(chunk);
      bytesSent += chunk.length;
    }
    
    res.end();

  } catch (err) {
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
