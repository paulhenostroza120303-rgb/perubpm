export default async function handler(req, res) {
  const ref = req.query.ref;
  const name = req.query.name || 'preview.mp3';

  if (!ref) {
    return res.status(400).json({ error: "Missing ref param" });
  }

  // Solo permitir extensiones de audio
  const allowedExts = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];
  const ext = name.split('.').pop().toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: "Extension not allowed" });
  }

  // Obtener URL del archivo desde la API original
  const apiUrl = `https://api.perubpm.com/catalog/music/ref/${ref}`;

  try {
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: "Audio not found" });
    }

    const data = await apiResponse.json();
    const audioUrl = data.url || data.downloadUrl || data.link;

    if (!audioUrl) {
      return res.status(404).json({ error: "Audio URL not found" });
    }

    // Fetch del audio
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return res.status(audioResponse.status).json({ error: "Failed to fetch audio" });
    }

    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Configurar timeout de 60 segundos para preview
    const PREVIEW_DURATION_MS = 60000; // 1 minuto
    
    // Configurar timeout
    const timeoutId = setTimeout(() => {
      console.log('Preview terminado - cerrando conexión');
      res.end();
    }, PREVIEW_DURATION_MS);

    // Stream el audio
    const stream = audioResponse.body;
    let bytesSent = 0;
    const maxBytes = 10 * 1024 * 1024; // 10MB máximo (aproximadamente 1 minuto a 128kbps)
    
    for await (const chunk of stream) {
      // Verificar si llegamos al límite
      if (bytesSent >= maxBytes) {
        clearTimeout(timeoutId);
        res.end();
        break;
      }
      
      res.write(chunk);
      bytesSent += chunk.length;
    }
    
    clearTimeout(timeoutId);
    res.end();

  } catch (err) {
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
