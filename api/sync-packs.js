export const config = {
  maxDuration: 300
};

const CATALOG_API = 'https://api.perubpm.com/catalog';

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function processPackageRecursive(pack, depth = 0) {
  if (depth > 10) return pack;
  
  const result = { ...pack };
  
  if (result.packages && result.packages.length > 0) {
    const processed = [];
    for (const sub of result.packages) {
      try {
        const fullSub = await fetchWithRetry(`${CATALOG_API}/slug/${sub.slug}`);
        processed.push(await processPackageRecursive(fullSub, depth + 1));
      } catch (e) {
        console.error(`Error fetching sub-package: ${sub.slug}`, e);
        processed.push(sub);
      }
    }
    result.packages = processed;
  }
  
  return result;
}

function sanitizePackData(data) {
  const allowedFields = ['name', 'slug', 'image', 'description', 'price', 'packages', 'remixes', 'referenceId'];
  
  function clean(obj) {
    const cleaned = {};
    for (const key of allowedFields) {
      if (obj[key] !== undefined) {
        if (key === 'packages') {
          cleaned.packages = obj.packages?.map(p => clean(p)) || [];
        } else if (key === 'remixes') {
          cleaned.remixes = (obj.remixes || []).map(r => ({
            name: r.name,
            referenceId: r.referenceId
          }));
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  }
  
  return clean(data);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, target, items, customImg, manualDate, index } = req.body;
  
  const VALID_API_KEY = "perubpm_admin_2024";
  if (apiKey !== VALID_API_KEY) {
    return res.status(401).json({ error: 'API key inválida' });
  }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Se requiere array de items' });
  }

  const currentIndex = index || 0;
  const itemsTotal = items.length;
  
  if (currentIndex >= itemsTotal) {
    return res.status(200).json({ 
      success: true, 
      done: true,
      message: 'Sincronización completa'
    });
  }

  const item = items[currentIndex];
  
  try {
    let packData;
    
    if ((item.packages?.length > 0) || (item.remixes?.length > 0)) {
      packData = item;
    } else {
      packData = await fetchWithRetry(`${CATALOG_API}/slug/${item.slug}`);
    }
    
    const processedPack = await processPackageRecursive(packData);
    const sanitized = sanitizePackData(processedPack);
    
    const finalDate = manualDate ? `${manualDate}T12:00:00Z` : new Date().toISOString();
    
    const firebaseUrl = `https://perubpm-96377-default-rtdb.firebaseio.com/${target}.json`;
    
    const firebaseRes = await fetch(firebaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: sanitized,
        originalDate: finalDate,
        customImage: customImg || null,
        timestamp: Date.now()
      })
    });
    
    if (!firebaseRes.ok) {
      throw new Error(`Firebase error: ${firebaseRes.status}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    return res.status(200).json({ 
      success: true,
      done: false,
      current: currentIndex + 1,
      total: itemsTotal,
      currentItem: item.slug || item.name,
      message: `Procesado ${currentIndex + 1}/${itemsTotal}: ${item.slug || item.name}`
    });

  } catch (error) {
    return res.status(200).json({ 
      success: true,
      done: false,
      error: true,
      current: currentIndex + 1,
      total: itemsTotal,
      errorMessage: error.message,
      message: `Error en ${item.slug || item.name}: ${error.message}`
    });
  }
}