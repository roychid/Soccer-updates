export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY =
      process.env.RAPIDAPI_KEY || "b1d4f776c5msh0a5a6ce81cd9670p1e5ae8jsn169c02186937";

    const { league, date, live, team } = req.query;

    let url = `https://v3.football.api-sports.io/fixtures?season=2024`;

    if (live === "true") {
      url += "&live=all";
    } else if (date) {
      url += `&date=${date}`;
    } else {
      url += `&date=${new Date().toISOString().split("T")[0]}`;
    }

    if (league) url += `&league=${league}`;
    if (team) url += `&team=${team}`;

    console.log("Fetching from:", url);

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "v3.football.api-sports.io",
      },
    });

    const data = await response.json();

    if (!data.response) {
      console.log("API Error:", data.errors);
      return res.status(200).json({ fixtures: [] });
    }

    const fixtures = data.response.map(f => ({
      fixture: f.fixture,
      league: f.league,
      teams: f.teams,
      goals: f.goals,
      score: f.score,
      events: f.events,
      lineups: f.lineups,
      statistics: f.statistics,
    }));

    res.status(200).json({ fixtures });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({
      error: "API error",
      details: err.message,
    });
  }
}
