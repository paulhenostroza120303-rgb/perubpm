export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, ref, name } = req.query;

  if (!token || !ref || !name) {
    return res.redirect('/?error=parametros');
  }

  try {
    const downloadUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(name)}`;
    
    // Descargar el archivo y servirlo al usuario
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      return res.redirect('/?error=archivo_no_encontrado');
    }
    
    // Obtener headers del archivo original
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Pipe del archivo al response
    const { Readable } = require('stream');
    const stream = Readable.from(response.body);
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error:', error);
    return res.redirect('/?error=error_descarga');
  }
}
