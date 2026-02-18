import { google } from 'googleapis';

let serviceAccount;
try {
  serviceAccount = require('./perubpm-486721-5ee205b8fc9f.json');
} catch (e) {
  serviceAccount = {
    type: "service_account",
    project_id: "perubpm-486721",
    private_key_id: "5ee205b8fc9fe4d0656352f77f6a5843d7c1ef11",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9ljj0x3LiJE2A\nZmOwyU5zeOOjD3g8RKhH0pLIre8NcJhRaQq2MkJBLbgbpLoIcU2NcVeVEi8wWq20\n5nR5FssIa0PavgFBpluWm4nL80RrZ/g8F5gTpqu9vp+rTvIgtkplkKwPe9FBGkKW\nuzOEEhBDY3fih9QLUrEIn69/HOkoIzchmWG6MLSia7HETGTPPKUaVRAYA5nhFYiZ\nQYpsw1YOb8yqN/QZZ6k21pOcCuc3wG5QArTEztWf2nZ3PuuQqKR1gTrJeq6yiZoi\ne1oOaROSIWTCsR8F9f26f5eOlFC6cKPsPdHOIBpQtKBQ3l5FmIwhmdPG0NIqGLLt\nd3sAepJJAgMBAAECggEAAgx2ppBci/gDtXToFA4kjTkRgfNQSolvLpiB4RcZpnsM\nIFLxmivRL5OEPX6pOMPP9hFOmy0oZX4H7nlZROWjo8eGh3149ZxHXkTcVRI2ojj+\naoZAPviLjXOEKBWNnU2O/ACFMy5G3VW3geMCl6ntYOJ5KJ8sqxVw+h/u6e8a/a7v\n9dHH+iyIGLe4hlft8SrhN+l1sh/MxYyHHz4bQgYxVH135w4+YqwvOlvtle1r7rqe\nHSPcyjplzailS7Xl6AS+MI5yDI2SfTOjvKa8/bjIgy6sJHNZ3cU1IKdXPK9VFSIZ\nrLJ/4A7KTZQiU+TbpbmOElTeLC1+XVs1dION6wjN0QKBgQDuPHW3M6R+MxArpo1J\nWDNvseYDVNewcPTXe1JOaVIcFc9d4/eJrXSBmWuTcslRPLQHIakNPJJCSY9tDt60\nbUjG53NvhRtX5MEy4Lu5eyNVDbdYmvqZYI0/1vMOajE8PveJ9B4Rz/ZEj7TF6dNK\nMkfVS8vdsSGZqPBlMXx6qhf2sQKBgQDLuSAmjkpgeGv+T7mYQd2iG8R+rsMlSRvI\nRtJs6imzBvwK5L5zu/kuU0b2eq1j6aP1m8WCzx2z4d6H/2RmtAKPaW5KdR9FRrdq\noYSTqQlUsWqbnm4G+vuL8eCvKnfpGPy0fezsNVvQn9Y7kP3vFykM9eHQwhcAlK08\nVb+tqV/rGQKBgANLHq17r0h3WD/iO43KBFwE75MYNysfRKM99zNSTWpJ+uXnYuKq\nXTP1dQFC0vmmhy6aDoY6UiNMdQki7X09DYaCaJwgEPK0HN+hL7cutpxUZjZ5XgGE\nzi8Vv6JxYWDd1fo4P7orT9I+0lbyFpOuAkQ2mgjki/xd04TynC/t7grhAoGAVDQg\nZc9KTrV3bZXmUFhpEygG/5WcczzUjuM29m2S7rxkUNxbG9sGE2+4VQg/wpw/eLT5\n3iddT4x8PhoBlbGxnTUmsP/X/PpNtXUtJxsnECqEte217IywjBddlwkmpuH9EV07\nICat3H00P0qeqsQX45N90ptmhobtU5Ldtxna24ECgYEAj+8q//tHw7ulHKKmzuIS\na5GEIWvKJN+ZDOj80HS4oBEBC+ut3r7tEo1AuqcRibew85PIwPZIX1LtjxrT4yM8\nd2II48pFqq5ZpB93Z5OGcuPKA0AcZI8bY5NpassIbLMRW0QCgerbViN+2FsolIkx\nwYHwnpFk08qIuB2V2OgbR7Y=\n-----END PRIVATE KEY-----\n",
    client_email: "perubpm-drive@perubpm-486721.iam.gserviceaccount.com",
    client_id: "103160646518007612607"
  };
}

const FOLDER_ID = '14VOnsz94KDDCtbk7XcoQHvpCAHXl58H7';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    const { folderId, search } = req.query;
    const targetFolderId = folderId || FOLDER_ID;
    
    let query;
    if (search) {
      query = `name contains '${search}' and trashed = false and '${FOLDER_ID}' in parents`;
    } else {
      query = `'${targetFolderId}' in parents and trashed = false`;
    }
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: search ? 'modifiedTime desc' : 'name asc',
      pageSize: 100
    });

    const files = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size,
      modifiedTime: file.modifiedTime
    }));

    return res.status(200).json({ success: true, files, count: files.length });

  } catch (error) {
    console.error('Error completo:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
