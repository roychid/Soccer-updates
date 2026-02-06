export default async function handler(req, res) {
    try {
        const API_KEY = process.env.API_KEY || "8b93d10d51a93a1b2b70a5a3a9411161";
        
        const { league, date, live, team } = req.query;
        
        let url = `https://v3.football.api-sports.io/fixtures?season=2024`;
        
        if (live === 'true') {
            url += '&live=all';
        } else if (date) {
            url += `&date=${date}`;
        } else {
            url += `&date=${new Date().toISOString().split('T')[0]}`;
        }
        
        if (league && league !== '') {
            url += `&league=${league}`;
        }
        
        if (team && team !== '') {
            url += `&team=${team}`;
        }
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url, {
            headers: {
                "x-apisports-key": API_KEY,
                "Accept": "application/json"
            }
        });
        
        const data = await response.json();
        
        if (!data.response) {
            console.log('API Error:', data.errors);
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
            statistics: f.statistics
        }));
        
        res.status(200).json({ fixtures });
        
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ 
            error: "API error", 
            details: err.message 
        });
    }
}
