export default async function handler(req, res) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.PROJECT_ID;

  if (!token || !projectId) {
    return res.status(500).json({ error: "Missing Vercel environment variables on server." });
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&state=READY&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    const cleanList = (data.deployments || []).map((dep) => ({
      url: `https://${dep.url}`,
      message: dep.meta?.githubCommitMessage || 'Manual Deploy',
      commit: dep.meta?.githubCommitSha?.slice(0, 7) || '',
      created: dep.created,
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(cleanList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deployments' });
  }
}
