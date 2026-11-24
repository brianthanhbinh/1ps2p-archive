export default async function handler(req, res) {
  try {
    // Read version history directly from the main 1ps2p repository.
    // This removes the dependency on Vercel's deployments API and its tokens.
    const response = await fetch(
      "https://api.github.com/repos/brianthanhbinh/1ps2p/commits?per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "1ps2p-version-archive",
        },
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("GitHub commits API failed:", response.status, detail);
      res.setHeader("Cache-Control", "no-store");
      return res.status(response.status === 403 ? 503 : 502).json({
        error: "Unable to load version history from GitHub.",
      });
    }

    const commits = await response.json();
    const versions = commits.map((item) => {
      const sha = item.sha || "";
      const message = item.commit?.message?.split("\n")[0] || "Unnamed commit";
      const created = item.commit?.author?.date || item.commit?.committer?.date || null;

      return {
        // Opens the exact source commit in GitHub.
        url: item.html_url || `https://github.com/brianthanhbinh/1ps2p/commit/${sha}`,
        message,
        commit: sha.slice(0, 7),
        created,
      };
    });

    // Cache briefly so refreshing the archive does not exhaust GitHub's API limit.
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(versions);
  } catch (err) {
    console.error("Version archive error:", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Failed to load version history." });
  }
}
