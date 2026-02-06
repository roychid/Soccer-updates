// api/whatsapp-updates.js
export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

    if (!RAPIDAPI_KEY) {
      throw new Error("Missing RAPIDAPI_KEY environment variable");
    }

    const topLeagues = [
      { id: 39, name: "Premier League" },
      { id: 140, name: "La Liga" },
      { id: 78, name: "Bundesliga" },
      { id: 135, name: "Serie A" },
      { id: 61, name: "Ligue 1" },
      { id: 2, name: "Champions League" }
    ];

    const today = new Date().toISOString().split("T")[0];

    const allMatches = [];

    for (const league of topLeagues) {
      try {
        const url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&date=${today}&season=2024`;

        const response = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "v3.football.api-sports.io"
          }
        });

        const data = await response.json();

        if (data.response && data.response.length > 0) {
          data.response.forEach(match => {
            allMatches.push({
              league: league.name,
              time: new Date(match.fixture.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              }),
              home: match.teams.home.name,
              away: match.teams.away.name,
              homeGoals: match.goals.home,
              awayGoals: match.goals.away,
              status: match.fixture.status.short,
              venue: match.fixture.venue?.name || "TBD",
              round: match.league.round
            });
          });
        }
      } catch (err) {
        console.error(`Error fetching ${league.name}:`, err.message);
      }
    }

    const matchesByLeague = {};
    allMatches.forEach(match => {
      if (!matchesByLeague[match.league]) {
        matchesByLeague[match.league] = [];
      }
      matchesByLeague[match.league].push(match);
    });

    const completedMatches = allMatches.filter(m =>
      ["FT", "AET", "PEN"].includes(m.status)
    );

    const upcomingMatches = allMatches.filter(m =>
      ["NS", "TBD"].includes(m.status)
    );

    const liveMatches = allMatches.filter(m =>
      ["LIVE", "HT", "1H", "2H"].includes(m.status)
    );

    const whatsappMessages = generateWhatsAppMessages({
      matchesByLeague,
      completedMatches,
      upcomingMatches,
      liveMatches,
      today
    });

    res.status(200).json({
      success: true,
      messages: whatsappMessages,
      stats: {
        totalMatches: allMatches.length,
        completed: completedMatches.length,
        upcoming: upcomingMatches.length,
        live: liveMatches.length
      }
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
