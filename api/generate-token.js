export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceId, fileName, apiKey } = req.body;
    const VALID_API_KEY = "perubpm_secret_key_2024";

    if (!apiKey || apiKey !== VALID_API_KEY) {
      return res.status(401).json({ error: 'API key inválida' });
    }

    if (!referenceId || !fileName) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const token = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const host = req.headers.host || 'perubpm.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const downloadUrl = `${protocol}://${host}/api/download?token=${token}&ref=${encodeURIComponent(referenceId)}&name=${encodeURIComponent(fileName)}`;

    return res.status(200).json({
      success: true,
      token,
      downloadUrl,
      expiresIn: 15
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error: ' + error.message });
  }
}
