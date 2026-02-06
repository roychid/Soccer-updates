// api/whatsapp-updates.js
export default async function handler(req, res) {
  try {
    const API_KEY = "8b93d10d51a93a1b2b70a5a3a9411161";

    // Define top leagues (you can customize)
    const topLeagues = [
      { id: 39, name: "Premier League" },
      { id: 140, name: "La Liga" },
      { id: 78, name: "Bundesliga" },
      { id: 135, name: "Serie A" },
      { id: 61, name: "Ligue 1" },
      { id: 2, name: "Champions League" }
    ];

    // Get today and tomorrow dates
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const allMatches = [];
    
    // Fetch matches for each league
    for (const league of topLeagues) {
      try {
        const url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&date=${today}&season=2024`;
        const response = await fetch(url, {
          headers: { "x-apisports-key": API_KEY }
        });
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          data.response.forEach(match => {
            allMatches.push({
              league: league.name,
              time: new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        console.error(`Error fetching ${league.name}:`, err);
      }
    }

    // Group matches by league
    const matchesByLeague = {};
    allMatches.forEach(match => {
      if (!matchesByLeague[match.league]) {
        matchesByLeague[match.league] = [];
      }
      matchesByLeague[match.league].push(match);
    });

    // Get completed matches (for results)
    const completedMatches = allMatches.filter(m => 
      m.status === 'FT' || m.status === 'AET' || m.status === 'PEN'
    );

    // Get upcoming matches
    const upcomingMatches = allMatches.filter(m => 
      m.status === 'NS' || m.status === 'TBD'
    );

    // Get live matches
    const liveMatches = allMatches.filter(m => 
      m.status === 'LIVE' || m.status === 'HT' || m.status === '1H' || m.status === '2H'
    );

    // Generate formatted WhatsApp messages
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

function generateWhatsAppMessages(data) {
  const { matchesByLeague, completedMatches, upcomingMatches, liveMatches, today } = data;
  
  const messages = [];

  // 1. DAILY HEADLINE MESSAGE
  let headline = `⚽ *FOOTBALL DAILY UPDATE* ⚽\n`;
  headline += `📅 ${new Date(today).toDateString()}\n\n`;
  messages.push({ type: "headline", content: headline });

  // 2. LIVE MATCHES (if any)
  if (liveMatches.length > 0) {
    let liveMsg = `🔥 *LIVE NOW* 🔥\n\n`;
    liveMatches.forEach(match => {
      liveMsg += `⚡ ${match.home} ${match.homeGoals || 0}-${match.awayGoals || 0} ${match.away}\n`;
      liveMsg += `📍 ${match.league} | ${match.time}\n`;
      liveMsg += `\n`;
    });
    messages.push({ type: "live", content: liveMsg });
  }

  // 3. COMPLETED MATCH RESULTS
  if (completedMatches.length > 0) {
    let resultsMsg = `✅ *TODAY'S RESULTS*\n\n`;
    
    // Group completed matches by league
    const completedByLeague = {};
    completedMatches.forEach(match => {
      if (!completedByLeague[match.league]) {
        completedByLeague[match.league] = [];
      }
      completedByLeague[match.league].push(match);
    });

    Object.entries(completedByLeague).forEach(([league, matches]) => {
      resultsMsg += `🏆 *${league}*\n`;
      matches.forEach(match => {
        const result = `${match.homeGoals}-${match.awayGoals}`;
        const winner = match.homeGoals > match.awayGoals ? match.home : 
                      match.awayGoals > match.homeGoals ? match.away : "Draw";
        
        resultsMsg += `• ${match.home} ${result} ${match.away}\n`;
        resultsMsg += `  ⭐ ${winner}\n`;
      });
      resultsMsg += `\n`;
    });
    messages.push({ type: "results", content: resultsMsg });
  }

  // 4. UPCOMING FIXTURES
  if (upcomingMatches.length > 0) {
    let fixturesMsg = `📋 *UPCOMING FIXTURES*\n\n`;
    
    Object.entries(matchesByLeague).forEach(([league, matches]) => {
      const upcomingInLeague = matches.filter(m => m.status === 'NS' || m.status === 'TBD');
      if (upcomingInLeague.length > 0) {
        fixturesMsg += `🏆 *${league}*\n`;
        
        // Group by time
        const byTime = {};
        upcomingInLeague.forEach(match => {
          if (!byTime[match.time]) byTime[match.time] = [];
          byTime[match.time].push(match);
        });

        Object.entries(byTime).forEach(([time, timeMatches]) => {
          fixturesMsg += `🕒 ${time}\n`;
          timeMatches.forEach(match => {
            fixturesMsg += `• ${match.home} vs ${match.away}\n`;
          });
          fixturesMsg += `\n`;
        });
      }
    });
    messages.push({ type: "fixtures", content: fixturesMsg });
  }

  // 5. STANDOUT PERFORMANCE/HIGHLIGHT
  if (completedMatches.length > 0) {
    // Find match with most goals
    const highScoringMatch = completedMatches.reduce((max, match) => {
      const totalGoals = (match.homeGoals || 0) + (match.awayGoals || 0);
      const maxGoals = (max.homeGoals || 0) + (max.awayGoals || 0);
      return totalGoals > maxGoals ? match : max;
    }, completedMatches[0]);

    if (highScoringMatch) {
      const highlightMsg = `🌟 *MATCH OF THE DAY* 🌟\n\n`;
      highlightMsg += `⚽ ${highScoringMatch.home} ${highScoringMatch.homeGoals}-${highScoringMatch.awayGoals} ${highScoringMatch.away}\n`;
      highlightMsg += `🏆 ${highScoringMatch.league}\n`;
      highlightMsg += `🎯 Total Goals: ${(highScoringMatch.homeGoals || 0) + (highScoringMatch.awayGoals || 0)}\n\n`;
      highlightMsg += `What a thriller! 🔥`;
      
      messages.push({ type: "highlight", content: highlightMsg });
    }
  }

  return messages;
}
