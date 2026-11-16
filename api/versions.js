export default async function handler(req, res) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.PROJECT_ID;

  if (!token || !projectId) {
    return res.status(500).json({ error: "Missing Vercel environment variables on server." });
  }

  try {
    let allDeployments = [];
    let queryParams = `projectId=${projectId}&state=READY&limit=100`;
    let hasMore = true;

    // Loop through pagination until all deployments are fetched
    while (hasMore && allDeployments.length < 500) { // Safety cap at 500
      const response = await fetch(
        `https://api.vercel.com/v6/deployments?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      const deployments = data.deployments || [];
      
      allDeployments = allDeployments.concat(deployments);

      // Check if there are more deployments using the pagination cursor
      if (data.pagination && data.pagination.next) {
        queryParams = `projectId=${projectId}&state=READY&limit=100&until=${data.pagination.next}`;
      } else {
        hasMore = false;
      }
    }

    const cleanList = allDeployments.map((dep) => ({
      url: `https://${dep.url}`,
      message: dep.meta?.githubCommitMessage || 'Manual Deploy',
      commit: dep.meta?.githubCommitSha?.slice(0, 7) || '',
      created: dep.created,
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(cleanList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load all deployments' });
  }
}
