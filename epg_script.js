// epg_script.js

// --------------------
// GLOBAL GAME STATE & CONSTANTS
// --------------------
let gameState = {
    currentScreen: 'mainMenu', // e.g., 'mainMenu', 'gmOffice', 'scouting', 'roster', 'gameDayPrep', 'gameDaySim', 'scenario', 'codex', 'endSeason', 'narrativeIntro'
    currentWeek: 0, // 0 for off-season, 1-17 for regular season
    scoutingIntel: 150,
    greenRating: 40, // Team Green Rating (0-100)
    gmReputation: {
        progTrad: 50, // Progressive (0) <-> Traditionalist (100)
        ecoFiscal: 50  // Eco-Advocate (0) <-> Fiscal Prioritiser (100)
    },
    seasonWins: 0,
    seasonLosses: 0,
    eaglesRoster: [], // Array of player objects
    allNFLTeams: {}, // Object where keys are team names and values are arrays of player objects
    teamBudget: 0, // New property for the team budget
    completedScenarios: [], // Array of scenario IDs
    gameSchedule: [], // Array of opponent objects
    jakeHarrisSkills: {
        cricketersComposure: true,
        designersInsight: true
    },
    tutorialStep: 0,
    seasonGoal: {
        wins: 9,
        greenRatingMin: 55
    },
    isGameOver: false,
    weeklyTrainingFocus: null, // e.g., "Offensive Drills", "Defensive Schemes", "Philosophical Alignment Workshop"
    currentOpponentIndex: 0, // To track opponent in gameSchedule
    gameLog: [], // For text-based game simulation
    playerStrategies: { // For game day
        offensive: null,
        defensive: null
    },
    temporaryGameModifiers: { // Temporary modifiers applied for the next game only
        offence: 0,
        defence: 0
    },
    recruitmentFilterState: { // To store draft board filter values
        searchTerm: "",
        positionFilter: "",
        offenceFilter: "",
        defenceFilter: "",
        costFilter: ""
    },
    unansweredOpponentPoints: 0, // Track unanswered points by opponent
    eaglesChallengesLeft: 2 // Number of challenges available
};

let allNFLPlayers = []; // Global variable to store loaded player data
let loadedFakeNames = [];
let loadedRealNamesNormal = [];
let loadedRealNamesStrange = [];

const MINIMUM_ROSTER_SIZE = 11; // Minimum players needed to start the season

// NFL_REAL_NAMES and NFL_FAKE_NAMES are no longer needed for recruitment
// They might still be used for the scouting mini-game, so let's keep them for now
// const NFL_REAL_NAMES = [ // This list should be significantly expanded for variety
//     "Quinyon Mitchell", "Bo Nix", "Laiatu Latu", "Marvin Harrison Jr.", "Joe Alt",
//     "Malik Nabers", "JC Latham", "Dallas Turner", "Rome Odunze", "Brock Bowers",
//     "Terrion Arnold", "Olumuyiwa Fashanu", "Troy Fautanu", "Jared Verse", "Cooper DeJean",
//     "Nate Wiggins", "Amarius Mims", "Graham Barton", "Chop Robinson", "Brian Thomas Jr.",
//     "Adonai Mitchell", "Kool-Aid McKinstry", "Jackson Powers-Johnson", "Jordan Morgan", "Xavier Worthy",
//     "Tyler Guyton", "Darius Robinson", "Ladd McConkey", "Payton Wilson", "Ennis Rakestraw Jr.",
//     "Jalen Hurts", "A.J. Brown", "DeVonta Smith", "Dallas Goedert", "Saquon Barkley",
//     "Jordan Mailata", "Landon Dickerson", "Jason Kelce", "Lane Johnson", "Jordan Davis",
//     "Jalen Carter", "Haason Reddick", "Josh Sweat", "Nakobe Dean", "Darius Slay", "James Bradberry" // Added some Eagles
// ];

// const NFL_FAKE_NAMES = [ // Used for the scouting mini-game only
//     "Zephyrian Stone", "Quantavious Swift", "Barnaby 'Blitz' Cromwell", "Seraphina 'Cannon' Jones",
//     "Jaxon 'Jet' Steele", "Lysander 'Lockdown' Payne", "Evander 'Edge' Knight", "Thaddeus 'Tank' Maximus",
//     "Cassian 'Clutch' Rivers", "Octavia 'Oracle' Moon", "Peregrine 'Powerhouse' Finch", "Montgomery 'Monsoon' Blackwood",
//     "Silas 'Spectre' Thorne", "Aurelia 'Avalanche' Frost", "Leopold 'Lightning' Vance", "Horatio 'Hammer' Strong"
// ];


let currentScoutingSession = {
    round: 0,
    namesOnScreen: [],
    correctRingerThisRound: null,
    intelEarnedThisSession: 0,
    maxRounds: 5
};

// CRITICAL FIX: NFL_POSITIONS must be defined BEFORE PLAYER_PHILOSOPHY_TEMPLATES
const NFL_POSITIONS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DE", "DT", "LB", "CB", "S", "K", "P"];

const PLAYER_PHILOSOPHY_TEMPLATES = {
    "Individualist": {
        name: "Individualist Free-Wheeler",
        tenets: "Maximises personal freedom and expression. Believes individual brilliance wins games. Can be unpredictable but occasionally spectacular.",
        traitName: "Hero Ball",
        traitDescription: "Small chance to individually overcome a negative team play outcome or make a spectacular solo play.",
        roleBias: ["QB", "WR", "RB"],
        baseStatModifiers: { offence: 5, defence: -2, moraleImpact: -5, loyaltyImpact: -5 },
        scenarioReactions: {}
    },
    "Egalitarian": {
        name: "Egalitarian Workhorse",
        tenets: "Prioritises collective good and team cohesion. Believes in equal effort and shared success. Reliable and selfless.",
        traitName: "Unit Cohesion",
        traitDescription: "Small stat boost to adjacent players or overall team effectiveness in collective plays. Improves team morale.",
        roleBias: ["OL", "LB", "TE"],
        baseStatModifiers: { offence: 2, defence: 3, moraleImpact: 5, loyaltyImpact: 5 },
        scenarioReactions: {}
    },
    "Traditionalist": {
        name: "Traditionalist Bulwark",
        tenets: "Upholds time-honoured strategies and discipline. Values experience and proven methods. Resists radical change.",
        traitName: "Stay the Course",
        traitDescription: "Less susceptible to opponent trick plays or sudden momentum shifts. Provides stability.",
        roleBias: ["DT", "S", "FB", "C"],
        baseStatModifiers: { offence: -1, defence: 5, moraleImpact: 0, loyaltyImpact: 10 },
        scenarioReactions: {}
    },
    "Neutral": { // For basic players
        name: "Utility Player",
        tenets: "Focuses on fundamentals and fulfilling their role as assigned. Adaptable but rarely spectacular.",
        traitName: "Reliable Backup",
        traitDescription: "Performs consistently at their skill level without major deviations.",
        roleBias: NFL_POSITIONS, // Now NFL_POSITIONS is defined
        baseStatModifiers: { offence: 0, defence: 0, moraleImpact: 0, loyaltyImpact: 0 },
        scenarioReactions: {}
    }
};

const SCENARIOS_MVP = [
    {
        id: "SCN001", triggerWeek: 2, title: "The Green Initiative",
        description: "City council proposes a mandatory composting program for major venues, including the stadium. It's costly upfront, estimated at 20 Intel, but would significantly boost your Green Rating.",
        choices: [
            { text: "Support it fully. Showcase Eagles as eco-leaders.", outcome: { textFeedback: "The Eagles are lauded for their environmental stance! The investment pays off in public image.", greenRatingChange: 15, gmReputation: { ecoFiscal: -15 }, scoutingIntel: -20, playerMoraleChange: 2 } },
            { text: "Publicly question the cost-effectiveness and lobby against it.", outcome: { textFeedback: "Fiscal conservatives praise your prudence, but environmental groups are critical.", greenRatingChange: -5, gmReputation: { ecoFiscal: 15 }, playerMoraleChange: -2 } },
            { text: "Propose a phased, voluntary approach with a smaller initial investment (10 Intel).", outcome: { textFeedback: "A moderate path, but some are unimpressed with the compromise. It's a start.", greenRatingChange: 5, gmReputation: { ecoFiscal: -5 }, scoutingIntel: -10 } }
        ]
    },
    {
        id: "SCN002", triggerWeek: 4, title: "Player Political Statement",
        description: "A star player known for their outspoken views makes a controversial political statement on social media, dividing fan opinion and causing some locker room tension.",
        choices: [
            { text: "Publicly support the player's right to free speech, emphasizing team unity despite diverse views.", outcome: { textFeedback: "Praised by progressives and player advocacy groups. Some traditional fans are upset.", gmReputation: { progTrad: -10 }, playerLoyaltyChange: { forPlayer: 10, teamImpact: -3} } },
            { text: "Issue a neutral statement about focusing on football, and privately ask the player to tone it down.", outcome: { textFeedback: "A safe play, but satisfies no one completely. The player feels slightly muzzled.", gmReputation: { progTrad: 5 }, playerLoyaltyChange: { forPlayer: -5, teamImpact: 0} } },
            { text: "Publicly state that players should avoid controversial topics and stick to sports.", outcome: { textFeedback: "Applauded by traditionalists and those wanting 'sports without politics'. The player and their allies are unhappy.", gmReputation: { progTrad: 15 }, playerLoyaltyChange: { forPlayer: -15, teamImpact: -5 }, greenRatingChange: -2 /* Implied lack of progressive thought */ } }
        ]
    },
    {
        id: "SCN003", triggerWeek: 6, title: "Stadium Upgrade Dilemma",
        description: "An opportunity arises to invest in cutting-edge, eco-friendly stadium lighting. It's expensive (30 Intel) but offers long-term energy savings and a major Green Rating boost.",
        choices: [
            { text: "Make the investment. This is a clear win for sustainability.", outcome: { textFeedback: "The new lights are a hit! Your Green Rating soars.", greenRatingChange: 20, scoutingIntel: -30, gmReputation: { ecoFiscal: -10 } } },
            { text: "Delay the decision, citing budget constraints for player acquisition.", outcome: { textFeedback: "The board understands, but a chance for green leadership is missed.", greenRatingChange: -3, scoutingIntel: 0, gmReputation: { ecoFiscal: 5 } } },
            { text: "Explore a cheaper, less effective alternative (15 Intel).", outcome: { textFeedback: "A minor improvement is made, but it's not the game-changer hoped for.", greenRatingChange: 7, scoutingIntel: -15, gmReputation: { ecoFiscal: -3 } } }
        ]
    },
    {
        id: "LOYAL_IND01",
        triggerCondition: (gs) => gs.currentWeek === 5 && gs.eaglesRoster.some(p => p.philosophy === "Individualist" && p.morale < 60),
        title: "Maverick's Media Mishap",
        description: () => {
            const player = gameState.eaglesRoster.find(p => p.philosophy === "Individualist" && p.morale < 60);
            return player ? `Your Individualist player, ${player.name}, made some off-the-cuff controversial remarks to the press, criticising team strategy after the last game and alienating some teammates.` : "An Individualist player made some off-the-cuff controversial remarks...";
        },
        choices: [
            { text: "Back the player publicly: 'Passion is good, we'll channel it.'", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} appreciates the support. Team cohesion takes a minor hit.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: 15 }, teamMoraleChange: -5, gmReputation: { progTrad: -5} } },
            { text: "Privately reprimand, publicly state 'internal matter'.", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} is chastened. The situation is contained.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: -5 }, playerMoraleChange: { forPlayerNameDynamic: true, change: -10 }, teamMoraleChange: 2, gmReputation: { progTrad: 0 } } },
            { text: "Fine the player for detrimental conduct.", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} is furious. Sets a disciplinary tone but risks alienating the player.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: -20 }, playerMoraleChange: { forPlayerNameDynamic: true, change: -15 }, teamMoraleChange: 0, gmReputation: { progTrad: 10 } } }
        ],
        dynamicPlayerTargeted: true
    },
    {
        id: "LOYAL_EGA01",
        triggerCondition: (gs) => gs.currentWeek === 7 && gs.eaglesRoster.some(p => p.philosophy === "Egalitarian" && p.weeksWithTeam > 3),
        title: "Workhorse's Community Project",
        description: () => {
            const player = gameState.eaglesRoster.find(p => p.philosophy === "Egalitarian" && p.weeksWithTeam > 3);
            return player ? `${player.name}, your Egalitarian player, wants to start a team-wide volunteer day at a local soup kitchen. It requires some logistical support and time off from light practice.` : "An Egalitarian player wants to start a team-wide volunteer day...";
        },
        choices: [
            { text: "Fully support it. Great for team image and morale.", outcome: { textFeedback: "The event is a huge success! Team bonds strengthen.", teamMoraleChange: 10, greenRatingChange: 5, gmReputation: { ecoFiscal: -5 } } },
            { text: "Allow it, but with minimal team resources.", outcome: { textFeedback: "The player appreciates the gesture, though wishes for more backing.", teamMoraleChange: 3, greenRatingChange: 2 } },
            { text: "Suggest they focus on football, not extracurriculars.", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} is disappointed. A missed opportunity for community engagement.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: -10 }, teamMoraleChange: -3, gmReputation: { progTrad: 5 } } }
        ],
        dynamicPlayerTargeted: true
    },
    {
        id: "LOYAL_TRA01",
        triggerCondition: (gs) => gs.currentWeek === 8 && gs.eaglesRoster.some(p => p.philosophy === "Traditionalist" && p.loyalty < 70),
        title: "Bulwark's Concerns",
        description: () => {
            const player = gameState.eaglesRoster.find(p => p.philosophy === "Traditionalist" && p.loyalty < 70);
            return player ? `${player.name}, a Traditionalist veteran, expresses concern about some of the newer, 'flashier' play calls, fearing they deviate too much from proven Eagles' fundamentals.` : "A Traditionalist veteran expresses concern...";
        },
        choices: [
            { text: "Assure them their experience is valued and some traditional plays will be emphasized.", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} feels heard and respected.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: 15 }, playerMoraleChange: { forPlayerNameDynamic: true, change: 5}, gmReputation: { progTrad: 5 } } },
            { text: "Tell them the game evolves, and they need to adapt.", outcome: { textFeedback: (player) => `${player ? player.name : 'The player'} is concerned the team is losing its identity.`, playerLoyaltyChange: { forPlayerNameDynamic: true, change: -10 }, playerMoraleChange: { forPlayerNameDynamic: true, change: -10}, gmReputation: { progTrad: -10 } } },
            { text: "Organise a team meeting to discuss strategy, allowing all voices.", outcome: { textFeedback: "The meeting fosters understanding, though some philosophical differences remain.", teamMoraleChange: 5, gmReputation: { progTrad: -3 } } }
        ],
        dynamicPlayerTargeted: true
    }
];

const TUTORIAL_STEPS = [
    { screen: 'gmOffice', elementSelector: '.gm-office-grid button[onclick*="navigateTo(\'scouting\')"]', text: "Welcome, GM Harris! This is your office. Let's start by scouting for some talent. Click 'Scout for Players'." },
    { screen: 'scouting', elementSelector: '.scouting-names-grid button', text: "Here's the 'Real or Ringer?' mini-game. Click on the name you think is FAKE. Correct guesses earn more Intel!" },
    { screen: 'scouting', elementSelector: 'button#next-round-button', text: "Good job! Click 'Next Round' to continue or finish the session." , condition: (gs) => currentScoutingSession.round > 0 && currentScoutingSession.round < currentScoutingSession.maxRounds && document.getElementById('next-round-button')?.style.display !== 'none'},
    { screen: 'scouting', elementSelector: 'button[onclick*="navigateTo(\'gmOffice\')"]', text: "Scouting session complete! You've earned some Intel. Click here to return to your office." , condition: (gs) => currentScoutingSession.round >= currentScoutingSession.maxRounds },
    { screen: 'gmOffice', elementSelector: '.gm-office-grid button[onclick*="navigateTo(\'recruitment\')"]', text: "Now you have some Intel, let's recruit a player. Click 'Recruit New Talent'." },
    { screen: 'recruitment', elementSelector: '.player-candidate-card button.recruit-button', text: "Review the candidates. Their philosophy impacts their play style and how they react to events. Click 'Recruit' if you have enough Intel." },
    { screen: 'gmOffice', elementSelector: '.gm-office-grid button[onclick*="navigateTo(\'roster\')"]', text: "Excellent! Your new player is on the roster. You can view your full team by clicking 'View Roster'." },
    { screen: 'roster', elementSelector: 'button[onclick*="navigateTo(\'gmOffice\')"]', text: "This screen shows all your players and their details. Click 'Back to GM Office' when you're ready." },
    { screen: 'gmOffice', elementSelector: '.gm-office-grid button[onclick*="openTeamTrainingFocusModal"]', text: "Each week, you can set a training focus. This can provide small boosts. Click 'Team Training Focus'." },
    { screen: 'gmOffice', elementSelector: '.gm-office-grid button.primary-action[onclick*="advanceWeek"]', text: "When your roster is full (at least "+MINIMUM_ROSTER_SIZE+" players) and you're ready, click 'Start Season' or 'Advance Week' to move forward!" , condition: (gs) => gs.currentWeek === 0},
    { screen: 'narrativeIntro', elementSelector: 'button', text: "Welcome to the Philadelphia Eagles, GM Harris! Read your appointment letter and then click 'Continue to Office' to begin your journey." },
];

let codexEntries = {
    "PHIL_Individualist": { title: "Philosophy: Individualist Free-Wheeler", text: "Individualists are driven by personal achievement and expression. They believe that individual brilliance is the key to winning games and often seek opportunities to showcase their unique talents. While they can deliver spectacular, game-changing plays, their focus on personal freedom can sometimes lead to unpredictability or friction within the team if not managed effectively. To get the best out of an Individualist, provide them with opportunities to shine and integrate their skills into the overall team strategy. Their loyalty is often tied to feeling valued and seeing individual success alongside team victories.\n\nAssociated Trait: Hero Ball - Small chance to individually overcome a negative team play outcome or make a spectacular solo play.", unlocked: false},
    "PHIL_Egalitarian": { title: "Philosophy: Egalitarian Workhorse", text: "Egalitarians prioritize the collective good and team cohesion above all else. They believe in shared effort, mutual respect, and that the strength of the team comes from unity. These players are typically selfless, reliable, and hardworking, acting as the 'glue' that holds the locker room together and boosts overall team morale. They respond positively to fairness, clear communication, and environments where everyone feels valued. Their loyalty is strong, particularly when the team operates with integrity and a focus on shared goals. They may struggle in environments that are overly hierarchical or heavily focused on individual stars.\n\nAssociated Trait: Unit Cohesion - Small stat boost to adjacent players or overall team effectiveness in collective plays. Improves team morale.", unlocked: false},
    "PHIL_Traditionalist": { title: "Philosophy: Traditionalist Bulwark", text: "Traditionalists value discipline, established methods, and the rich history of the game. They are often the cultural anchors of a team, providing stability and a strong sense of identity rooted in proven strategies and values. They respect hierarchy, experience, and established norms, and may be resistant to radical changes or unproven approaches. Loyalty from a Traditionalist is earned through consistency, respect for tradition, and demonstrating a commitment to the team's heritage. They may view rapid innovation with skepticism if it seems to abandon fundamental principles.\n\nAssociated Trait: Stay the Course - Less susceptible to opponent trick plays or sudden momentum shifts. Provides stability.", unlocked: false},
    "PHIL_Neutral": { title: "Philosophy: Utility Player", text: "Utility Players focus on the fundamentals and reliably fulfilling their assigned role. They are adaptable and consistent, providing dependable performance without necessarily having game-changing unique traits. Their value lies in their versatility and ability to contribute wherever needed, making them essential for roster depth and flexibility. They are generally low-maintenance and respond well to clear instructions and a stable team environment.\n\nAssociated Trait: Reliable Backup - Performs consistently at their skill level without major deviations.", unlocked: true}, // Unlocked by default
    "GREEN_RATING_INFO": { title: "Green Rating Explained", text: "Your Green Rating (0-100) is a measure of the Philadelphia Eagles' commitment to environmental responsibility under your leadership. This rating is influenced by your decisions in scenarios, investments in sustainable stadium practices, and public stance on environmental issues. A higher Green Rating can enhance the team's public image, attract environmentally conscious fans and sponsors, and contribute positively to your legacy as a GM. Neglecting the Green Rating can lead to negative press, decreased public support, and missed opportunities.\n\nImpact on Gameplay: A higher Green Rating can provide a small home-field advantage boost during game simulations.", unlocked: true }, // Unlocked by default
    "GM_REPUTATION_INFO": { title: "GM Reputation Explained", text: "Your reputation as General Manager is tracked along two key axes, reflecting how you are perceived by players, fans, media, and the league:\n\n1. Progressive (0) <-> Traditionalist (100): This axis reflects your approach to football strategy, player management, and social issues. A low score indicates a progressive, forward-thinking approach, embracing new ideas and social stances. A high score indicates a traditionalist approach, valuing established methods, discipline, and a focus purely on the sport.\n\n2. Eco-Advocate (0) <-> Fiscal Prioritiser (100): This axis measures your balance between environmental concerns and financial prudence. A low score signifies a strong commitment to environmental initiatives, even if costly. A high score indicates a focus on fiscal responsibility and the bottom line, potentially at the expense of green initiatives.\n\nYour decisions in scenarios and interactions will directly impact these reputation scores, influencing player morale, loyalty, team budget, and the types of opportunities and challenges you face.", unlocked: true }, // Unlocked by default
    "JAKE_SKILLS_INFO": { title: "GM Harris' Unique Skills", text: "Your unique background provides you with special skills that can influence game outcomes and scenario results:\n\n- Cricketer's Composure: Your experience in high-pressure professional cricket has honed your ability to remain calm and make clear decisions in tense situations. This skill can sometimes unlock better outcomes in critical game moments or difficult scenarios, reducing negative impacts from risky choices. It can also enhance the effectiveness of certain game-day strategies like 'Shutdown Opponent Star'.\n\n- Designer's Insight: Your past as a video game designer has given you a keen eye for patterns, systems, and underlying mechanics. This insight provides a bonus to the Intel you earn during scouting sessions, allowing you to more efficiently analyze potential talent and identify hidden gems. It can also enhance the effectiveness of certain game-day strategies like 'Exploit Matchups'.", unlocked: true }, // Unlocked by default
    "PLAYER_STATS_INFO": { title: "Core Player Stats", text: "Every player on your roster has core statistics that determine their performance and potential:\n\n- Offence (Off): Represents a player's skill and effectiveness in offensive plays, such as passing accuracy (QB), rushing ability (RB), route running and catching (WR/TE), or blocking prowess (OL). A higher Offence rating increases the likelihood of successful offensive plays and scoring drives.\n\n- Defence (Def): Represents a player's skill and effectiveness in defensive plays, including tackling ability (LB/S), pass coverage (CB/S), pass rush (DE/DT), and run stopping. A higher Defence rating increases the likelihood of stopping opponent drives and forcing turnovers.\n\n- Special Teams (ST): Represents a player's skill in kicking, punting, or contributing to kick/punt coverage and return units. While not every player has a high ST rating, specialists (K, P) rely heavily on this. ST rating can influence field goal success, punt distance, and kick/punt return outcomes.\n\n- Age: Influences a player's potential for development or decline. Younger players (early 20s) are more likely to improve their skills through training and experience, while older players (30+) may see their skills gradually regress over the season.", unlocked: true },
    "MORALE_LOYALTY_INFO": { title: "Morale and Loyalty", text: "Morale and Loyalty are critical for team performance and stability:\n\n- Morale: Think of Morale as a player's week-to-week happiness and motivation. It's volatile and reacts quickly to recent events like wins, losses, and scenario outcomes. High morale (above 75) can lead to improved performance and positive events. Low morale (below 40) increases the risk of mistakes, negative events and decreased effectiveness. Morale is affected by team wins/losses, GM decisions, and training focus (Philosophical Alignment Workshop).\n\n- Loyalty: Loyalty is a deeper, more stable measure of a player's commitment to the team and you as the GM. It builds slowly over time and is strongly influenced by your long-term decisions, especially those that align with a player's philosophy or demonstrate the team's values. High loyalty makes players more resilient to morale dips and less likely to be disruptive. Low loyalty is a significant risk factor for locker room issues or seeking opportunities elsewhere.", unlocked: true },
    "PLAYER_TRAITS_INFO": { title: "Player Traits", text: "Each player philosophy is associated with a unique trait that can activate during game simulations or scenarios, providing special effects:\n\n- Individualist: Hero Ball - Small chance to individually overcome a negative team play outcome or make a spectacular solo play.\n- Egalitarian: Unit Cohesion - Small stat boost to adjacent players or overall team effectiveness in collective plays. Improves team morale.\n- Traditionalist: Stay the Course - Less susceptible to opponent trick plays or sudden momentum shifts. Provides stability.\n\nThese traits add an element of unpredictability and unique flavour to individual player contributions.", unlocked: false },
    "PHILOSOPHICAL_HARMONY_INFO": { title: "Philosophical Harmony", text: "The mix of philosophies on your roster significantly impacts team cohesion and overall performance. Philosophical Harmony measures how well your players' different ideologies coexist.\n\n- Balanced Rosters: A diverse mix of Individualists, Egalitarians, and Traditionalists can be powerful, but requires careful management to prevent clashes.\n- Imbalance: Too many players of one philosophy can lead to blind spots or internal friction.\n- Clashes: Individualists and Traditionalists can sometimes clash due to their opposing views on structure and freedom.\n- Egalitarian Influence: Egalitarians generally improve overall team harmony and morale.\n\nA higher Philosophical Harmony score contributes positively to your team's overall strength during game simulations.", unlocked: false },
    "GOOD_TEAM_PLAYER_INFO": { title: "What Makes a Good Team/Player?", text: "Building a successful team involves more than just recruiting players with high core stats (Offence, Defence, Special Teams). A truly effective player is a combination of:\n\n- Core Stats: The fundamental measure of their skill in their position.\n\n- Philosophy & Trait: How they approach the game and the unique abilities they bring.\n\n- Morale & Loyalty: Their mental state and commitment, which impacts consistency and resilience.\n\nBuilding a good team requires balancing these factors, ensuring philosophical harmony, managing player morale and loyalty through training and decisions, and recruiting players whose strengths and traits complement your overall strategy and the existing roster.", unlocked: false },
    "TRAINING_FOCUS_INFO": { title: "Weekly Training Focus", text: "Each week, you can set a team-wide training focus in the GM Office. This provides temporary or permanent benefits:\n\n- Offensive Drills: Provides a temporary boost to your team's Offensive strength for the next game.\n- Defensive Schemes: Provides a temporary boost to your team's Defensive strength for the next game.\n- Philosophical Alignment Workshop: Provides a small, permanent boost to the morale of all players on the roster.\n- Rest and Recovery: Currently has no direct game effect, but represents managing player fatigue (feature for future development).", unlocked: false },
    "GAME_SIM_BASICS_INFO": { title: "Game Simulation Basics", text: "Game simulations determine the outcome of each week's matchup based on a variety of factors:\n\n- Team Strengths: Calculated from the average core stats (Offence, Defence, Special Teams) of players on your active roster vs. the opponent's roster.\n- Philosophical Harmony: Your team's cohesion score modifies your overall strength.\n- Player Morale & Loyalty: High levels can provide small boosts, while low levels can lead to mistakes.\n\nThe simulation progresses drive-by-drive, with the likelihood of scoring or turnovers influenced by the effective strengths of both teams, modified by the factors above. Key moments may trigger decision points where your choices as GM can directly impact the drive's outcome.", unlocked: false }
};

let sfx_button_click, sfx_intel_gain, sfx_intel_loss, sfx_win_game, sfx_lose_game;
const audioFiles = {
    sfx_button_click: 'audio/sfx_button_click.wav',
    sfx_intel_gain: 'audio/sfx_intel_gain.wav',
    sfx_intel_loss: 'audio/sfx_intel_loss.wav',
    sfx_win_game: 'audio/sfx_win_game.mp3',
    sfx_lose_game: 'audio/sfx_lose_game.mp3',
};

// CRITICAL FIX: Declare DOM element variables here, but assign them in window.onload
let screenArea, gmInfoDiv, jakeHeadshotImg, eaglesLogoHeaderImg, saveButtonElem, mainMenuButtonElem;
// Note: Renamed saveButton to saveButtonElem and mainMenuButton to mainMenuButtonElem to avoid conflict with function names if they existed.
// It's good practice to ensure variable names for DOM elements are distinct.
// In your original code, saveButton and mainMenuButton were consts for elements, which is fine.
// Here, to keep them as 'let' for assignment in onload, giving them slightly different names or ensuring no function name collision is safer.
// Or, they can remain const if only assigned once in onload. For this fix, I'll use 'let' and ensure names are clear.


window.onload = function() {
    // CRITICAL FIX: Assign DOM element variables after the DOM is loaded
    screenArea = document.getElementById('screen-area');
    gmInfoDiv = document.getElementById('gm-info');
    jakeHeadshotImg = document.getElementById('jake-headshot');
    eaglesLogoHeaderImg = document.getElementById('eagles-logo-header');
    saveButtonElem = document.getElementById('save-button'); // Changed from saveButton
    mainMenuButtonElem = document.getElementById('main-menu-button'); // Changed from mainMenuButton

    // Defensive check: Ensure critical elements are found
    if (!screenArea) {
        console.error("CRITICAL ERROR: HTML element with id 'screen-area' not found. Game cannot start.");
        document.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px; text-align: center; color: red;'>" +
                                  "<h1>Game Initialization Error</h1>" +
                                  "<p>A critical HTML element ('screen-area') is missing from the page.</p>" +
                                  "<p>Please ensure your HTML file is correct and includes an element with this ID.</p>" +
                                  "</div>";
        return; // Stop further script execution
    }
    // You can add similar checks for other essential elements like gmInfoDiv if needed.

    try {
        sfx_button_click = new Audio(audioFiles.sfx_button_click);
        sfx_intel_gain = new Audio(audioFiles.sfx_intel_gain);
        sfx_intel_loss = new Audio(audioFiles.sfx_intel_loss);
        sfx_win_game = new Audio(audioFiles.sfx_win_game);
        sfx_lose_game = new Audio(audioFiles.sfx_lose_game);
    } catch (e) {
        console.warn("Could not load audio files.", e);
    }

    // Setup event listeners for buttons that should always be present in the main UI shell
    if (saveButtonElem) {
        saveButtonElem.addEventListener('click', () => {
            playAudio('sfx_button_click');
            saveGame();
            showNotification("Game Saved!");
        });
    } else {
        console.warn("Element with ID 'save-button' not found.");
    }

    if (mainMenuButtonElem) {
        mainMenuButtonElem.addEventListener('click', () => {
            playAudio('sfx_button_click');
            if (confirm("Are you sure you want to return to the Main Menu? Unsaved progress may be lost if not saved.")) {
                gameState.currentScreen = 'mainMenu';
                renderCurrentScreen();
            }
        });
    } else {
        console.warn("Element with ID 'main-menu-button' not found.");
    }
    
    const tutorialGotItButton = document.getElementById('tutorial-got-it-button');
    if (tutorialGotItButton) {
        tutorialGotItButton.addEventListener('click', () => {
            playAudio('sfx_button_click');
            gameState.tutorialStep++;
            const tutorialPopup = document.getElementById('tutorial-popup');
            if (tutorialPopup) tutorialPopup.style.display = 'none';
            document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
            renderTutorialStep(); // Check for next step immediately
        });
    } else {
        // This button might not always be present, so a warning might be too noisy if it's dynamically added/removed.
        // console.warn("Element with ID 'tutorial-got-it-button' not found at initial load.");
    }
    
    initGame();
};

async function initGame(startNew = false, isQuickStart = false) { // Added isQuickStart parameter
    // Load player data first, as it's needed regardless of new or loaded game
    try {
        const response = await fetch('nfl_players.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allNFLPlayers = await response.json();
        console.log("NFL player data loaded successfully:", allNFLPlayers.length, "players");
    } catch (error) {
        console.error("Failed to load NFL player data:", error);
        // Handle error - maybe show a message to the user or use fallback data
        showNotification("Failed to load player data. Game may not function correctly.", true, 5000);
        // Optionally, define a small fallback allNFLPlayers array here if critical
    }

    // Load scouting name lists
    try {
        const fakeNamesResponse = await fetch('nfl_players_fake_names.json');
        if (!fakeNamesResponse.ok) throw new Error(`HTTP error! status: ${fakeNamesResponse.status} for nfl_players_fake_names.json`);
        const rawFakeNames = await fakeNamesResponse.json();
        loadedFakeNames = rawFakeNames.map(name => name.startsWith("1") ? name.substring(1) : name);
        console.log("Fake names loaded and processed:", loadedFakeNames.length);

        const realNormalResponse = await fetch('nfl_players_real_names_normal.json');
        if (!realNormalResponse.ok) throw new Error(`HTTP error! status: ${realNormalResponse.status} for nfl_players_real_names_normal.json`);
        loadedRealNamesNormal = await realNormalResponse.json();
        console.log("Real normal names loaded:", loadedRealNamesNormal.length);

        const realStrangeResponse = await fetch('nfl_players_real_names_strange.json');
        if (!realStrangeResponse.ok) throw new Error(`HTTP error! status: ${realStrangeResponse.status} for nfl_players_real_names_strange.json`);
        loadedRealNamesStrange = await realStrangeResponse.json();
        console.log("Real strange names loaded:", loadedRealNamesStrange.length);

    } catch (error) {
        console.error("Failed to load one or more scouting name lists:", error);
        showNotification("Failed to load some name lists for scouting. Scouting may not function correctly.", true, 5000);
        // Fallback to empty arrays if loading fails, so game doesn't crash, though scouting will be broken.
        loadedFakeNames = loadedFakeNames.length > 0 ? loadedFakeNames : [];
        loadedRealNamesNormal = loadedRealNamesNormal.length > 0 ? loadedRealNamesNormal : [];
        loadedRealNamesStrange = loadedRealNamesStrange.length > 0 ? loadedRealNamesStrange : [];
    }

    const savedData = localStorage.getItem('epgSaveData');
    if (savedData && !startNew && !isQuickStart) { // Don't load if quick starting
        loadGame();
        // After loading, ensure budget is calculated based on loaded intel
        updateBudgetBasedOnIntel();
    } else { // New game or Quick Start
        if (isQuickStart || startNew) { // Clear save for any kind of new start if it exists
            localStorage.removeItem('epgSaveData');
        }
        gameState = {
            ...gameState, // Spread to keep jakeHarrisSkills and other non-resetting defaults
            currentScreen: isQuickStart ? 'gameDayPrep' : 'narrativeIntro', // Quick start goes to gameDayPrep
            currentWeek: isQuickStart ? 1 : 0, // Quick start begins at week 1
            scoutingIntel: isQuickStart ? 1000 : 500, // Slightly more intel for quick start for flexibility
            greenRating: 40,
            gmReputation: { progTrad: 50, ecoFiscal: 50 },
            seasonWins: 0,
            seasonLosses: 0,
            eaglesRoster: [], // Will be populated by setupDefaultEaglesRoster if isQuickStart
            allNFLTeams: {}, // Initialize empty object for all teams
            teamBudget: 0, // Will be set by updateBudgetBasedOnIntel
            completedScenarios: [],
            gameSchedule: [],
            isGameOver: false,
            tutorialStep: isQuickStart ? TUTORIAL_STEPS.length : 0, // Skip tutorial for quick start
            currentOpponentIndex: 0, // Stays 0, gameDayPrep will use this
            weeklyTrainingFocus: null,
            gameLog: [],
            recruitmentFilterState: { // Initialize for new game
                searchTerm: "",
                positionFilter: "",
                offenceFilter: "",
                defenceFilter: "",
                costFilter: ""
            }
        };

        if (isQuickStart) {
            setupDefaultEaglesRoster(); // Setup default roster BEFORE setupNewSeason
        }

        // Set initial budget based on initial intel
        updateBudgetBasedOnIntel();
        // Unlock initial codex entries
        ["GREEN_RATING_INFO", "GM_REPUTATION_INFO", "JAKE_SKILLS_INFO", "PHIL_Neutral"].forEach(key => {
            if(codexEntries[key]) codexEntries[key].unlocked = true;
        });
        setupNewSeason(); // This will now correctly handle draft pool based on pre-filled Eagles roster for quick start
    }
    renderCurrentScreen();
}

function setupDefaultEaglesRoster() {
    gameState.eaglesRoster = []; // Ensure it's empty
    const availablePlayers = [...allNFLPlayers]; // Create a mutable copy

    // Try to get a balanced roster, simple approach:
    const desiredPositions = {
        "QB": 1, "RB": 1, "WR": 2, "TE": 1, "LT": 1, "LG": 1, "C": 1, "RG": 1, "RT": 1,
        "DE": 1, "DT": 1, "LB": 2, "CB": 2, "S": 1, "K": 1, "P": 1
    };
    let playersAddedCount = 0;

    // First pass: try to fill desired positions
    for (const pos in desiredPositions) {
        for (let i = 0; i < desiredPositions[pos]; i++) {
            if (playersAddedCount >= MINIMUM_ROSTER_SIZE) break;
            const playerIndex = availablePlayers.findIndex(p => p.position === pos && !gameState.eaglesRoster.some(erP => erP.name === p.name));
            if (playerIndex !== -1) {
                const playerData = availablePlayers.splice(playerIndex, 1)[0];
                const newPlayer = createPlayerFromTemplate(playerData, playerData.philosophy_bias || "Neutral", playerData.position, 75, 70, false);
                if (newPlayer) {
                    gameState.eaglesRoster.push(newPlayer);
                    playersAddedCount++;
                }
            }
        }
        if (playersAddedCount >= MINIMUM_ROSTER_SIZE) break;
    }

    // Second pass: fill remaining spots if needed, from any position
    while (playersAddedCount < MINIMUM_ROSTER_SIZE && availablePlayers.length > 0) {
        const playerData = availablePlayers.shift(); // Take from the top (could be random)
        if (!gameState.eaglesRoster.some(erP => erP.name === playerData.name)) { // Ensure not already added
            const newPlayer = createPlayerFromTemplate(playerData, playerData.philosophy_bias || "Neutral", playerData.position, 70, 65, false);
            if (newPlayer) {
                gameState.eaglesRoster.push(newPlayer);
                playersAddedCount++;
            }
        }
    }
    
    // Fallback: if still not enough players (e.g., allNFLPlayers is too small), create generic ones
    while (gameState.eaglesRoster.length < MINIMUM_ROSTER_SIZE) {
        const randomPos = NFL_POSITIONS[Math.floor(Math.random() * NFL_POSITIONS.length)];
        const genericPlayer = createPlayerFromTemplate(null, "Neutral", randomPos, 60, 60, true);
        if (genericPlayer) {
            gameState.eaglesRoster.push(genericPlayer);
        } else {
            // This should ideally not happen if createPlayerFromTemplate is robust
            console.error("Failed to create a generic player for quick start roster.");
            break; 
        }
    }

    console.log(`Quick Start: Default Eagles roster created with ${gameState.eaglesRoster.length} players.`);
    // Unlock philosophies of players added to the default roster
    gameState.eaglesRoster.forEach(player => {
        if (codexEntries[`PHIL_${player.philosophy}`] && !codexEntries[`PHIL_${player.philosophy}`].unlocked) {
            codexEntries[`PHIL_${player.philosophy}`].unlocked = true;
            // showNotification(`Codex Unlocked: ${codexEntries[`PHIL_${player.philosophy}`].title}`); // Notification might be too early here
        }
    });
}

function setupNewSeason() {
    gameState.gameSchedule = generateGameSchedule();

    gameState.allNFLTeams = {};
    // Populate allNFLTeams with players from allNFLPlayers, excluding Eagles for the draft pool
    allNFLPlayers.forEach(player => {
        if (!gameState.allNFLTeams[player.team]) {
            gameState.allNFLTeams[player.team] = [];
        }
        // Create a player object for the AI team using createPlayerFromTemplate
        // This ensures the player object has the necessary structure (skills, philosophy, etc.)
        const aiPlayer = createPlayerFromTemplate(
            player, // Pass the full player data
            player.philosophy_bias || "Neutral", // Use player's philosophy bias or Neutral
            player.position, // Use player's position
            70, // Initial morale (can be adjusted for AI)
            65, // Initial loyalty (can be adjusted for AI)
            false // Not a basic player
        );
        if (aiPlayer) {
             gameState.allNFLTeams[player.team].push(aiPlayer);
        } else {
             console.warn(`Failed to create player object for team ${player.team} for player ${player.name}`);
        }
    });
    console.log("All NFL teams populated with players from nfl_players.json");

    // Create the initial draft pool from all NFL players EXCLUDING those already on the Eagles roster (if loading a game)
    // For a new game, Eagles roster is empty, so all players go to draft pool initially.
    // When loading a game, players already on the Eagles roster should NOT be in the draft pool.
    const eaglesPlayerNames = new Set(gameState.eaglesRoster.map(p => p.name));
    gameState.draftPool = allNFLPlayers.filter(player => !eaglesPlayerNames.has(player.name));
    console.log("Draft pool created:", gameState.draftPool.length, "players available");

    // The Eagles roster is initialized as empty in initGame for a new game,
    // or loaded from save data. No change needed here.

    gameState.currentWeek = 0;
    gameState.seasonWins = 0;
    gameState.seasonLosses = 0;
    gameState.completedScenarios = [];
    gameState.currentOpponentIndex = 0;
    // Note: Tutorial step 0 is handled in initGame
}

function generateGameSchedule() {
    const opponents = [
        { opponentName: "Dallas Cowboys", strength: 78, philosophyHint: "Aggressive Offence, Star WR" },
        { opponentName: "New York Giants", strength: 72, philosophyHint: "Strong Defensive Line" },
        { opponentName: "Washington Commanders", strength: 68, philosophyHint: "Young, Unpredictable QB" },
        { opponentName: "San Francisco 49ers", strength: 85, philosophyHint: "Balanced, Elite Roster" },
        { opponentName: "Arizona Cardinals", strength: 65, philosophyHint: "Mobile QB, Air Raid" },
        { opponentName: "Los Angeles Rams", strength: 77, philosophyHint: "Veteran Leadership, Solid Defence" },
        { opponentName: "Green Bay Packers", strength: 75, philosophyHint: "Efficient Passing Game" },
        { opponentName: "Chicago Bears", strength: 69, philosophyHint: "Gritty Defence, Developing Offence" },
        { opponentName: "Detroit Lions", strength: 80, philosophyHint: "High-Powered Offence, Tenacious" },
        { opponentName: "Minnesota Vikings", strength: 73, philosophyHint: "Explosive Receivers" },
        { opponentName: "Tampa Bay Buccaneers", strength: 70, philosophyHint: "Stout Run Defence" },
        { opponentName: "Atlanta Falcons", strength: 67, philosophyHint: "Run-Heavy Scheme" },
        { opponentName: "Carolina Panthers", strength: 62, philosophyHint: "Rebuilding Phase" },
        { opponentName: "New Orleans Saints", strength: 71, philosophyHint: "Disciplined, Veteran Defence" },
        { opponentName: "Seattle Seahawks", strength: 74, philosophyHint: "Loud Crowd, Physical Play" },
        { opponentName: "Kansas City Chiefs", strength: 88, philosophyHint: "Elite QB, Innovative Plays" }
    ];
    return opponents.sort(() => Math.random() - 0.5); // Shuffle schedule each new season
}

function saveGame() {
    try {
        const dataToSave = { gameState: gameState, codexEntries: codexEntries };
        localStorage.setItem('epgSaveData', JSON.stringify(dataToSave));
        console.log("Game saved:", dataToSave);
    } catch (error) {
        console.error("Error saving game:", error);
        showNotification("Could not save game. Local storage might be full or unavailable.", true);
    }
}

function loadGame() {
    const savedDataString = localStorage.getItem('epgSaveData');
    if (savedDataString) {
        try {
            const loadedData = JSON.parse(savedDataString);

            if (loadedData && loadedData.gameState && loadedData.codexEntries) {
                gameState = loadedData.gameState;
                codexEntries = loadedData.codexEntries;
                console.log("Game loaded successfully:", loadedData);

                // --- Start: Code to enrich loaded opponent rosters ---
                if (gameState.allNFLTeams) {
                    for (const teamName in gameState.allNFLTeams) {
                        if (gameState.allNFLTeams.hasOwnProperty(teamName)) {
                            const loadedRoster = gameState.allNFLTeams[teamName];
                            const enrichedRoster = [];
                            loadedRoster.forEach(savedPlayer => {
                                // Find the full player data from allNFLPlayers using the player's name
                                const fullPlayerData = allNFLPlayers.find(p => p.name === savedPlayer.name);
                                if (fullPlayerData) {
                                    // Create an enriched player object, merging saved state with full data
                                    // Prioritize saved state for dynamic properties like morale/loyalty
                                    const enrichedPlayer = {
                                        ...fullPlayerData, // Start with all properties from nfl_players.json
                                        ...savedPlayer, // Overlay saved properties (like morale, loyalty, weeksWithTeam, statsThisSeason)
                                        skills: { // Ensure skills object is correctly merged/prioritized
                                            ...fullPlayerData.skills, // Start with skills from nfl_players.json
                                            ...savedPlayer.skills // Overlay saved skill changes if any
                                        },
                                        // Ensure philosophy and trait are correctly derived from philosophy_bias
                                        philosophy: fullPlayerData.philosophy_bias || "Neutral",
                                        uniqueTraitName: PLAYER_PHILOSOPHY_TEMPLATES[fullPlayerData.philosophy_bias]?.traitName || PLAYER_PHILOSOPHY_TEMPLATES["Neutral"].traitName
                                    };
                                    enrichedRoster.push(enrichedPlayer);
                                } else {
                                    console.warn(`Player "${savedPlayer.name}" not found in allNFLPlayers data after loading. Skipping.`);
                                    // Optionally, keep the savedPlayer if full data isn't critical for this player
                                    // enrichedRoster.push(savedPlayer);
                                }
                            });
                            gameState.allNFLTeams[teamName] = enrichedRoster; // Replace with the enriched roster
                        }
                    }
                    console.log("Loaded opponent rosters enriched with full player data.");
                }
                // --- End: Code to enrich loaded opponent rosters ---


                if (!gameState.currentScreen || ['gameDaySim', 'scenario', 'recruitment'].includes(gameState.currentScreen)) {
                    gameState.currentScreen = 'gmOffice';
                }
                // Ensure essential gameState properties exist (add more checks as needed)
                if (typeof gameState.scoutingIntel === 'undefined') gameState.scoutingIntel = 150;
                if (typeof gameState.greenRating === 'undefined') gameState.greenRating = 40;
                if (!gameState.gmReputation) gameState.gmReputation = { progTrad: 50, ecoFiscal: 50 };
                if (!gameState.eaglesRoster) gameState.eaglesRoster = [];
                if (!gameState.completedScenarios) gameState.completedScenarios = [];
                if (!gameState.gameSchedule) gameState.gameSchedule = []; // Should be repopulated if starting new season logic is separate
                if (!gameState.jakeHarrisSkills) gameState.jakeHarrisSkills = { cricketersComposure: true, designersInsight: true };
                if (!gameState.seasonGoal) gameState.seasonGoal = { wins: 9, greenRatingMin: 55 };
                if (typeof gameState.tutorialStep === 'undefined') gameState.tutorialStep = 0; // Ensure tutorial step is present
                if (typeof gameState.recruitmentFilterState === 'undefined') { // Ensure filter state exists for loaded games
                    gameState.recruitmentFilterState = {
                        searchTerm: "",
                        positionFilter: "",
                        offenceFilter: "",
                        defenceFilter: "",
                        costFilter: ""
                    };
                }

            } else {
                console.error("Loaded game data is missing critical parts. Starting new game.");
                showNotification("Saved game data was incomplete or corrupted. Starting a new game.", true, 4000);
                localStorage.removeItem('epgSaveData'); 
                initGame(true); 
                return; 
            }
        } catch (error) {
            console.error("Error loading game data:", error);
            showNotification("Failed to load saved game. The data might be corrupted. Starting a new game.", true, 4000);
            localStorage.removeItem('epgSaveData');
            initGame(true); 
            return; 
        }
    } else {
        // This case means no save data was found. initGame(true) will be called by the caller if needed.
        // Or, if initGame is always the entry point, its logic will handle this.
        console.log("No save data found by loadGame. initGame will set up a new game if 'startNew' is false and no data exists.");
        // initGame(true); // This might be redundant if initGame() already handles the no-save-data case.
        // For safety, ensure initGame's logic covers this: if !savedData, it goes to the 'else' block which is new game.
    }
    // renderCurrentScreen() is called by initGame, so not strictly needed here.
}


function playAudio(soundId, loop = false) {
    let sound;
    switch (soundId) {
        case 'sfx_button_click': sound = sfx_button_click; break;
        case 'sfx_intel_gain': sound = sfx_intel_gain; break;
        case 'sfx_intel_loss': sound = sfx_intel_loss; break;
        case 'sfx_win_game': sound = sfx_win_game; break;
        case 'sfx_lose_game': sound = sfx_lose_game; break;
        default: console.warn(`Sound ID "${soundId}" not recognized.`); return;
    }
    if (sound && typeof sound.play === 'function') { // Check if sound object is valid and has play method
        sound.loop = loop;
        sound.currentTime = 0; // Rewind to start
        sound.play().catch(error => {
            // Autoplay restrictions might cause this error.
            // Consider informing the user they might need to interact with the page first for audio.
            console.warn(`Error playing sound ${soundId}:`, error);
        });
    } else if (sound) { // Sound object exists but might not be ready
        sound.addEventListener('canplaythrough', () => {
            sound.loop = loop;
            sound.currentTime = 0;
            sound.play().catch(error => console.warn(`Error playing sound ${soundId} after load:`, error));
        }, { once: true });
    } else {
        // This case might happen if audio files failed to load initially.
        // console.warn(`Audio object for ${soundId} is not available.`);
    }
}


function updateHeaderInfo() {
    // Ensure elements exist before trying to update them
    const infoWeekEl = document.getElementById('info-week');
    const infoIntelEl = document.getElementById('info-intel');
    const infoGreenEl = document.getElementById('info-green');
    const progTradFillEl = document.getElementById('progTradFill');
    const ecoFiscalFillEl = document.getElementById('ecoFiscalFill');

    if (infoWeekEl) infoWeekEl.textContent = gameState.currentWeek > 0 ? gameState.currentWeek : "Off-Season";
    if (infoIntelEl) infoIntelEl.textContent = gameState.scoutingIntel;
    if (infoGreenEl) infoGreenEl.textContent = `${gameState.greenRating}%`;

    if (progTradFillEl) { 
        progTradFillEl.style.width = `${gameState.gmReputation.progTrad}%`;
    }
    if (ecoFiscalFillEl) {
        ecoFiscalFillEl.style.width = `${gameState.gmReputation.ecoFiscal}%`;
    }
}

function renderCurrentScreen() {
    if (!screenArea) { // Double check screenArea, though it should be caught in window.onload
        console.error("renderCurrentScreen called but screenArea is not available.");
        return;
    }

    if (gameState.isGameOver && gameState.currentScreen !== 'endSeason') {
        gameState.currentScreen = 'endSeason';
    }
    screenArea.innerHTML = ''; // Clear previous screen content

    const showFullHeader = !['mainMenu', 'narrativeIntro'].includes(gameState.currentScreen);
    
    // Ensure these elements are available (they are initialized in window.onload)
    if (gmInfoDiv) gmInfoDiv.style.display = showFullHeader ? 'flex' : 'none';
    if (jakeHeadshotImg) {
        jakeHeadshotImg.src = "images/jake_headshot.png"; // Ensure path is correct relative to HTML
        jakeHeadshotImg.onerror = () => { jakeHeadshotImg.src = 'https://placehold.co/60x60/004C54/FFFFFF?text=JH'; };
    }
    if (eaglesLogoHeaderImg) {
        eaglesLogoHeaderImg.src = "images/eagles_logo_small.png"; // Ensure path is correct
        eaglesLogoHeaderImg.onerror = () => { eaglesLogoHeaderImg.src = 'https://placehold.co/45x45/A5ACAF/000000?text=E';};
        eaglesLogoHeaderImg.style.display = showFullHeader ? 'inline-block' : 'none';
    }
    if (saveButtonElem) saveButtonElem.style.display = showFullHeader ? 'inline-block' : 'none';
    if (mainMenuButtonElem) mainMenuButtonElem.style.display = showFullHeader ? 'inline-block' : 'none';

    if (showFullHeader) updateHeaderInfo();

    switch (gameState.currentScreen) {
        case 'mainMenu': renderMainMenuScreen(); break;
        case 'narrativeIntro': renderNarrativeIntroScreen(); break;
        case 'gmOffice': renderGMOfficeScreen(); break;
        case 'scouting': renderScoutingScreen(); break;
        case 'recruitment': renderRecruitmentScreen(); break;
        case 'roster': renderRosterScreen(); break;
        case 'gameDayPrep': renderGameDayPrepScreen(); break;
        case 'gameDaySim':
            screenArea.innerHTML = `
                <h2>Game in Progress</h2>
                <div id="game-sim-visualizer-container" style="text-align: center; margin-bottom: 10px;">
                    <canvas id="game-canvas" width="600" height="300" style="border:1px solid #ccc; background-color: #3A5F0B;"></canvas>
                </div>
                <div id="game-sim-log-container">
                    <p>Simulating game against ${gameState.gameSchedule[gameState.currentOpponentIndex]?.opponentName || 'Opponent'}...</p>
                    <div id="game-sim-log" class="game-sim-log"></div>
                </div>
                <button id="finish-game-early" style="display:none;" class="primary-action">Proceed to Result</button>`;
            // Initialize visualizer after rendering the canvas
            if (window.gameVisualizer) {
                const canvas = document.getElementById('game-canvas');
                if (canvas) {
                    window.gameVisualizer.init(canvas);
                } else {
                    console.error("Canvas element not found for game visualizer.");
                }
            }
            // The actual simulation start is usually triggered after this render
            break;
        case 'scenario':
            if (window.currentScenarioObject) renderScenarioScreen(window.currentScenarioObject);
            else screenArea.innerHTML = `<p>Error: No scenario loaded.</p><button onclick="window.navigateTo('gmOffice')">Back to Office</button>`;
            break;
        case 'codex': renderCodexScreen(); break;
        case 'endSeason': renderEndSeasonScreen(); break;
        default: 
            screenArea.innerHTML = `<p>Error: Unknown screen '${gameState.currentScreen}'.</p><button onclick="window.navigateTo('gmOffice')">Back to Office</button>`;
    }
    renderTutorialStep();
}

function renderMainMenuScreen() {
    screenArea.innerHTML = `
        <div class="main-menu-container">
            <h1>Kudos & Consequences</h1>
            <p class="creator-credit-mainmenu">Happy Birthday Jake</p>
            <div class="main-menu-options">
                <button id="new-game-button">New Game</button>
                <button id="continue-game-button" style="display: none;">Continue Game</button>
                <button id="quick-sim-button">Quick Simulation</button>
            </div>
        </div>`;
    document.getElementById('new-game-button').addEventListener('click', () => {
        playAudio('sfx_button_click');
        if (localStorage.getItem('epgSaveData') && !confirm("Starting a new game will overwrite any existing saved progress. Are you sure?")) {
            return;
        }
        localStorage.removeItem('epgSaveData'); // Explicitly clear for new game
        initGame(true); // Pass true to ensure it's a fresh start
    });
    const continueButton = document.getElementById('continue-game-button');
    if (localStorage.getItem('epgSaveData')) {
        continueButton.style.display = 'block';
        continueButton.addEventListener('click', () => { playAudio('sfx_button_click'); initGame(false, false); }); // false for startNew, false for isQuickStart
    }

    document.getElementById('quick-sim-button').addEventListener('click', () => {
        playAudio('sfx_button_click');
        if (localStorage.getItem('epgSaveData') && !confirm("Starting a Quick Simulation will not use existing saved progress and will start a fresh simulation environment. Are you sure?")) {
            return;
        }
        // For quick sim, we don't care about overwriting save data in the same way as "New Game"
        // as it's a temporary testing state. We will ensure it doesn't *save* over existing data unless explicitly done.
        initGame(true, true); // true for startNew (to reset state), true for isQuickStart
    });
}

function renderNarrativeIntroScreen() {
    screenArea.innerHTML = `
        <div class="narrative-intro-content">
            <h2>FOR IMMEDIATE RELEASE: Philadelphia Eagles Announce Visionary New General Manager</h2>
            <p>Philadelphia, PA – The Philadelphia Eagles today announced the appointment of Jake Harris as their new General Manager. Harris, noted for his sharp strategic acumen as a former professional cricketer and his innovative systems-thinking honed as a video game designer, steps in to lead the Eagles into a new era...</p>
            <p>Owner Jeffrey Lurie stated, 'Jake's unique background offers a fresh perspective crucial for navigating the modern NFL – balancing on-field excellence with the league's evolving focus on player ideologies and environmental stewardship. We have tasked GM Harris with building a winning team that also champions progress and responsibility. The goal this season: achieve a winning record (at least ${gameState.seasonGoal.wins} wins), significantly improve our team's Green Rating to ${gameState.seasonGoal.greenRatingMin}% or higher, and show the league the Eagles are leaders, on and off the field.'</p>
            <p>Welcome to the Eagles, GM Harris. Your office awaits.</p>
            <button id="continue-to-office" class="primary-action">Continue to Office</button>
        </div>`;
    document.getElementById('continue-to-office').addEventListener('click', () => { playAudio('sfx_button_click'); window.navigateTo('gmOffice'); });
}

function renderGMOfficeScreen() {
    const canScout = gameState.currentWeek === 0;
    const canRecruit = true; // Always allow access to recruitment, cost check is done there
    const canStartSeason = gameState.eaglesRoster.length >= MINIMUM_ROSTER_SIZE;
    let rosterMessage = "";
    if (gameState.currentWeek === 0 && !canStartSeason) {
        rosterMessage = `<p class="text-center" style="color: #C53030; font-weight: 500;">Your roster has ${gameState.eaglesRoster.length}/${MINIMUM_ROSTER_SIZE} players. You must have at least ${MINIMUM_ROSTER_SIZE} players to start the season. Visit 'Recruit New Talent'.</p>`;
    }

    screenArea.innerHTML = `
        <h2>GM Office - Week: ${gameState.currentWeek > 0 ? gameState.currentWeek : "Off-Season"}</h2>
        <div class="gm-office-stats">
            <h3>Team Status</h3>
            <p>Wins: <span id="office-wins">${gameState.seasonWins}</span> - Losses: <span id="office-losses">${gameState.seasonLosses}</span></p>
            <p>Scouting Intel: <span id="office-intel">${gameState.scoutingIntel}</span></p>
            <p>Green Rating: <span id="office-green">${gameState.greenRating}%</span></p>
            <p>Weekly Training Focus: <span>${gameState.weeklyTrainingFocus || 'Not Set'}</span></p>
            <p>Roster Size: <span>${gameState.eaglesRoster.length} Players</span></p>
            <div class="reputation-bar-container">
                <p class="reputation-bar-label-text">GM Philosophy: Progressive / Traditionalist</p>
                <div class="reputation-labels"><span>Progressive (0)</span><span>Traditionalist (100)</span></div>
                <div class="reputation-bar"><div id="progTradFill" class="reputation-bar-fill" style="width:${gameState.gmReputation.progTrad}%"></div></div>
            </div>
            <div class="reputation-bar-container">
                <p class="reputation-bar-label-text">GM Approach: Eco-Advocate / Fiscal Prioritiser</p>
                <div class="reputation-labels"><span>Eco-Advocate (0)</span><span>Fiscal Prioritiser (100)</span></div>
                <div class="reputation-bar"><div id="ecoFiscalFill" class="reputation-bar-fill eco" style="width:${gameState.gmReputation.ecoFiscal}%"></div></div>
            </div>
        </div>
        ${rosterMessage}
        <div class="gm-office-grid">
            <button onclick="window.navigateTo('scouting')" ${!canScout ? 'disabled' : ''} title="${!canScout ? 'Scouting only available in Off-Season (Week 0)' : 'Scout for potential Ringer names'}">Scout for Players</button>
            <button onclick="window.navigateTo('recruitment')" title="Recruit new talent to the roster">Recruit New Talent</button>
            <button onclick="window.navigateTo('roster')">View Roster</button>
            <button onclick="openTeamTrainingFocusModal()">Team Training Focus</button>
            <button onclick="window.navigateTo('codex')">View Codex</button>
            <button class="primary-action" onclick="advanceWeek()" ${gameState.currentWeek === 0 && !canStartSeason ? 'disabled' : ''} title="${gameState.currentWeek === 0 && !canStartSeason ? `Need ${MINIMUM_ROSTER_SIZE} players to start season.` : ''}">
                ${gameState.currentWeek === 0 ? 'Start Season (Advance to Week 1)' : (gameState.currentWeek >= 16 ? 'Finish Season' : `Advance to Week ${gameState.currentWeek + 1} / Play Game`)}
            </button>
        </div>`;
    updateHeaderInfo(); // Call this to ensure the dynamic header values are also updated if they rely on the same IDs
}

function openTeamTrainingFocusModal() {
    playAudio('sfx_button_click');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    if (!modalOverlay || !modalContent) {
        console.error("Modal elements not found!");
        showNotification("Error: Could not open training focus popup.", true);
        return;
    }
    modalContent.innerHTML = `
        <h3>Set Weekly Training Focus</h3>
        <p>Select a focus for this week's training. This choice will apply when you advance the week.</p>
        <div>
            <button data-focus="Offensive Drills">Offensive Drills (+ Off. Skills)</button>
            <button data-focus="Defensive Schemes">Defensive Schemes (+ Def. Skills)</button>
            <button data-focus="Philosophical Alignment Workshop">Philosophical Alignment (+ Morale)</button>
            <button data-focus="Rest and Recovery">Rest and Recovery (Reduces fatigue - future)</button>
        </div>
        <button id="close-modal-button" class="secondary">Cancel</button>`;
    modalContent.querySelectorAll('button[data-focus]').forEach(button => {
        button.addEventListener('click', (e) => {
            playAudio('sfx_button_click');
            gameState.weeklyTrainingFocus = e.target.dataset.focus;
            showNotification(`Training focus: ${gameState.weeklyTrainingFocus}. Applies on week advance.`);
            modalOverlay.style.display = 'none';
            renderCurrentScreen(); 
        });
    });
    const closeModalButton = document.getElementById('close-modal-button');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => { playAudio('sfx_button_click'); modalOverlay.style.display = 'none'; });
    }
    modalOverlay.style.display = 'flex';
}

function renderScoutingScreen() {
    if (currentScoutingSession.round === 0 && currentScoutingSession.intelEarnedThisSession === 0) {
         currentScoutingSession = { round: 0, namesOnScreen: [], correctRingerThisRound: null, intelEarnedThisSession: 0, maxRounds: 5 };
    }
    let content = `<h2>Scouting Session: Real or Ringer?</h2>
                     <div class="scouting-info">
                         <p>Round: ${currentScoutingSession.round + 1} of ${currentScoutingSession.maxRounds}</p>
                         <p>Current Global Intel: ${gameState.scoutingIntel}</p>
                         <p>Intel Earned This Session: ${currentScoutingSession.intelEarnedThisSession}</p>
                     </div>`;
    if (currentScoutingSession.round < currentScoutingSession.maxRounds) {
        if (currentScoutingSession.namesOnScreen.length === 0) setupScoutingRound();
        content += `<p>Identify the "Ringer" (fake name) from the list below:</p>
                    <div class="scouting-names-grid">
                        ${currentScoutingSession.namesOnScreen.map(nameObj => `<button class="scouting-name-button" data-name="${nameObj.name}" ${nameObj.disabled ? 'disabled' : ''}>${nameObj.name}</button>`).join('')}
                    </div>
                    <div id="scouting-feedback" class="scouting-feedback" style="display:none;"></div>
                    <button id="next-round-button" style="display:none;" class="primary-action">Next Round</button>
                    <button id="exit-scouting-early-button" class="secondary mt-1">Exit Session Early (No Intel)</button>`;
    } else {
        let bonusIntel = 0;
        if (gameState.jakeHarrisSkills.designersInsight && currentScoutingSession.intelEarnedThisSession > 0) {
            bonusIntel = Math.floor(currentScoutingSession.intelEarnedThisSession * 0.05); // 5% bonus
        }
        gameState.scoutingIntel += currentScoutingSession.intelEarnedThisSession + bonusIntel; 
        content += `<h3>Session Complete!</h3>
                    <p>Total Intel Earned This Session: ${currentScoutingSession.intelEarnedThisSession}</p>
                    ${(gameState.jakeHarrisSkills.designersInsight && bonusIntel > 0) ? `<p>Designer's Insight Bonus: +${bonusIntel} Intel!</p>` : ''}
                    <p>Your Scouting Intel is now: ${gameState.scoutingIntel}</p>
                    <button onclick="window.navigateTo('gmOffice')" class="primary-action">Return to GM Office</button>`;
        // Reset for next time scouting is entered
        currentScoutingSession = { round: 0, namesOnScreen: [], correctRingerThisRound: null, intelEarnedThisSession: 0, maxRounds: 5 };
    }
    screenArea.innerHTML = content;
    document.querySelectorAll('.scouting-name-button').forEach(button => {
        button.addEventListener('click', (e) => handleScoutingChoice(e.target.dataset.name));
    });
    const nextRoundButton = document.getElementById('next-round-button');
    if(nextRoundButton) {
        nextRoundButton.addEventListener('click', () => {
            playAudio('sfx_button_click');
            currentScoutingSession.round++;
            currentScoutingSession.namesOnScreen = []; // Clear names for new round
            const feedbackDiv = document.getElementById('scouting-feedback');
            if(feedbackDiv) feedbackDiv.style.display = 'none';
            nextRoundButton.style.display = 'none'; // Hide button until next choice
            renderScoutingScreen(); // Re-render for the new round
        });
    }

    const exitScoutingEarlyButton = document.getElementById('exit-scouting-early-button');
    if (exitScoutingEarlyButton) {
        exitScoutingEarlyButton.addEventListener('click', () => {
            playAudio('sfx_button_click');
            if (confirm("Are you sure you want to exit scouting early? You will not receive any Intel earned in this session.")) {
                showNotification("Exited scouting session early. No Intel gained from this session.", false, 3000, 'top');
                // CRITICAL: Reset session intel and round BEFORE navigating away
                // This ensures the navigateTo function doesn't accidentally award intel.
                currentScoutingSession.intelEarnedThisSession = 0;
                currentScoutingSession.round = 0; // Setting round to 0 effectively ends the session for navigateTo logic
                window.navigateTo('gmOffice');
            }
        });
    }
}

function setupScoutingRound() {
    currentScoutingSession.namesOnScreen = [];

    // Ensure loaded lists have names before proceeding
    if (loadedFakeNames.length === 0 || loadedRealNamesNormal.length === 0 || loadedRealNamesStrange.length === 0) {
        console.error("One or more scouting name lists are empty. Cannot setup scouting round.");
        // Optionally, display a message to the user on the scouting screen
        currentScoutingSession.namesOnScreen.push({ name: "Error: Name list empty", type: 'fake', disabled: true });
        currentScoutingSession.namesOnScreen.push({ name: "Please check console", type: 'real', disabled: true });
        currentScoutingSession.namesOnScreen.push({ name: "Report to admin", type: 'real', disabled: true });
        currentScoutingSession.correctRingerThisRound = "Error: Name list empty";
        return;
    }

    // Select one random fake name (the ringer)
    const ringerIndex = Math.floor(Math.random() * loadedFakeNames.length);
    const ringerName = loadedFakeNames[ringerIndex];
    currentScoutingSession.correctRingerThisRound = ringerName;
    currentScoutingSession.namesOnScreen.push({ name: ringerName, type: 'fake', disabled: false });

    // Select one random real normal name
    const realNormalIndex = Math.floor(Math.random() * loadedRealNamesNormal.length);
    const realNormalName = loadedRealNamesNormal[realNormalIndex];
    currentScoutingSession.namesOnScreen.push({ name: realNormalName, type: 'real', disabled: false });

    // Select one random real strange name
    const realStrangeIndex = Math.floor(Math.random() * loadedRealNamesStrange.length);
    const strangePlayerObject = loadedRealNamesStrange[realStrangeIndex]; // This is now an object {name: "...", wikipedia_url: "..."}
    currentScoutingSession.namesOnScreen.push({ 
        name: strangePlayerObject.name, 
        type: 'real_strange', // Differentiate strange real names
        wikipedia_url: strangePlayerObject.wikipedia_url, // Store the URL
        disabled: false 
    });

    // Shuffle the names on screen
    currentScoutingSession.namesOnScreen.sort(() => Math.random() - 0.5);
}

function handleScoutingChoice(chosenName) {
    playAudio('sfx_button_click');
    const feedbackDiv = document.getElementById('scouting-feedback');
    const nextRoundButton = document.getElementById('next-round-button');
    if (!feedbackDiv || !nextRoundButton) {
        console.error("Scouting UI elements (feedback or next button) not found!");
        return;
    }
    let intelChangeThisRound = 0;

    document.querySelectorAll('.scouting-name-button').forEach(btn => btn.disabled = true);

    const selectedPlayerObjectOnScreen = currentScoutingSession.namesOnScreen.find(p => p.name === chosenName);

    if (chosenName === currentScoutingSession.correctRingerThisRound) {
        intelChangeThisRound = 10; 
        feedbackDiv.innerHTML = `<p>Correct! "${chosenName}" was the Ringer. +${intelChangeThisRound} Intel for this round.</p>`; // Use innerHTML
        feedbackDiv.className = 'scouting-feedback feedback-correct';
        playAudio('sfx_intel_gain');
    } else { // Incorrect choice, meaning a real player was selected
        intelChangeThisRound = -5; 
        let feedbackHTML = `<p>Incorrect. "${chosenName}" is a real player. The Ringer was "${currentScoutingSession.correctRingerThisRound}". ${intelChangeThisRound} Intel for this round.</p>`;
        
        if (selectedPlayerObjectOnScreen && selectedPlayerObjectOnScreen.type === 'real_strange' && selectedPlayerObjectOnScreen.wikipedia_url) {
            const wikiButtonId = `wiki-button-${Date.now()}`; // Unique ID for the button
            feedbackHTML += `<button id="${wikiButtonId}" class="secondary small-button mt-1">View ${chosenName}'s Wikipedia</button>`;
            
            // Add event listener after the button is in the DOM (see below)
            // We'll set a flag or use a more robust way to add listener after feedbackDiv.innerHTML is set
        }
        feedbackDiv.innerHTML = feedbackHTML; // Set the HTML content
        feedbackDiv.className = 'scouting-feedback feedback-incorrect';
        playAudio('sfx_intel_loss');

        // Add event listener for the Wikipedia button if it was created
        if (selectedPlayerObjectOnScreen && selectedPlayerObjectOnScreen.type === 'real_strange' && selectedPlayerObjectOnScreen.wikipedia_url) {
            const wikiButton = feedbackDiv.querySelector(`button[id^="wiki-button-"]`); // Find button by partial ID
            if (wikiButton) {
                wikiButton.addEventListener('click', () => {
                    playAudio('sfx_button_click');
                    window.open(selectedPlayerObjectOnScreen.wikipedia_url, '_blank');
                });
            }
        }
    }
    feedbackDiv.style.display = 'block';
    currentScoutingSession.intelEarnedThisSession += intelChangeThisRound;
    
    const sessionIntelDisplayLive = screenArea.querySelector('.scouting-info p:nth-child(3)');
    if (sessionIntelDisplayLive) sessionIntelDisplayLive.textContent = `Intel Earned This Session: ${currentScoutingSession.intelEarnedThisSession}`;
    
    nextRoundButton.style.display = 'block';
    // Update budget immediately after Intel changes in scouting
    updateBudgetBasedOnIntel();
}

function renderRecruitmentScreen() {
    // This screen will now function as the Draft Board
    let content = `<h2>NFL Draft Board</h2>
                     <p>Available Scouting Intel: ${gameState.scoutingIntel}</p>
                     <p>Team Budget: $${gameState.teamBudget.toLocaleString()}</p>
                     <p>Roster: ${gameState.eaglesRoster.length}/${MINIMUM_ROSTER_SIZE} players. Select a player to draft.</p>
                     

                     <button onclick="window.navigateTo('gmOffice')" class="secondary">Back to GM Office</button>

                     <div class="draft-controls">
                         <input type="text" id="player-search" placeholder="Search player name..." value="${gameState.recruitmentFilterState.searchTerm}">
                         <select id="position-filter">
                             <option value="">All Positions</option>
                             ${NFL_POSITIONS.map(pos => `<option value="${pos}" ${gameState.recruitmentFilterState.positionFilter === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                         </select>
                         <select id="offence-filter">
                             <option value="" ${gameState.recruitmentFilterState.offenceFilter === "" ? 'selected' : ''}>Offence Rating (Any)</option>
                             <option value="80+" ${gameState.recruitmentFilterState.offenceFilter === "80+" ? 'selected' : ''}>80+</option>
                             <option value="70-79" ${gameState.recruitmentFilterState.offenceFilter === "70-79" ? 'selected' : ''}>70-79</option>
                             <option value="60-69" ${gameState.recruitmentFilterState.offenceFilter === "60-69" ? 'selected' : ''}>60-69</option>
                             <option value="<60" ${gameState.recruitmentFilterState.offenceFilter === "<60" ? 'selected' : ''}><60</option>
                         </select>
                         <select id="defence-filter">
                             <option value="" ${gameState.recruitmentFilterState.defenceFilter === "" ? 'selected' : ''}>Defence Rating (Any)</option>
                             <option value="80+" ${gameState.recruitmentFilterState.defenceFilter === "80+" ? 'selected' : ''}>80+</option>
                             <option value="70-79" ${gameState.recruitmentFilterState.defenceFilter === "70-79" ? 'selected' : ''}>70-79</option>
                             <option value="60-69" ${gameState.recruitmentFilterState.defenceFilter === "60-69" ? 'selected' : ''}>60-69</option>
                             <option value="<60" ${gameState.recruitmentFilterState.defenceFilter === "<60" ? 'selected' : ''}><60</option>
                         </select>
                         <select id="cost-filter">
                             <option value="" ${gameState.recruitmentFilterState.costFilter === "" ? 'selected' : ''}>Contract Cost (Any)</option>
                             <option value="<1000000" ${gameState.recruitmentFilterState.costFilter === "<1000000" ? 'selected' : ''}>Less than 1,000,000</option>
                             <option value="1000000-10000000" ${gameState.recruitmentFilterState.costFilter === "1000000-10000000" ? 'selected' : ''}>1,000,000 to 10,000,000</option>
                             <option value="10000000-50000000" ${gameState.recruitmentFilterState.costFilter === "10000000-50000000" ? 'selected' : ''}>10,000000 to 50,000,000</option>
                             <option value=">50000000" ${gameState.recruitmentFilterState.costFilter === ">50000000" ? 'selected' : ''}>More than 50,000,000</option>
                         </select>
                     </div>

                     <div id="draft-board-list" class="player-candidate-list">`; // Renamed ID and class

    // Display players directly from the draft pool
    const availablePlayersInPool = gameState.draftPool || []; // Use draftPool

    if (availablePlayersInPool.length === 0 && gameState.eaglesRoster.length < allNFLPlayers.length) {
         content += "<p>No players available in the draft pool.</p>";
    } else if (availablePlayersInPool.length === 0 && gameState.eaglesRoster.length >= allNFLPlayers.length) {
         content += "<p>You have drafted all available players!</p>";
    }
    else {
        // Display all available players initially from the draft pool
        availablePlayersInPool.forEach(playerData => {
            // Determine philosophy based on philosophy_bias, default to Neutral if not specified or invalid
            const philosophyKey = PLAYER_PHILOSOPHY_TEMPLATES.hasOwnProperty(playerData.philosophy_bias) ? playerData.philosophy_bias : "Neutral";
            const template = PLAYER_PHILOSOPHY_TEMPLATES[philosophyKey];

            // Calculate cost based on overall rating (simple example - will need refinement)
            // For draft, let's use a contract_cost property from the player data if available,
            // otherwise calculate a placeholder cost.
            const cost = playerData.contract_cost !== undefined ? playerData.contract_cost : Math.max(10, Math.floor(((playerData.offence_rating + playerData.defence_rating + playerData.special_teams_rating) / 3) * 1.5)); // Placeholder cost

            content += `
                <div class="player-candidate-card" data-player-name="${playerData.name}" data-position="${playerData.position}" data-offence="${playerData.offence_rating}" data-defence="${playerData.defence_rating}" data-cost="${cost}">
                    <h3>${playerData.name}</h3>
                    <p>Position: ${playerData.position}</p>
                    <p>Age: ${playerData.age}</p>
                    <p>Ratings: Off ${playerData.offence_rating}, Def ${playerData.defence_rating}, ST ${playerData.special_teams_rating}</p>
                    <p class="philosophy-name">Philosophy: ${template.name}</p>
                    <p>Trait: ${template.traitName} - <em>${template.traitDescription}</em></p>
                    ${playerData.real_stats_summary ? `<p><em>Real Stats Summary: ${playerData.real_stats_summary}</em></p>` : ''}
                    <p class="cost">Contract Cost: $${playerData.contract_cost.toLocaleString()}</p>
                    <p class="intel-cost">Intel Cost: ${Math.ceil(playerData.contract_cost / 500000)}</p>
                    <button class="draft-button" data-player-name="${playerData.name}" data-cost="${cost}" ${gameState.teamBudget < playerData.contract_cost || gameState.scoutingIntel < Math.ceil(playerData.contract_cost / 500000) ? 'disabled' : ''}>
                        Draft ($${playerData.contract_cost.toLocaleString()} & ${Math.ceil(playerData.contract_cost / 500000)} Intel)
                    </button>
                    ${gameState.teamBudget < playerData.contract_cost ? '<span class="cost-needed-message">Insufficient Team Budget. Increase budget by improving GM reputation (Eco-Advocate) or scouting more intel.</span>' : ''}
                    ${gameState.scoutingIntel < Math.ceil(playerData.contract_cost / 500000) ? '<span class="cost-needed-message">Insufficient Scouting Intel. Earn more intel through scouting sessions.</span>' : ''}
                </div>`;
        });
    }
    content += `</div><button onclick="window.navigateTo('gmOffice')" class="secondary">Back to GM Office</button>`;
    screenArea.innerHTML = content;

    // Add event listeners for draft buttons
    document.querySelectorAll('.draft-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            const playerName = btn.dataset.playerName;
            const playerToDraft = allNFLPlayers.find(p => p.name === playerName);

            if (playerToDraft) {
                 // Call a new draft function instead of recruitPlayer
                 window.draftPlayer(
                    playerName,
                    parseInt(btn.dataset.cost),
                    playerToDraft
                 );
            } else {
                 console.error("Could not find player data for drafting:", playerName);
                 showNotification("Error drafting player. Data not found.", true);
            }
        });
    });

    // Add event listeners for filters and search (implementation needed later)
    document.getElementById('player-search').addEventListener('input', updateDraftBoardDisplay);
    document.getElementById('player-search').addEventListener('input', (e) => {
        gameState.recruitmentFilterState.searchTerm = e.target.value;
        updateDraftBoardDisplay();
    });
    document.getElementById('position-filter').addEventListener('change', (e) => {
        gameState.recruitmentFilterState.positionFilter = e.target.value;
        updateDraftBoardDisplay();
    });
    document.getElementById('offence-filter').addEventListener('change', (e) => {
        gameState.recruitmentFilterState.offenceFilter = e.target.value;
        updateDraftBoardDisplay();
    });
    document.getElementById('defence-filter').addEventListener('change', (e) => {
        gameState.recruitmentFilterState.defenceFilter = e.target.value;
        updateDraftBoardDisplay();
    });
    document.getElementById('cost-filter').addEventListener('change', (e) => {
        gameState.recruitmentFilterState.costFilter = e.target.value;
        updateDraftBoardDisplay();
    });
    
    // Initial display update based on potentially pre-filled filters
    updateDraftBoardDisplay();
}

// Placeholder function for updating the display based on filters/search
function updateDraftBoardDisplay() {
    const searchTerm = gameState.recruitmentFilterState.searchTerm.toLowerCase();
    const positionFilter = gameState.recruitmentFilterState.positionFilter;
    const offenceFilter = gameState.recruitmentFilterState.offenceFilter;
    const defenceFilter = gameState.recruitmentFilterState.defenceFilter;
    const costFilter = gameState.recruitmentFilterState.costFilter;

    document.querySelectorAll('.player-candidate-card').forEach(card => {
        const playerName = card.dataset.playerName.toLowerCase();
        const playerPosition = card.dataset.position;
        const playerOffence = parseInt(card.dataset.offence);
        const playerDefence = parseInt(card.dataset.defence);
        const playerCost = parseInt(card.dataset.cost);

        let showCard = true;

        // Apply search filter
        if (searchTerm && !playerName.includes(searchTerm)) {
            showCard = false;
        }

        // Apply position filter
        if (positionFilter && playerPosition !== positionFilter) {
            showCard = false;
        }

        // Apply offence filter
        if (offenceFilter) {
            if (offenceFilter === "80+" && playerOffence < 80) showCard = false;
            else if (offenceFilter === "70-79" && (playerOffence < 70 || playerOffence > 79)) showCard = false;
            else if (offenceFilter === "60-69" && (playerOffence < 60 || playerOffence > 69)) showCard = false;
            else if (offenceFilter === "<60" && playerOffence >= 60) showCard = false;
        }

        // Apply defence filter
        if (defenceFilter) {
            if (defenceFilter === "80+" && playerDefence < 80) showCard = false;
            else if (defenceFilter === "70-79" && (playerDefence < 70 || playerDefence > 79)) showCard = false;
            else if (defenceFilter === "60-69" && (playerDefence < 60 || playerDefence > 69)) showCard = false;
            else if (defenceFilter === "<60" && playerDefence >= 60) showCard = false;
        }

        // Apply cost filter
        if (costFilter) {
             if (costFilter === "<1000000" && playerCost >= 1000000) showCard = false;
             else if (costFilter === "1000000-10000000" && (playerCost < 1000000 || playerCost > 10000000)) showCard = false;
             else if (costFilter === "10000000-50000000" && (playerCost < 10000000 || playerCost > 50000000)) showCard = false;
             else if (costFilter === ">50000000" && playerCost <= 50000000) showCard = false;
        }


        card.style.display = showCard ? 'block' : 'none';
    });
}


/**
 * Drafts a player to the Eagles roster and triggers AI drafting.
 * @param {string} playerName - The name of the player to draft.
 * @param {number} cost - The Intel cost to draft.
 * @param {object} playerData - The full player data object from allNFLPlayers.
 */
window.draftPlayer = function(playerName, cost, playerData) {
    playAudio('sfx_button_click');
    // Add check for max roster size
    if (gameState.eaglesRoster.length >= MINIMUM_ROSTER_SIZE) {
        showNotification(`Your roster is already full (${MINIMUM_ROSTER_SIZE} players). You cannot draft more players.`, true);
        return;
    }

    // Calculate Intel cost (contract_cost / 500,000)
    const intelCost = Math.ceil(playerData.contract_cost / 500000); // Use Math.ceil to round up

    // Check if both Intel and Budget are sufficient
    if (gameState.scoutingIntel >= intelCost && gameState.teamBudget >= playerData.contract_cost) {
        gameState.scoutingIntel -= intelCost; // Deduct calculated Intel cost
        gameState.teamBudget -= playerData.contract_cost; // Deduct contract cost from budget

        // Determine philosophy based on player data, default to Neutral if not specified or invalid
        const philosophyKey = PLAYER_PHILOSOPHY_TEMPLATES.hasOwnProperty(playerData.philosophy_bias) ? playerData.philosophy_bias : "Neutral";
        const template = PLAYER_PHILOSOPHY_TEMPLATES[philosophyKey];

        // Create the player object for the roster using the real player data
        const newPlayer = createPlayerFromTemplate(
            playerData, // Pass the full player data
            philosophyKey, // Use determined philosophy
            playerData.position, // Use player's position
            70, // Initial morale (can be adjusted)
            65, // Initial loyalty (can be adjusted)
            false // Not a basic player
        );

        if (!newPlayer) {
            showNotification("Failed to generate player object. Try again.", true);
            gameState.scoutingIntel += cost; // Refund intel
            gameState.teamBudget += playerData.contract_cost; // Refund budget
            return;
        }

        gameState.eaglesRoster.push(newPlayer);

        // Unlock codex entry for the player's philosophy if not already unlocked
        if (codexEntries[`PHIL_${philosophyKey}`] && !codexEntries[`PHIL_${philosophyKey}`].unlocked) {
            codexEntries[`PHIL_${philosophyKey}`].unlocked = true;
            showNotification(`New Codex Entry Unlocked: ${codexEntries[`PHIL_${philosophyKey}`].title}`, false, 4000, 'bottom');
        }
        playAudio(cost > 0 ? 'sfx_intel_gain' : 'sfx_button_click');

        showNotification(`${newPlayer.name} (${template.name}) has been drafted to the Philadelphia Eagles! Contract Cost: $${playerData.contract_cost.toLocaleString()}`, false, 4000, 'top');

        // Remove the drafted player from the draft pool
        gameState.draftPool = gameState.draftPool.filter(p => p.name !== playerName);

        // After the user drafts, trigger AI drafting for other teams
        simulateAIDraftRound(); // Call this after user picks

        // Re-render the draft board to show remaining players
        renderRecruitmentScreen(); // This will now show the updated available players
        updateHeaderInfo(); // Update Intel display
    } else if (gameState.scoutingIntel < intelCost) {
        playAudio('sfx_intel_loss');
        showNotification(`Not enough Scouting Intel to draft this player. Intel Cost: ${intelCost}, Have: ${gameState.scoutingIntel}`, true);
    } else { // Must be insufficient budget
         playAudio('sfx_intel_loss');
         showNotification(`Not enough Team Budget to draft this player. Money Cost: $${playerData.contract_cost.toLocaleString()}, Have: $${gameState.teamBudget.toLocaleString()}`, true);
    }
};

/**
 * Simulates one round of AI drafting for all NFL teams (excluding the Eagles).
 */
function simulateAIDraftRound() {
    console.log("Simulating AI draft round...");
    // AI drafts from the remaining players in the draft pool
    const availablePlayersInPool = gameState.draftPool || [];

    const otherNFLTeams = Object.keys(gameState.allNFLTeams).filter(teamName => teamName !== "Philadelphia Eagles");

    // Simple AI logic: Each AI team picks one player
    otherNFLTeams.forEach(teamName => {
        // Add check for max roster size for AI teams
        if (gameState.allNFLTeams[teamName].length >= MINIMUM_ROSTER_SIZE) {
            console.log(`${teamName} roster is full (${MINIMUM_ROSTER_SIZE} players). Skipping draft pick.`);
            return; // Skip this team for this round
        }

        if (availablePlayersInPool.length === 0) {
            console.log(`No more players available for ${teamName} to draft.`);
            return;
        }

        // Simple AI logic: Pick the highest-rated available player from the pool
        // Sort available players in the pool by overall rating (Off + Def + ST) descending
        availablePlayersInPool.sort((a, b) => {
            const ratingA = (a.offence_rating + a.defence_rating + a.special_teams_rating) / 3;
            const ratingB = (b.offence_rating + b.defence_rating + b.special_teams_rating) / 3;
            return ratingB - ratingA;
        });

        const playerToDraft = availablePlayersInPool.shift(); // Get the top player and remove from the pool

        if (playerToDraft) {
            // Add the player to the AI team's roster
            if (!gameState.allNFLTeams[teamName]) {
                gameState.allNFLTeams[teamName] = [];
            }
            // Create the player object for the AI roster using createPlayerFromTemplate
            const aiPlayer = createPlayerFromTemplate(
                playerToDraft, // Pass the full player data from the pool
                playerToDraft.philosophy_bias || "Neutral", // Use player's philosophy bias or Neutral
                playerToDraft.position, // Use player's position
                70, // Initial morale (can be adjusted for AI)
                65, // Initial loyalty (can be adjusted for AI)
                false // Not a basic player
            );
            if (aiPlayer) {
                gameState.allNFLTeams[teamName].push(aiPlayer); // Add the created player object
                console.log(`${teamName} drafted ${playerToDraft.name}`);
            } else {
                console.warn(`Failed to create player object for AI team ${teamName} for player ${playerToDraft.name}`);
            }
        }
    });

    // The gameState.draftPool array is modified in place by .shift(),
    // so the next user renderRecruitmentScreen will reflect the reduced pool.
}


/**
 * Creates a player object, either from loaded NFL data or as a basic template.
 * @param {object} playerData - Optional. The player object from allNFLPlayers to use.
 * @param {string} philosophyKey - The philosophy key (e.g., "Individualist", "Neutral").
 * @param {string} position - The player's position.
 * @param {number} morale - Initial morale.
 * @param {number} loyalty - Initial loyalty.
 * @param {boolean} isBasic - True if creating a basic, non-NFL player.
 * @returns {object|null} The created player object or null if creation failed.
 */
function createPlayerFromTemplate(playerData = null, philosophyKey, position, morale = 70, loyalty = 65, isBasic = false) {
    const template = PLAYER_PHILOSOPHY_TEMPLATES[philosophyKey];
    if (!template) {
        console.error(`Unknown philosophy key: ${philosophyKey}`);
        return null;
    }

    let assignedName;
    let offenceSkill;
    let defenceSkill;
    let specialTeamsSkill;
    let age;
    let realStatsSummary = null; // To store real stats summary if available

    if (playerData) {
        // Use data from the provided player object
        assignedName = playerData.name;
        offenceSkill = playerData.offence_rating;
        defenceSkill = playerData.defence_rating;
        specialTeamsSkill = playerData.special_teams_rating;
        age = playerData.age;
        realStatsSummary = playerData.real_stats_summary; // Store the real stats summary
        // Ensure philosophy and position match the template/selection, but prefer player data if available and valid
        philosophyKey = playerData.philosophy_bias || philosophyKey;
        position = playerData.position || position;

    } else {
        // Generate data for a basic player (or fallback if no player data provided)
        assignedName = `Basic Player ${Date.now().toString().slice(-4)}`; // Generic name
        let baseOffence = 50 + (template.baseStatModifiers.offence || 0) * 3;
        let baseDefence = 50 + (template.baseStatModifiers.defence || 0) * 3;
        let statRandomness = isBasic ? 10 : 15;
        let statBonus = isBasic ? -5 : 0;

        offenceSkill = Math.max(20, Math.min(90, baseOffence + Math.floor(Math.random() * (statRandomness * 2 + 1)) - statRandomness + statBonus));
        defenceSkill = Math.max(20, Math.min(90, baseDefence + Math.floor(Math.random() * (statRandomness * 2 + 1)) - statRandomness + statBonus));
        specialTeamsSkill = Math.max(20, Math.min(90, 40 + Math.floor(Math.random() * 21) - 10 + statBonus));
        age = Math.floor(Math.random() * 16) + 20; // Age between 20 and 35
    }

    // Ensure the generated name is unique on the current roster
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loop
    while (gameState.eaglesRoster.some(p => p.name === assignedName) && attempts < maxAttempts) {
         assignedName = `${assignedName} Jr.`; // Append Jr. to try and make it unique
         attempts++;
         if (attempts >= maxAttempts) {
             console.warn(`Could not generate a unique name for player based on "${assignedName}". Using timestamp fallback.`);
             assignedName = `Player ${Date.now().toString().slice(-4)}`;
             // Final check for timestamp fallback uniqueness (unlikely to conflict)
             if (gameState.eaglesRoster.some(p => p.name === assignedName)) {
                  console.error("Timestamp fallback name also conflicted. This is unexpected.");
                  // As a last resort, add a random string
                  assignedName = `Player ${Date.now().toString().slice(-4)}_${Math.random().toString(36).substr(2, 3)}`;
             }
             break; // Exit loop after fallback
         }
    }



    return {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Unique ID
        name: assignedName,
        philosophy: philosophyKey,
        position: position,
        morale: Math.round(morale),
        loyalty: loyalty,
        skills: {
            offence: offenceSkill,
            defence: defenceSkill,
            specialTeams: specialTeamsSkill,
        },
        uniqueTraitName: template.traitName,
        weeksWithTeam: 0,
        statsThisSeason: { gamesPlayed: 0, keyPlays: 0 },
        age: age,
        realStatsSummary: realStatsSummary // Include real stats summary
    };
}

function renderRosterScreen() {
    let content = `<h2>Philadelphia Eagles Roster (${gameState.eaglesRoster.length} Players)</h2>`;
    if (gameState.eaglesRoster.length === 0) {
        content += "<p>Your roster is currently empty. Go recruit some players!</p>";
    } else {
        content += `<p>Minimum required for season: ${MINIMUM_ROSTER_SIZE} players.</p>
            <table class="roster-table">
                <thead>
                    <tr>
                        <th>Name</th><th>Pos.</th><th>Age</th><th>Philosophy</th><th>Morale</th><th>Loyalty</th><th>Off</th><th>Def</th><th>ST</th><th>Trait</th>
                    </tr>
                </thead>
                <tbody>`;
        gameState.eaglesRoster.forEach(player => {
            const philosophyDetails = PLAYER_PHILOSOPHY_TEMPLATES[player.philosophy];
            content += `
                <tr>
                    <td>${player.name}</td><td>${player.position}</td><td>${player.age || '?'}</td>
                    <td>${philosophyDetails ? philosophyDetails.name : player.philosophy}</td>
                    <td>${player.morale}</td><td>${player.loyalty}</td>
                    <td>${player.skills.offence}</td><td>${player.skills.defence}</td><td>${player.skills.specialTeams || '?'}</td>
                    <td>${player.uniqueTraitName}</td>
                </tr>`;
        });
        content += `</tbody></table>`;
    }
    content += `<button onclick="window.navigateTo('gmOffice')" class="secondary mt-2">Back to GM Office</button>`;
    screenArea.innerHTML = content;
}

function renderGameDayPrepScreen() {
    if (gameState.currentOpponentIndex >= gameState.gameSchedule.length) {
        screenArea.innerHTML = `<p>Error: No more opponents scheduled or opponent index out of bounds.</p><button onclick="window.navigateTo('gmOffice')">Back to Office</button>`;
        return;
    }
    const opponent = gameState.gameSchedule[gameState.currentOpponentIndex];
    if (!opponent) { // Should be caught by above, but good failsafe
        screenArea.innerHTML = `<p>Error: Opponent data not found for current game.</p><button onclick="window.navigateTo('gmOffice')">Back to Office</button>`;
        return;
    }
    screenArea.innerHTML = `
        <h2>Game Day Preparation: Week ${gameState.currentWeek}</h2>
        <div class="game-day-info">
            <h3>Upcoming Opponent: ${opponent.opponentName}</h3>
            <p>Strength: ${opponent.strength}</p>
            <p>Scouting Report: ${opponent.philosophyHint}</p>
        </div>
        <div class="opponent-roster-display">
            <h3>Opponent Roster: ${opponent.opponentName}</h3>
            <div id="opponent-roster-list">
                <!-- Opponent roster will be rendered here -->
            </div>
        </div>
        <div class="strategy-selection">
            <h3>Select Your Strategies:</h3>
            <div>
                <label for="offensive-strategy">Offensive Strategy:</label>
                <select id="offensive-strategy">
                    <option value="balanced">Balanced Attack</option>
                    <option value="aggressive_pass">Aggressive Passing</option>
                    <option value="conservative_run">Conservative Run Game</option>
                    <option value="exploit_matchups">Exploit Matchups</option>
                </select>
            </div>
            <div>
                <label for="defensive-strategy">Defensive Strategy:</label>
                <select id="defensive-strategy">
                    <option value="standard_defense">Standard Defence</option>
                    <option value="blitz_heavy">Blitz Heavy Pressure</option>
                    <option value="bend_dont_break">Bend Don't Break</option>
                    <option value="shutdown_star">Shutdown Opponent Star</option>
                </select>
            </div>
        </div>
        <button id="start-game-button" class="primary-action">Start Game vs ${opponent.opponentName}</button>
        <button onclick="window.navigateTo('gmOffice')" class="secondary">Back to GM Office (Forfeit)</button>`;
    
    const startGameButton = document.getElementById('start-game-button');
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            playAudio('sfx_button_click');
            const offStrategyEl = document.getElementById('offensive-strategy');
            const defStrategyEl = document.getElementById('defensive-strategy');
            if (offStrategyEl && defStrategyEl) {
                gameState.playerStrategies.offensive = offStrategyEl.value;
                gameState.playerStrategies.defensive = defStrategyEl.value;
                gameState.currentScreen = 'gameDaySim';
                renderCurrentScreen(); // Render the sim screen structure
                setTimeout(simulateGameInstance, 100); // Start simulation after a brief pause
            } else {
                console.error("Strategy select elements not found!");
                showNotification("Error: Could not set strategies.", true);
            }
        });
    }

    // Render opponent roster after the screen structure is in place
    renderOpponentRoster(opponent.opponentName);
}

/**
 * Renders the opponent's roster on the Game Day Prep screen.
 * @param {string} opponentTeamName - The name of the opponent team.
 */
function renderOpponentRoster(opponentTeamName) {
    const opponentRosterDiv = document.getElementById('opponent-roster-list');
    if (!opponentRosterDiv) {
        console.error("Opponent roster display area not found!");
        return;
    }

    const opponentRoster = gameState.allNFLTeams[opponentTeamName] || [];

    let rosterHTML = '';
    if (opponentRoster.length === 0) {
        rosterHTML = "<p>Opponent roster data not available.</p>";
    } else {
        rosterHTML += `
            <table class="roster-table">
                <thead>
                    <tr>
                        <th>Name</th><th>Pos.</th><th>Age</th><th>Philosophy</th><th>Off</th><th>Def</th><th>ST</th><th>Trait</th>
                    </tr>
                </thead>
                <tbody>`;
        opponentRoster.forEach(player => {
            // Corrected: Use player.philosophy instead of player.philosophy_bias
            const philosophyDetails = PLAYER_PHILOSOPHY_TEMPLATES[player.philosophy] || PLAYER_PHILOSOPHY_TEMPLATES["Neutral"];
            rosterHTML += `
                <tr>
                    <td>${player.name}</td><td>${player.position}</td><td>${player.age || '?'}</td>
                    <td>${philosophyDetails.name}</td>
                    <td>${player.skills.offence}</td><td>${player.skills.defence}</td><td>${player.skills.specialTeams || '?'}</td>
                    <td>${philosophyDetails.traitName}</td>
                </tr>`;
        });
        rosterHTML += `</tbody></table>`;
    }

    opponentRosterDiv.innerHTML = rosterHTML;
}

function renderDecisionPointUI(decisionContext, quarter, scoreString, callback) {
    const simLogContainer = document.getElementById('game-sim-log-container');
    if (!simLogContainer) {
        console.error("Sim log container not found for decision point!");
        callback(decisionContext.choices[0].action); 
        return;
    }
    const finishEarlyButton = document.getElementById('finish-game-early');
    if (finishEarlyButton) finishEarlyButton.style.display = 'none';

    let decisionHTML = `<div class="decision-point" id="current-decision-point">
                            <h4>Decision Point! (Q${quarter} - ${scoreString})</h4>
                            <p>${decisionContext.text}</p>`;
    decisionContext.choices.forEach(choice => {
        decisionHTML += `<button class="decision-choice-button" data-action="${choice.action}">${choice.text}</button>`;
    });
    decisionHTML += `</div>`;
    
    const oldDecisionPoint = document.getElementById('current-decision-point');
    if(oldDecisionPoint) oldDecisionPoint.remove(); 

    simLogContainer.insertAdjacentHTML('beforeend', decisionHTML);
    const decisionPointElement = document.getElementById('current-decision-point');
    if (decisionPointElement) decisionPointElement.scrollIntoView({ behavior: 'smooth', block: 'end' });

    console.log("renderDecisionPointUI: Adding event listeners to decision buttons");
    document.querySelectorAll('.decision-choice-button').forEach(button => {
        button.addEventListener('click', (e) => {
            console.log("Decision button clicked");
            playAudio('sfx_button_click');
            const chosenAction = e.target.dataset.action;
            console.log(`Decision button action: ${chosenAction}`);
            logToGameSim(`GM Decision: ${e.target.textContent} (Action: ${chosenAction})`);
            if(decisionPointElement) decisionPointElement.remove();
            console.log("Calling decision point callback");
            callback(chosenAction);
            console.log("Callback finished");
        });
    });
    console.log("renderDecisionPointUI: Event listeners added");
}

function logToGameSim(message, isImportant = false) {
    gameState.gameLog.push(message);
    const logDiv = document.getElementById('game-sim-log');
    if (logDiv) {
        const p = document.createElement('p');
        p.textContent = message;
        if (isImportant) p.style.fontWeight = 'bold';
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight; 
    }
}

function renderGameResultScreen(resultData) {
    if (resultData.win) playAudio('sfx_win_game'); else playAudio('sfx_lose_game');
    screenArea.innerHTML = `
        <h2>Game Result: Week ${gameState.currentWeek}</h2>
        <div class="game-day-info">
            <h3>${resultData.win ? 'VICTORY!' : (resultData.eaglesScore === resultData.opponentScore ? 'TIE GAME!' : 'DEFEAT')}</h3>
            <p>Philadelphia Eagles: ${resultData.eaglesScore}</p>
            <p>${resultData.opponentName}: ${resultData.opponentScore}</p>
        </div>
        <h4>Game Summary:</h4>
        <div class="game-sim-log">${gameState.gameLog.map(entry => `<p>${entry}</p>`).join('')}</div>
        <p>Your record is now: ${gameState.seasonWins} Wins - ${gameState.seasonLosses} Losses.</p>
        ${resultData.moraleChangeText ? `<p>${resultData.moraleChangeText}</p>` : ''}
        <button onclick="window.returnToGMOfficeAfterGame()" class="primary-action">Continue to GM Office</button>`;
}

window.returnToGMOfficeAfterGame = function() {
    playAudio('sfx_button_click');
    gameState.gameLog = []; 
    window.navigateTo('gmOffice');
};

function renderScenarioScreen(scenarioObject) {
    window.currentScenarioObject = scenarioObject; 
    let description = typeof scenarioObject.description === 'function' ? scenarioObject.description(gameState) : scenarioObject.description;

    let content = `
        <h2>Scenario: ${scenarioObject.title}</h2>
        <div class="scenario-content">
            <p class="description">${description}</p>
            <div class="scenario-choices">`;
    scenarioObject.choices.forEach((choice, index) => {
        let choiceText = choice.text;
        let disabledAttribute = "";
        if (choice.meta && choice.meta.requiresComposure) {
            if (gameState.jakeHarrisSkills.cricketersComposure) {
                choiceText += " (Composure Available)";
            } else {
                choiceText += " (Composure Check Failed - Risky)";
            }
        }
        content += `<button data-choice-index="${index}" ${disabledAttribute}>${choiceText}</button>`;
    });
    content += `</div>
            <div id="scenario-feedback" class="scenario-feedback" style="display:none;"></div>
        </div>
        <button id="scenario-continue-button" style="display:none;" class="primary-action">Continue</button>`;
    screenArea.innerHTML = content;

    document.querySelectorAll('.scenario-choices button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (e.target.disabled) return; 
            playAudio('sfx_button_click');
            const choiceIndex = parseInt(e.target.dataset.choiceIndex);
            const chosenChoice = scenarioObject.choices[choiceIndex];
            let outcomeToApply = chosenChoice.outcome;
            if (chosenChoice.meta && chosenChoice.meta.requiresComposure && gameState.jakeHarrisSkills.cricketersComposure && chosenChoice.composureOutcome) {
                outcomeToApply = chosenChoice.composureOutcome;
            }
            handleScenarioChoice(scenarioObject, outcomeToApply);
            document.querySelectorAll('.scenario-choices button').forEach(btn => btn.disabled = true);
            const scenarioContinueButton = document.getElementById('scenario-continue-button');
            if (scenarioContinueButton) scenarioContinueButton.style.display = 'block';
        });
    });

    const scenarioContinueButton = document.getElementById('scenario-continue-button');
     if (scenarioContinueButton) {
        scenarioContinueButton.onclick = () => { // Assign directly
            playAudio('sfx_button_click');
            window.navigateTo('gmOffice');
        };
    }
}

function renderCodexScreen() {
    let unlockedEntriesHTML = "<h3>Unlocked Codex Entries</h3><ul class='codex-entry-list'>";
    let hasUnlocked = false;
    Object.keys(codexEntries).sort().forEach(key => { 
        if (codexEntries[key].unlocked) {
            hasUnlocked = true;
            unlockedEntriesHTML += `<li data-key="${key}">${codexEntries[key].title}</li>`;
        }
    });
    if (!hasUnlocked) unlockedEntriesHTML += "<p>No entries unlocked yet. Play the game to discover more!</p>";
    unlockedEntriesHTML += "</ul>";

    screenArea.innerHTML = `
        <h2>Codex</h2>
        <p>Learn more about the philosophies, game mechanics, and world of EPG.</p>
        ${unlockedEntriesHTML}
        <div id="codex-entry-detail" class="codex-entry-content" style="display:none;">
            <h3 id="codex-detail-title"></h3>
            <p id="codex-detail-text" style="white-space: pre-wrap;"></p>
        </div>
        <button onclick="window.navigateTo('gmOffice')" class="secondary mt-2">Back to GM Office</button>`;

    document.querySelectorAll('.codex-entry-list li').forEach(li => {
        li.addEventListener('click', (e) => {
            playAudio('sfx_button_click');
            const key = e.target.dataset.key;
            const entry = codexEntries[key];
            const detailTitleEl = document.getElementById('codex-detail-title');
            const detailTextEl = document.getElementById('codex-detail-text');
            const detailContainerEl = document.getElementById('codex-entry-detail');

            if (entry && detailTitleEl && detailTextEl && detailContainerEl) {
                detailTitleEl.textContent = entry.title;
                detailTextEl.textContent = entry.text;
                detailContainerEl.style.display = 'block';
            }
        });
    });
}

function renderEndSeasonScreen() {
    let epilogue = "";
    const winsMet = gameState.seasonWins >= gameState.seasonGoal.wins;
    const greenMet = gameState.greenRating >= gameState.seasonGoal.greenRatingMin;
    let resultTitle = "Season Concluded";
    let overallResultMessage = "";

    if (winsMet && greenMet) {
        resultTitle = "Triumphant Season!";
        overallResultMessage = `<span class="result-positive">Outstanding success! You met both your wins target (${gameState.seasonGoal.wins}) and Green Rating goal (${gameState.seasonGoal.greenRatingMin}%). The Philadelphia Eagles are soaring high!</span>`;
        epilogue = "GM Jake Harris masterfully balanced on-field dominance with off-field responsibility, crafting a season for the ages. The future looks bright in Philadelphia, with a team that champions both victory and values. Owner Jeffrey Lurie is reportedly ecstatic.";
    } else if (winsMet && !greenMet) {
        resultTitle = "Winning Record, But Eco Goals Missed";
        overallResultMessage = `<span class="result-positive">You achieved a winning record (${gameState.seasonWins} wins)!</span> However, the <span class="result-negative">team's Green Rating (${gameState.greenRating}%) fell short of the ${gameState.seasonGoal.greenRatingMin}% target.</span>`;
        epilogue = "While the Eagles found success on the gridiron, their environmental commitments lagged. GM Harris proved a capable tactician, but questions remain about the organisation's broader vision. There's work to be done to truly be leaders off the field.";
    } else if (!winsMet && greenMet) {
        resultTitle = "Green Champions, On-Field Struggles";
        overallResultMessage = `The team made <span class="result-positive">excellent progress on its Green Rating goal (${gameState.greenRating}%)!</span> Unfortunately, this <span class="result-negative">didn't translate to enough wins on the field (${gameState.seasonWins} vs target of ${gameState.seasonGoal.wins}).</span>`;
        epilogue = "GM Harris ushered in a new era of environmental consciousness for the Eagles, a commendable feat. However, the on-field results were disappointing. The challenge ahead is to marry this progressive vision with consistent victories.";
    } else {
        resultTitle = "A Difficult Season";
        overallResultMessage = `<span class="result-negative">It was a tough season. The team failed to meet its wins target (${gameState.seasonWins} vs ${gameState.seasonGoal.wins}) and also fell short of the Green Rating goal (${gameState.greenRating}% vs ${gameState.seasonGoal.greenRatingMin}%).</span>`;
        epilogue = "Challenges abounded for GM Harris in his first season. Neither on-field success nor off-field targets were met, leading to a period of reflection for the Eagles organisation. Lessons must be learned to build a stronger future.";
    }

    epilogue += `\n\nYour final reputation stands as: `;
    epilogue += gameState.gmReputation.progTrad < 33 ? "Strongly Progressive, " : gameState.gmReputation.progTrad > 66 ? "Staunchly Traditionalist, " : "Moderately Balanced (Prog/Trad), ";
    epilogue += gameState.gmReputation.ecoFiscal < 33 ? "a dedicated Eco-Advocate." : gameState.gmReputation.ecoFiscal > 66 ? "a firm Fiscal Prioritiser." : "pragmatic on Eco/Fiscal matters.";

    screenArea.innerHTML = `
        <div class="end-season-summary">
            <h2>${resultTitle}</h2>
            <p class="result">Final Record: ${gameState.seasonWins} Wins - ${gameState.seasonLosses} Losses</p>
            <p class="result">Final Green Rating: ${gameState.greenRating}% (Goal: ${gameState.seasonGoal.greenRatingMin}%)</p>
            <div class="result">${overallResultMessage}</div>
            <div class="epilogue">
                <h3>Epilogue:</h3>
                <p>${epilogue.replace(/\n/g, "<br>")}</p>
            </div>
            <button id="play-again-button" class="primary-action">Play Again? (New Game)</button>
        </div>`;
    const playAgainButton = document.getElementById('play-again-button');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            playAudio('sfx_button_click');
            localStorage.removeItem('epgSaveData'); 
            initGame(true);
        });
    }
    gameState.isGameOver = true; 
}

function renderTutorialStep() {
    const tutorialPopup = document.getElementById('tutorial-popup');
    const tutorialTextEl = document.getElementById('tutorial-text');

    if (!tutorialPopup || !tutorialTextEl) {
        // console.warn("Tutorial UI elements not found. Tutorial will not display.");
        return; // Exit if essential tutorial UI is missing
    }

    if (gameState.isGameOver) {
        tutorialPopup.style.display = 'none';
        return;
    }
    const currentStep = TUTORIAL_STEPS[gameState.tutorialStep];
    if (currentStep && currentStep.screen === gameState.currentScreen) {
        if (currentStep.condition && !currentStep.condition(gameState)) {
            tutorialPopup.style.display = 'none';
            return;
        }
        const elementToHighlight = currentStep.elementSelector ? document.querySelector(currentStep.elementSelector) : null;
        tutorialTextEl.textContent = currentStep.text;
        tutorialPopup.style.display = 'block';
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

        if (elementToHighlight) {
            elementToHighlight.classList.add('tutorial-highlight');
            // scrollIntoView can sometimes be problematic if the element isn't fully ready or styled.
            // For simplicity, ensure the highlighted element is visible.
            // Consider more robust scrolling if issues persist.
            try {
                 elementToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            } catch (e) {
                console.warn("ScrollIntoView failed for tutorial highlight:", e);
                // Fallback or no scroll
            }
        }
    } else {
        tutorialPopup.style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    }
}

window.navigateTo = function(screen) {
    playAudio('sfx_button_click');
    gameState.currentScreen = screen;
    // Finalize scouting intel if navigating away from an active scouting session
    if (screen !== 'scouting' && (currentScoutingSession.round > 0 && currentScoutingSession.round < currentScoutingSession.maxRounds)) {
        if (currentScoutingSession.intelEarnedThisSession !== 0) { // Only add if something was earned/lost
            let bonusIntel = 0;
            if (gameState.jakeHarrisSkills.designersInsight && currentScoutingSession.intelEarnedThisSession > 0) {
                bonusIntel = Math.floor(currentScoutingSession.intelEarnedThisSession * 0.05);
            }
            gameState.scoutingIntel += currentScoutingSession.intelEarnedThisSession + bonusIntel;
            showNotification(`Scouting session ended. Intel change: ${currentScoutingSession.intelEarnedThisSession}${bonusIntel > 0 ? ` (+${bonusIntel} bonus)` : ''}. Total Intel: ${gameState.scoutingIntel}.`, false, 4000, 'top');
            // Update budget after finalizing intel from scouting session
            updateBudgetBasedOnIntel();
        }
        // Reset scouting session state
        currentScoutingSession = { round: 0, namesOnScreen: [], correctRingerThisRound: null, intelEarnedThisSession: 0, maxRounds: 5 };
    }
    renderCurrentScreen();
};

function advanceWeek() {
    playAudio('sfx_button_click');
    if (gameState.isGameOver) { window.navigateTo('endSeason'); return; }

    if (gameState.currentWeek === 0 && gameState.eaglesRoster.length < MINIMUM_ROSTER_SIZE) {
        showNotification(`Cannot start season. Roster needs at least ${MINIMUM_ROSTER_SIZE} players. You have ${gameState.eaglesRoster.length}.`, true);
        return;
    }

    // Reset temporary game modifiers at the start of the week
    gameState.temporaryGameModifiers = { offence: 0, defence: 0 };

    if (gameState.weeklyTrainingFocus) {
        let trainingFeedbackText = `Training: '${gameState.weeklyTrainingFocus}' concluded. `;
        let effectApplied = false;

        if (gameState.weeklyTrainingFocus === "Offensive Drills") {
            gameState.temporaryGameModifiers.offence += 5; // Temporary boost for next game
            trainingFeedbackText += "Offensive performance boosted for the next game."; effectApplied = true;
        } else if (gameState.weeklyTrainingFocus === "Defensive Schemes") {
            gameState.temporaryGameModifiers.defence += 5; // Temporary boost for next game
            trainingFeedbackText += "Defensive performance boosted for the next game."; effectApplied = true;
        } else if (gameState.weeklyTrainingFocus === "Philosophical Alignment Workshop") {
            gameState.eaglesRoster.forEach(player => player.morale = Math.round(Math.min(100, player.morale + 2))); // Permanent morale boost
            trainingFeedbackText += "Team morale boosted."; effectApplied = true;
        } else if (gameState.weeklyTrainingFocus === "Rest and Recovery") {
            // Could add a small morale/loyalty boost or reduced injury chance here in future
            trainingFeedbackText += "Team is well-rested."; effectApplied = true;
        }

        if (!effectApplied) {
             trainingFeedbackText += "No specific game modifier applied from focus.";
        }

        showNotification(trainingFeedbackText, false, 3500, 'bottom');
        gameState.weeklyTrainingFocus = null; // Reset training focus after applying effects
    }

    // Apply Eco-Political State Modifiers (applied every week before game)
    // Green Rating: Affects home games (assuming home game every other week for simplicity or check schedule)
    const isHomeGame = gameState.currentOpponentIndex % 2 === 0; // Simplified check
    if (isHomeGame) {
        const greenModifier = (gameState.greenRating - 50) / 20; // -2.5 to +2.5 based on green rating
        gameState.temporaryGameModifiers.offence += greenModifier;
        gameState.temporaryGameModifiers.defence += greenModifier;
        if (greenModifier > 0) logToGameSim(`Home crowd boost from Green Rating! (+${greenModifier.toFixed(1)} strength)`, false, 'bottom');
        if (greenModifier < 0) logToGameSim(`Home crowd penalty from low Green Rating! (${greenModifier.toFixed(1)} strength)`, false, 'bottom');
    }

    // GM Reputation: Affects team morale/loyalty slightly or provides adaptability
    const progTradModifier = (gameState.gmReputation.progTrad - 50) / -25; // +2 for Prog (0), -2 for Trad (100)
    const ecoFiscalModifier = (gameState.gmReputation.ecoFiscal - 50) / 25; // -2 for Eco (0), +2 for Fiscal (100)

    // Example: Progressive GM helps morale, Traditionalist hurts it slightly
    gameState.eaglesRoster.forEach(player => {
         player.morale = Math.round(Math.max(0, Math.min(100, player.morale + progTradModifier * 0.5))); // Small morale shift
         // Could add effects based on Eco/Fiscal reputation here too, e.g., Eco GM boosts Egalitarian loyalty
    });
    if (progTradModifier > 0) logToGameSim(`Progressive GM style boosts team morale slightly.`, false, 'bottom');
    if (progTradModifier < 0) logToGameSim(`Traditionalist GM style slightly impacts team morale.`, false, 'bottom');


    gameState.currentWeek++;
    gameState.eaglesRoster.forEach(p => p.weeksWithTeam++);

    // --- Player Progression/Regression ---
    gameState.eaglesRoster.forEach(player => {
        let changeChance = 0.10; // Base 10% chance of skill change per week

        // Age influence
        if (player.age < 24) { // Younger players more likely to improve
            changeChance += 0.05;
        } else if (player.age > 30) { // Older players more likely to regress
            changeChance -= 0.05;
        }

        // Skill level influence
        if (player.skills.offence > 80 || player.skills.defence > 80) { // Harder to improve high skills
             changeChance -= 0.03;
        }
        if (player.skills.offence < 30 || player.skills.defence < 30) { // Harder to regress low skills
             changeChance -= 0.03;
        }


        // Training focus influence
        if (gameState.weeklyTrainingFocus === "Offensive Drills" && (player.position === "QB" || player.position === "WR" || player.position === "RB" || player.position === "TE" || player.position.includes("L") || player.position === "C" || player.position === "G" || player.position === "T")) {
            changeChance += 0.05; // Increased chance to improve offensive skill
        } else if (gameState.weeklyTrainingFocus === "Defensive Schemes" && (player.position === "DE" || player.position === "DT" || player.position === "LB" || player.position === "CB" || player.position === "S")) {
            changeChance += 0.05; // Increased chance to improve defensive skill
        }

        // Clamp change chance
        changeChance = Math.max(0.02, Math.min(0.20, changeChance)); // Min 2%, Max 20%

        if (Math.random() < changeChance) {
            const skillToChange = Math.random() < 0.5 ? 'offence' : 'defence';
            const changeAmount = Math.random() < 0.5 ? 1 : -1; // Change by +/- 1

            player.skills[skillToChange] = Math.max(0, Math.min(100, player.skills[skillToChange] + changeAmount));
            // Optional: Add a log message for skill changes
            // console.log(`${player.name} skill (${skillToChange}) changed by ${changeAmount}. New skill: ${player.skills[skillToChange]}`);
        }
    });
    // --- End Player Progression/Regression ---


    if (gameState.currentWeek > 16) { window.navigateTo('endSeason'); return; }

    const triggeredScenario = checkForTriggeredScenario();
    if (triggeredScenario) {
        window.currentScenarioObject = triggeredScenario;
        window.navigateTo('scenario');
    } else {
        if (gameState.currentWeek >= 1 && gameState.currentWeek <= 16) { 
            if (gameState.currentOpponentIndex < gameState.gameSchedule.length) {
                window.navigateTo('gameDayPrep');
            } else { 
                showNotification("All scheduled games played for the season!", false, 3000, 'top');
                window.navigateTo('gmOffice'); 
            }
        } else { 
            window.navigateTo('gmOffice');
        }
    }
}

function checkForTriggeredScenario() {
    for (const scenario of SCENARIOS_MVP) {
        if (gameState.completedScenarios.includes(scenario.id)) continue;
        let conditionMet = false;
        if (scenario.triggerWeek && scenario.triggerWeek === gameState.currentWeek) {
            conditionMet = true;
        } else if (scenario.triggerCondition && typeof scenario.triggerCondition === 'function') {
            try {
                // Pass a deep copy of gameState to prevent accidental modification by the condition function.
                // JSON.parse(JSON.stringify()) is a common way for deep cloning simple objects.
                if (scenario.triggerCondition(JSON.parse(JSON.stringify(gameState)))) {
                    conditionMet = true;
                }
            } catch (e) {
                console.error(`Error in triggerCondition for scenario ${scenario.id}:`, e);
                // Potentially skip this scenario or handle the error as appropriate
            }
        }
        if (conditionMet) return scenario;
    }
    return null;
}

function handleScenarioChoice(scenarioObject, chosenOutcomeObject) {
    playAudio('sfx_button_click');
    let dynamicPlayerData = null;
    if (scenarioObject.dynamicPlayerTargeted) {
        // Find the player based on the scenario's specific logic (e.g., first matching player)
        // This part of the logic was a bit ambiguous in the original, relying on scenario ID includes.
        // A more robust way would be for the scenario definition itself to specify how to find the player.
        // For now, keeping the original intent:
        let playerFilter = (p) => false;
        if (scenarioObject.id.includes("IND01")) playerFilter = p => p.philosophy === "Individualist" && p.morale < 60;
        else if (scenarioObject.id.includes("EGA01")) playerFilter = p => p.philosophy === "Egalitarian" && p.weeksWithTeam > 3;
        else if (scenarioObject.id.includes("TRA01")) playerFilter = p => p.philosophy === "Traditionalist" && p.loyalty < 70;
        
        dynamicPlayerData = gameState.eaglesRoster.find(playerFilter);
        if (!dynamicPlayerData && scenarioObject.dynamicPlayerTargeted) {
            console.warn(`Scenario ${scenarioObject.id} is dynamic but no matching player found. Outcome might not apply as expected.`);
        }
    }


    applyChoiceOutcome(scenarioObject, chosenOutcomeObject, dynamicPlayerData); // Pass the found player
    gameState.completedScenarios.push(scenarioObject.id);

    let feedbackText = typeof chosenOutcomeObject.textFeedback === 'function'
        ? chosenOutcomeObject.textFeedback(dynamicPlayerData) // Pass player data to feedback function
        : chosenOutcomeObject.textFeedback;

    const scenarioFeedbackEl = document.getElementById('scenario-feedback');
    const scenarioContinueButtonEl = document.getElementById('scenario-continue-button');

    if (scenarioFeedbackEl) {
        scenarioFeedbackEl.innerHTML = `<p>${feedbackText}</p>`;
        scenarioFeedbackEl.style.display = 'block';
    }
    if (scenarioContinueButtonEl) {
        scenarioContinueButtonEl.style.display = 'block';
        // No need to re-add listener if it's already set in renderScenarioScreen
    }
}


function applyChoiceOutcome(scenario, outcome, dynamicPlayerData) {
    let targetPlayer = null;
    if (scenario.dynamicPlayerTargeted && dynamicPlayerData) {
        // Ensure we are affecting the actual player object in the gameState.eaglesRoster
        targetPlayer = gameState.eaglesRoster.find(p => p.id === dynamicPlayerData.id);
        if (!targetPlayer) {
            console.warn("Dynamic player target specified but not found in roster for outcome application.");
        }
    }
    
    if (outcome.greenRatingChange) gameState.greenRating = Math.max(0, Math.min(100, gameState.greenRating + outcome.greenRatingChange));
    if (outcome.gmReputation) {
        if (typeof outcome.gmReputation.progTrad === 'number') gameState.gmReputation.progTrad = Math.max(0, Math.min(100, gameState.gmReputation.progTrad + outcome.gmReputation.progTrad));
        if (typeof outcome.gmReputation.ecoFiscal === 'number') gameState.gmReputation.ecoFiscal = Math.max(0, Math.min(100, gameState.gmReputation.ecoFiscal + outcome.gmReputation.ecoFiscal));
    }
    if (typeof outcome.scoutingIntel === 'number') gameState.scoutingIntel += outcome.scoutingIntel;

    // Player-specific effects for dynamically targeted scenarios
    if (targetPlayer) {
        if (outcome.playerLoyaltyChange && outcome.playerLoyaltyChange.forPlayerNameDynamic && typeof outcome.playerLoyaltyChange.change === 'number') {
            targetPlayer.loyalty = Math.max(0, Math.min(100, targetPlayer.loyalty + outcome.playerLoyaltyChange.change));
        }
        if (outcome.playerMoraleChange && outcome.playerMoraleChange.forPlayerNameDynamic && typeof outcome.playerMoraleChange.change === 'number') {
            targetPlayer.morale = Math.round(Math.max(0, Math.min(100, targetPlayer.morale + outcome.playerMoraleChange.change)));
        }
    }

    // Team-wide morale/loyalty changes
    if (typeof outcome.teamMoraleChange === 'number') {
        gameState.eaglesRoster.forEach(p => p.morale = Math.round(Math.max(0, Math.min(100, p.morale + outcome.teamMoraleChange))));
    }
    if (outcome.playerLoyaltyChange && typeof outcome.playerLoyaltyChange.teamImpact === 'number') {
        gameState.eaglesRoster.forEach(p => {
            if (p !== targetPlayer) { // Avoid double-dipping if a player was already targeted dynamically
                p.loyalty = Math.max(0, Math.min(100, p.loyalty + outcome.playerLoyaltyChange.teamImpact));
            }
        });
    }
    
    // Handling for SCN002-like specific player changes (non-dynamic but targeted)
    // This section was a bit complex. If SCN002 implies a specific player (e.g., "the star player"),
    // that player needs to be identified. For now, this original logic is kept but might need refinement
    // if SCN002 is meant to target a *specific* player instance rather than a type.
    if (outcome.playerLoyaltyChange && typeof outcome.playerLoyaltyChange.forPlayer === 'number' && !scenario.dynamicPlayerTargeted) {
        // This implies affecting a specific player mentioned in SCN002, but SCN002 doesn't identify one.
        // This might be a legacy or future feature. For now, it might not apply if no player is found.
        // Example: Find the "star player" if one is designated.
        // const starPlayer = gameState.eaglesRoster.find(p => p.isStar); // if such a flag exists
        // if (starPlayer) starPlayer.loyalty = Math.max(0, Math.min(100, starPlayer.loyalty + outcome.playerLoyaltyChange.forPlayer));
    }
     if (outcome.playerMoraleChange && typeof outcome.playerMoraleChange.forPlayer === 'number' && !scenario.dynamicPlayerTargeted) {
        // Similar to above for morale
    }


    if (outcome.unlockCodexEntry && codexEntries[outcome.unlockCodexEntry] && !codexEntries[outcome.unlockCodexEntry].unlocked) {
        codexEntries[outcome.unlockCodexEntry].unlocked = true;
        showNotification(`Codex Unlocked: ${codexEntries[outcome.unlockCodexEntry].title}`, false, 4000, 'bottom');
    }
    updateHeaderInfo(); 
}


/**
 * Calculates the average overall strength of a team based on their roster.
 * @param {Array<object>} roster - An array of player objects.
 * @returns {number} The average overall strength (0-100).
 */
function calculateTeamStrength(roster) {
    if (!roster || roster.length === 0) {
        return 40; // Base strength for an empty or invalid roster
    }

    let totalStrength = 0;
    roster.forEach(player => {
        // Simple average of offensive, defensive, and special teams ratings
        const playerOverall = (player.skills.offence + player.skills.defence + (player.skills.specialTeams || 50)) / 3;
        totalStrength += playerOverall;
    });

    const averageStrength = totalStrength / roster.length;
    return Math.max(10, Math.min(100, averageStrength)); // Clamp between 10 and 100
}


async function simulateGameInstance() {
    gameState.gameLog = [];
    const opponent = gameState.gameSchedule[gameState.currentOpponentIndex];
    if (!opponent) {
        showNotification("Error: Opponent data missing for current week.", true);
        window.navigateTo('gmOffice');
        return;
    }

    logToGameSim(`Game Started: Philadelphia Eagles vs ${opponent.opponentName}`, true);
    logToGameSim(`Eagles Strategy: Offense - ${gameState.playerStrategies.offensive}, Defense - ${gameState.playerStrategies.defensive}`);

    if (window.gameVisualizer && window.gameVisualizer.ctx) {
        window.gameVisualizer.setScore(0, 0, 1); 
        // Initialize game situation for visualizer
        window.gameVisualizer.updateGameSituation(1, 10, 3, 3); 
    }
    let eaglesScore = 0;
    let opponentScore = 0;
    let currentDown = 1;
    let yardsToGo = 10;
    let ballOnYardLine = 50; // 50 yard line (midfield) for Eagles, 50 for opponent (their side)
    let eaglesTimeoutsLeft = 3;
    let opponentTimeoutsLeft = 3;

    let previousPlayResultOutcome = null;
    let previousPlayTypeOutcome = null;
    let previousDetailedPlayTypeOutcome = null;

    // Calculate team strengths based on rostered players' actual ratings
    let eaglesOffenceRatingSum = 0;
    let eaglesDefenceRatingSum = 0;
    let eaglesSpecialTeamsRatingSum = 0;
    gameState.eaglesRoster.forEach(player => {
        eaglesOffenceRatingSum += player.skills.offence;
        eaglesDefenceRatingSum += player.skills.defence;
        eaglesSpecialTeamsRatingSum += player.skills.specialTeams;
    });

    const totalPlayers = gameState.eaglesRoster.length;
    let eaglesAvgOffStrength = totalPlayers > 0 ? eaglesOffenceRatingSum / totalPlayers : 40;
    let eaglesAvgDefStrength = totalPlayers > 0 ? eaglesDefenceRatingSum / totalPlayers : 40;
    let eaglesAvgSTStrength = totalPlayers > 0 ? eaglesSpecialTeamsRatingSum / totalPlayers : 40; // Consider ST in simulation

    eaglesAvgOffStrength = Math.max(30, eaglesAvgOffStrength); // Floor strength
    eaglesAvgDefStrength = Math.max(30, eaglesAvgDefStrength);
    eaglesAvgSTStrength = Math.max(30, eaglesAvgSTStrength);

    // Apply temporary game modifiers from training, eco-political state, etc.
    eaglesAvgOffStrength += gameState.temporaryGameModifiers.offence;
    eaglesAvgDefStrength += gameState.temporaryGameModifiers.defence;

    // Log temporary modifiers if any
    if (gameState.temporaryGameModifiers.offence !== 0 || gameState.temporaryGameModifiers.defence !== 0) {
        logToGameSim(`Temporary Game Modifiers: Offence ${gameState.temporaryGameModifiers.offence >= 0 ? '+' : ''}${gameState.temporaryGameModifiers.offence.toFixed(1)}, Defence ${gameState.temporaryGameModifiers.defence >= 0 ? '+' : ''}${gameState.temporaryGameModifiers.defence.toFixed(1)}`, false, 'bottom');
    }

    // Initialize strategy-based modifiers
    let interceptionRiskModifier = 1.0; // 1.0 is normal risk
    let fumbleRiskModifier = 1.0;
    let yardVarianceMultiplier = 1.0; // 1.0 is normal variance
    let specificTdChanceBonus = 0;
    let specificYardBonus = 0;


    // Calculate Philosophical Harmony (existing logic)
    let philosophyCounts = { "Individualist": 0, "Egalitarian": 0, "Traditionalist": 0, "Neutral": 0 };
    gameState.eaglesRoster.forEach(player => {
        if (philosophyCounts.hasOwnProperty(player.philosophy)) {
            philosophyCounts[player.philosophy]++;
        } else {
            philosophyCounts["Neutral"]++; // Default to Neutral if philosophy is somehow missing
        }
    });

    let harmonyScore = 100; // Start with perfect harmony

    if (totalPlayers > 0) {
        const idealCount = totalPlayers / Object.keys(philosophyCounts).length;
        let imbalancePenalty = 0;
        for (const phil in philosophyCounts) {
            imbalancePenalty += Math.pow(philosophyCounts[phil] - idealCount, 2);
        }
        harmonyScore -= Math.sqrt(imbalancePenalty) * 5;

        const clashPenalty = Math.min(philosophyCounts["Individualist"], philosophyCounts["Traditionalist"]) * 8;
        harmonyScore -= clashPenalty;

        const egalitarianBonus = philosophyCounts["Egalitarian"] * 2;
        harmonyScore += egalitarianBonus;
    }

    harmonyScore = Math.max(0, Math.min(100, harmonyScore));

    logToGameSim(`Team Philosophical Harmony: ${Math.round(harmonyScore)}/100`);

    // Apply harmony modifier to team strengths
    const harmonyModifier = (harmonyScore - 50) / 20;
    eaglesAvgOffStrength += harmonyModifier;
    eaglesAvgDefStrength += harmonyModifier;


    // Apply strategy modifiers to average strengths
    let currentDriveEaglesOffStrength = eaglesAvgOffStrength;
    let currentDriveEaglesDefStrength = eaglesAvgDefStrength;

    switch(gameState.playerStrategies.offensive) {
        case "aggressive_pass": 
            currentDriveEaglesOffStrength = Math.min(100, currentDriveEaglesOffStrength + 10); 
            currentDriveEaglesDefStrength = Math.max(20, currentDriveEaglesDefStrength -3); 
            interceptionRiskModifier = 1.6; 
            yardVarianceMultiplier = 1.4; 
            specificTdChanceBonus += 0.02; 
            break;
        case "conservative_run": 
            currentDriveEaglesOffStrength = Math.max(20, currentDriveEaglesOffStrength - 4); 
            currentDriveEaglesDefStrength = Math.min(100, currentDriveEaglesDefStrength +2); 
            fumbleRiskModifier = 0.7; 
            yardVarianceMultiplier = 0.6; 
            break;
        case "exploit_matchups": 
            currentDriveEaglesOffStrength = Math.min(100, currentDriveEaglesOffStrength + (gameState.jakeHarrisSkills.designersInsight ? 6:4)); 
            // Potentially add logic here if a specific opponent weakness is identified
            break;
    }
    switch(gameState.playerStrategies.defensive) {
        case "blitz_heavy": 
            currentDriveEaglesDefStrength = Math.min(100, currentDriveEaglesDefStrength + 10); 
            currentDriveEaglesOffStrength = Math.max(20, currentDriveEaglesOffStrength -2); 
            // Blitzing might leave defense vulnerable to big plays if it doesn't get home
            // This could be modeled by increasing opponent's yardVarianceMultiplier if blitz fails
            break;
        case "bend_dont_break": 
            currentDriveEaglesDefStrength = Math.max(20, currentDriveEaglesDefStrength - 4); 
            // Higher chance to prevent TDs in red zone, but might give up more yards between 20s
            break;
        case "shutdown_star": 
            currentDriveEaglesDefStrength = Math.min(100, currentDriveEaglesDefStrength + (gameState.jakeHarrisSkills.cricketersComposure ? 6:4)); 
            // Add logic to identify opponent star and reduce their effectiveness
            if (opponentRoster.some(p => (p.skills.offence > 90 || p.skills.defence > 90))) { // Check for any player with rating > 90
                logToGameSim(`Eagles focusing on shutting down ${opponent.opponentName}'s star power!`);
                opponentTeamStrength = Math.max(10, opponentTeamStrength - 5); // Reduce opponent's effective strength
            }
            break;
    }

    // Calculate opponent strength dynamically based on their roster
    const opponentRoster = gameState.allNFLTeams[opponent.opponentName] || [];
    let calculatedOpponentRosterStrength = calculateTeamStrength(opponentRoster);
    let opponentTeamStrength;

    if (opponentRoster.length > 0) {
        // Blend calculated roster strength with scheduled strength
        opponentTeamStrength = (calculatedOpponentRosterStrength * 0.7) + (opponent.strength * 0.3);
        logToGameSim(`${opponent.opponentName} Effective Team Strength (70% Roster, 30% Schedule): ${opponentTeamStrength.toFixed(1)} (Roster: ${calculatedOpponentRosterStrength.toFixed(1)}, Schedule: ${opponent.strength})`);
    } else {
        // Fallback to scheduled strength if no roster
        opponentTeamStrength = opponent.strength;
        logToGameSim(`${opponent.opponentName} Team Strength (from schedule - no roster data): ${opponentTeamStrength.toFixed(1)}`);
    }
    opponentTeamStrength = Math.max(10, Math.min(100, opponentTeamStrength)); // Clamp final strength
    gameState.unansweredOpponentPoints = 0; // Reset at the start of each game


    let currentPossessionEagles = Math.random() < 0.5; // Initial possession
    if (window.gameVisualizer && window.gameVisualizer.ctx) {
        window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
    }

    const MAX_PLAYS_PER_QUARTER = 28; // Max plays per quarter, can be tuned
    let driveActive = false; // True if a drive is currently in progress

    console.log("simulateGameInstance: Starting game loop");
    for (let q = 1; q <= 4; q++) {
        logToGameSim(`--- Quarter ${q} Begins --- Score: Eagles ${eaglesScore} - ${opponent.opponentName} ${opponentScore}`, true);
        if (window.gameVisualizer && window.gameVisualizer.ctx) {
            window.gameVisualizer.setScore(eaglesScore, opponentScore, q); // Updates score and quarter
        }
        console.log(`simulateGameInstance: Start of Quarter ${q}`);
        let playsThisQuarter = 0;
        
        // --- Halftime Adjustments Decision Point ---
        if (q === 3 && playsThisQuarter === 0) { // Check at the very start of Q3
            const halftimeContext = {
                text: `It's Halftime, GM! Score: Eagles ${eaglesScore} - ${opponent.opponentName} ${opponentScore}. What adjustments will you make?`,
                choices: [
                    { text: "Focus on Offensive Adjustments.", action: "halftime_offense" },
                    { text: "Focus on Defensive Adjustments.", action: "halftime_defense" },
                    { text: "Rally the Team - Morale Boost.", action: "halftime_rally" },
                    { text: "No major changes, stick to the plan.", action: "halftime_no_change" }
                ]
            };
            const userHalftimeChoice = await new Promise(resolveUserChoice => {
                renderDecisionPointUI(halftimeContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
            });
            logToGameSim(`GM Halftime Adjustment: ${userHalftimeChoice}`);

            if (userHalftimeChoice === "halftime_offense") {
                currentDriveEaglesOffStrength += 5; // Apply to the base for the rest of the game
                eaglesAvgOffStrength += 5; // Ensure it persists beyond current drive logic
                interceptionRiskModifier *= 0.9;
                gameState.gmReputation.progTrad = Math.max(0, gameState.gmReputation.progTrad - 2);
                logToGameSim("GM makes key offensive adjustments! Eagles offense +5 strength, reduced INT risk.", true);
            } else if (userHalftimeChoice === "halftime_defense") {
                currentDriveEaglesDefStrength += 5; // Apply to the base for the rest of the game
                eaglesAvgDefStrength += 5; // Ensure it persists
                // Conceptual: opponentTeamStrength effectively reduced for a couple of drives
                // This is hard to implement directly without more state tracking for opponent drives.
                // For now, the Eagles' defensive boost will have to suffice.
                gameState.gmReputation.progTrad = Math.min(100, gameState.gmReputation.progTrad + 2);
                logToGameSim("GM makes crucial defensive adjustments! Eagles defense +5 strength.", true);
            } else if (userHalftimeChoice === "halftime_rally") {
                gameState.eaglesRoster.forEach(p => {
                    p.morale = Math.min(100, Math.round(p.morale + 5));
                    if (p.philosophy === "Egalitarian" && Math.random() < 0.25) {
                        p.loyalty = Math.min(100, p.loyalty + 2);
                    }
                });
                logToGameSim("GM delivers a rousing halftime speech! Team morale boosted.", true);
            } else { // halftime_no_change
                logToGameSim("GM decides to stick with the current game plan for the second half.");
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause after halftime decision
        }


        // Halftime possession flip and kickoff
        if (q === 3 && playsThisQuarter === 0) { 
            currentPossessionEagles = !currentPossessionEagles; 
            driveActive = false; // New drive will start
        }
        
        let gameEndedEarly = false;

        while (playsThisQuarter < MAX_PLAYS_PER_QUARTER && !gameEndedEarly) {
            let playResultForAnim = "Play"; 
            let playTypeForAnim = "Offensive Play"; 
            let detailedPlayTypeForAnim = "Offensive Play";

            if (!driveActive) {
                currentDown = 1;
                yardsToGo = 10;
                // Simplified starting field position: 25-yard line after kickoff/score.
                // This will be refined later for punts/turnovers.
                ballOnYardLine = currentPossessionEagles ? 25 : 75; // Eagles' 25 or Opponent's 25 (from Eagles' perspective)
                driveActive = true;
                
                if (window.gameVisualizer && window.gameVisualizer.ctx) {
                    window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent'); // Ensure possession is set for new drive
                    window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                }
                // Determine yard line string based on whose perspective
                let yardLineStr;
                if (currentPossessionEagles) { // Eagles have the ball
                    yardLineStr = ballOnYardLine <= 50 ? `their own ${ballOnYardLine}` : `the opponent's ${100 - ballOnYardLine}`;
                } else { // Opponent has the ball
                    yardLineStr = ballOnYardLine >= 50 ? `their own ${100 - ballOnYardLine}` : `the Eagles' ${ballOnYardLine}`;
                }
                logToGameSim(`${currentPossessionEagles ? "Eagles" : opponent.opponentName} start drive at ${yardLineStr} yard line. ${window.gameVisualizer.getOrdinal(currentDown)} & ${yardsToGo}.`);
            } else {
                 // Update visualizer for ongoing drive if needed (already done by animatePlay's redraws)
                 if (window.gameVisualizer && window.gameVisualizer.ctx) {
                    window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                 }
            }
            
            console.log(`simulateGameInstance: Simulating play ${playsThisQuarter + 1} in Q${q}, Down: ${currentDown}, YardsToGo: ${yardsToGo}, BallOn: ${ballOnYardLine} (Eagles perspective)`);
            await new Promise(resolve => setTimeout(resolve, 600)); 

            let tempOffStrengthMod = 0;
            let tempDefStrengthMod = 0;
            specificYardBonus = 0; 

            const playersOnDrive = gameState.eaglesRoster.sort(() => Math.random() - 0.5).slice(0, Math.min(totalPlayers, 3));

            if (currentPossessionEagles) {
                logToGameSim("Eagles possession...");
                gameState.unansweredOpponentPoints = 0; // Eagles have the ball, so reset opponent's unanswered streak

                // --- New Momentum Swing Decision Point ---
                if (gameState.unansweredOpponentPoints >= 10 && q < 4 && eaglesTimeoutsLeft > 0 && Math.random() < 0.33) { // 33% chance if conditions met
                    const momentumDecisionContext = {
                        text: `The opponent has scored ${gameState.unansweredOpponentPoints} unanswered points! The momentum is shifting. How do you respond, GM?`,
                        choices: [
                            { text: "Call a timeout, rally the troops. (Cost: 1 Timeout)", action: "momentum_rally_timeout" },
                            { text: "Stick to the game plan, trust the process.", action: "momentum_stick_plan" },
                            { text: "Make a bold offensive shift (e.g., Hurry-up).", action: "momentum_bold_shift_offense" },
                            { text: "Make a bold defensive shift (e.g., Aggressive Prevent).", action: "momentum_bold_shift_defense" }
                        ]
                    };
                    const userMomentumChoice = await new Promise(resolveUserChoice => {
                        renderDecisionPointUI(momentumDecisionContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
                    });
                    logToGameSim(`GM Momentum Call: ${userMomentumChoice}`);
                    if (userMomentumChoice === "momentum_rally_timeout") {
                        if (eaglesTimeoutsLeft > 0) {
                            eaglesTimeoutsLeft--;
                            tempOffStrengthMod += 4; tempDefStrengthMod += 4; // Temp boost for next drive (applies if possession flips back or for current D)
                            gameState.eaglesRoster.forEach(p => p.morale = Math.min(100, p.morale + 3));
                            logToGameSim("Timeout called! Team morale boosted. Offensive and Defensive focus sharpened for the next series.");
                            if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                        } else {
                            logToGameSim("Tried to call timeout, but none left!");
                        }
                    } else if (userMomentumChoice === "momentum_stick_plan") {
                        if (Math.random() < 0.5) {
                            gameState.eaglesRoster.forEach(p => {
                                if (p.philosophy === "Traditionalist" || p.philosophy === "Neutral") p.loyalty = Math.min(100, p.loyalty + 2);
                            });
                            logToGameSim("The team trusts the process. Some players appreciate the calm leadership.");
                        } else {
                            gameState.eaglesRoster.forEach(p => {
                                if (p.philosophy === "Individualist" || p.philosophy === "Egalitarian") p.morale = Math.max(0, p.morale - 3);
                            });
                            logToGameSim("Players seem frustrated by the lack of adjustment. Morale dips for some.");
                        }
                    } else if (userMomentumChoice === "momentum_bold_shift_offense") {
                        gameState.temporaryGameModifiers.offence += 6; // Lasts for this drive
                        interceptionRiskModifier *= 1.4; 
                        fumbleRiskModifier *= 1.2;
                        gameState.gmReputation.progTrad = Math.max(0, gameState.gmReputation.progTrad - 3);
                        logToGameSim("GM signals a bold offensive shift to a fast-paced attack! Higher risk, potential for quick scores.");
                    } else if (userMomentumChoice === "momentum_bold_shift_defense") {
                        // This decision makes more sense if it's *before* an opponent's drive,
                        // but for now, we'll apply it as a general defensive posture change for the Eagles.
                        gameState.temporaryGameModifiers.defence += 6; // Lasts for next opponent drive
                        // opponentYardVarianceMultiplier *= 0.8; // This variable doesn't exist, conceptual
                        gameState.gmReputation.progTrad = Math.max(0, gameState.gmReputation.progTrad + 2);
                        logToGameSim("GM signals a bold defensive shift to prevent big plays! This will apply on the next defensive series.");
                    }
                    // Reset for this decision point, so it doesn't trigger again immediately unless opponent scores more
                    // gameState.unansweredOpponentPoints = 0; // Or perhaps reduce it, not fully reset? For now, let's not reset here.
                }
                
                // --- Potentially Trigger "Challenge Referee Call" Decision Point ---
                // This should ideally be after a play result is determined but before the next play starts.
                // For simplicity, let's check after the main decision points but before calculating effective strength for the current play.
                // This means a challenge would apply to the *previous* play's outcome, which is complex to model perfectly here.
                // We'll simulate it as a chance to gain an advantage *before* the current play.

                let challengeablePlayOccurredThisDrive = false; // Flag to see if a challengeable situation happened in this drive segment.
                                                              // This is a simplification. Ideally, it's per-play.

                // Placeholder: Assume some plays might be challengeable (e.g., after a turnover, or a close 4th down stop)
                // We'll set this flag true randomly for now if it's not a scoring play or obvious end of possession.
                // Use previous play's outcome for challenge decision
                if (previousDetailedPlayTypeOutcome && !previousDetailedPlayTypeOutcome.includes("TD") && !previousDetailedPlayTypeOutcome.includes("FG") && currentDown > 1 && Math.random() < 0.2) {
                    challengeablePlayOccurredThisDrive = true;
                }

                if (challengeablePlayOccurredThisDrive && gameState.eaglesChallengesLeft > 0 && Math.random() < 0.20) { // 20% chance if conditions met
                    const challengeDecisionContext = {
                        text: `A controversial call was made on the previous play (${previousDetailedPlayTypeOutcome || 'Unknown Play'})! Do you want to challenge the ruling on the field? (Challenges left: ${gameState.eaglesChallengesLeft})`,
                        choices: [
                            { text: "Throw the Challenge Flag!", action: "challenge_call" },
                            { text: "Accept the call, save the challenge.", action: "accept_call" }
                        ]
                    };
                    const userChallengeChoice = await new Promise(resolveUserChoice => {
                        renderDecisionPointUI(challengeDecisionContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
                    });
                    logToGameSim(`GM Challenge Decision: ${userChallengeChoice}`);

                    if (userChallengeChoice === "challenge_call") {
                        gameState.eaglesChallengesLeft--;
                        logToGameSim("Eagles are challenging the call on the field!");
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate review time

                        let challengeSuccessRate = 0.40; // Base 40% success
                        if (gameState.jakeHarrisSkills.designersInsight) {
                            challengeSuccessRate += 0.10; // Designer's Insight helps spot good challenges
                            logToGameSim("Designer's Insight gives a better read on the challenge!");
                        }

                        if (Math.random() < challengeSuccessRate) {
                            logToGameSim("CHALLENGE SUCCESSFUL! The ruling is overturned in favor of the Eagles!", true);
                            // Simulate a positive outcome - e.g., gain yards, first down, or reverse a turnover
                            // This is a simplification. True reversal is complex.
                            if (Math.random() < 0.5 && !currentPossessionEagles) { // If opponent had ball, simulate turnover reversal
                                logToGameSim("The previous turnover is reversed! Eagles ball!");
                                currentPossessionEagles = true;
                                ballOnYardLine = Math.min(95, ballOnYardLine + 10); // Favorable spot
                                currentDown = 1; yardsToGo = 10;
                            } else { // Simulate a favorable spot or first down
                                logToGameSim("The play is overturned, resulting in a first down for the Eagles!");
                                ballOnYardLine = Math.min(95, ballOnYardLine + Math.floor(Math.random() * 10) + 5);
                                currentDown = 1; yardsToGo = 10;
                            }
                        } else {
                            logToGameSim("CHALLENGE UNSUCCESSFUL. The ruling on the field stands. Eagles lose a timeout.", true);
                            if (eaglesTimeoutsLeft > 0) {
                                eaglesTimeoutsLeft--;
                                if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                            } else {
                                logToGameSim("No timeouts left to lose from the failed challenge.");
                            }
                        }
                    } else { // accept_call
                        logToGameSim("GM decides not to challenge the call.");
                    }
                }


                // Decision Point (existing logic)
                // Red Zone Decision Point
                if (currentPossessionEagles && ballOnYardLine >= 80 && ballOnYardLine < 100 && Math.random() < 0.25) { // Eagles in Red Zone (opponent's 1 to 20 yard line)
                    const decisionContext = {
                        text: `Red Zone Opportunity! Ball on the opponent's ${100 - ballOnYardLine}-yard line. What's the call to punch it in?`,
                        choices: [
                            { text: "Power Run - try to muscle it in.", action: "redzone_power_run" },
                            { text: "Safe Pass - look for an open receiver.", action: "redzone_safe_pass" },
                            { text: "Play Action / Trick Play - catch them off guard!", action: "redzone_trick_play", meta: { requiresComposure: true } }
                        ]
                    };
                    console.log(`simulateGameInstance: Entering Red Zone decision point in Q${q}`);
                    const userChoice = await new Promise(resolveUserChoice => {
                        renderDecisionPointUI(decisionContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
                    });
                    console.log(`simulateGameInstance: Red Zone decision resolved with choice: ${userChoice}`);
                    logToGameSim(`GM Red Zone Call: ${userChoice}`);
                    if (userChoice === "redzone_power_run") tempOffStrengthMod += 5; // Increased from +4
                    else if (userChoice === "redzone_safe_pass") tempOffStrengthMod += 3; // Increased from +2
                    else if (userChoice === "redzone_trick_play") {
                        if (gameState.jakeHarrisSkills.cricketersComposure) {
                            logToGameSim("Cricketer's Composure helps execute the trick play!");
                            tempOffStrengthMod += 9; // Increased from +7
                            yardVarianceMultiplier *= 1.3; // Increased from 1.2
                        } else {
                            logToGameSim("Trick play without full composure... very risky!");
                            tempOffStrengthMod += 2; // Decreased from +3
                            interceptionRiskModifier *= 1.5; // Increased from 1.3
                            fumbleRiskModifier *= 1.2; // Added fumble risk
                        }
                    }
                } else if (Math.random() < 0.20 && q >= 2 && (eaglesScore < opponentScore || Math.abs(eaglesScore - opponentScore) <= 7) ) { // Existing decision point
                    const decisionContext = {
                        text: `Key moment! It's ${Math.random() < 0.5 ? '3rd' : '4th'} and ${Math.floor(Math.random()*6)+2} yards to go. The game is close. What's the call, GM?`,
                        choices: [
                            { text: "Conservative play (run/short pass).", action: "conservative_play" },
                            { text: "Go for it aggressively!", action: "aggressive_play" },
                            { text: "Rely on a star player's instinct.", action: "star_instinct", meta: { requiresComposure: true } }
                        ]
                    };
                    console.log(`simulateGameInstance: Entering decision point in Q${q}`);
                    const userChoice = await new Promise(resolveUserChoice => {
                        renderDecisionPointUI(decisionContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
                    });
                    console.log(`simulateGameInstance: Decision point resolved with choice: ${userChoice}`);
                    logToGameSim(`GM Call: ${userChoice}`);
                    if (userChoice === "aggressive_play") {
                        tempOffStrengthMod += 10; // Increased from +8
                        interceptionRiskModifier *= 1.1; 
                        fumbleRiskModifier *= 1.1;
                        logToGameSim("GM goes for it aggressively! Higher risk, higher reward.");
                    } else if (userChoice === "conservative_play") {
                        tempOffStrengthMod -= 3; // Changed from -5
                        logToGameSim("GM plays it safe with a conservative call.");
                    } else if (userChoice === "star_instinct") {
                        if (gameState.jakeHarrisSkills.cricketersComposure) {
                            logToGameSim("Cricketer's Composure helps the star player execute!");
                            tempOffStrengthMod += 12; // Increased from +10
                        } else {
                            logToGameSim("Star player tries, but it's a gamble without full composure!");
                            tempOffStrengthMod += 3; // Increased from +1
                            interceptionRiskModifier *= 1.2;
                            fumbleRiskModifier *= 1.15;
                        }
                    }
                }

                    let effectiveEaglesOffStrength = currentDriveEaglesOffStrength + tempOffStrengthMod;

                    // Apply individual player traits, stats, morale/loyalty impact
                    playersOnDrive.forEach(player => {
                        // Individual Stat-based "Momentum/Focus" for this play
                        let individualPlayBoost = 0;
                        if (player.skills.offence > 80 && Math.random() < 0.1) individualPlayBoost += (player.skills.offence - 80) / 5; // Max +4 for 100 skill
                        else if (player.skills.offence < 50 && Math.random() < 0.05) individualPlayBoost -= (50 - player.skills.offence) / 10; // Max -3 for 20 skill
                        effectiveEaglesOffStrength += individualPlayBoost;
                        if (individualPlayBoost > 0) logToGameSim(`✨ ${player.name} feeling sharp, gets a +${individualPlayBoost.toFixed(1)} boost this play!`);
                        if (individualPlayBoost < 0) logToGameSim(`⚠️ ${player.name} a bit off, takes a ${individualPlayBoost.toFixed(1)} hit this play.`);

                        const philosophyTemplate = PLAYER_PHILOSOPHY_TEMPLATES[player.philosophy];
                        if (!philosophyTemplate) return; // Should not happen

                        // Trait effects
                        if (player.uniqueTraitName === "Hero Ball" && Math.random() < 0.20) { 
                             logToGameSim(`⚡ ${player.name} (${philosophyTemplate.name}) with some 'Hero Ball'!`);
                             effectiveEaglesOffStrength += 12; // Increased from +10
                        } else if (player.uniqueTraitName === "Unit Cohesion" && Math.random() < 0.18) { 
                             logToGameSim(`🤝 'Unit Cohesion' from ${player.name} (${philosophyTemplate.name}) bolsters the drive!`);
                             effectiveEaglesOffStrength += 8; // Increased from +7
                             currentDriveEaglesDefStrength += 3; // Increased from +2
                        }
                        // Add Traditionalist trait effect if applicable to offense (less likely)

                        // Morale/Loyalty Impact
                        const moraleLoyaltyAvg = (player.morale + player.loyalty) / 2;
                        if (moraleLoyaltyAvg < 35 && Math.random() < 0.08) { // Lowered threshold, increased chance
                             const impact = Math.floor(Math.random() * 6) + 4; // Increased impact: 4-9
                             effectiveEaglesOffStrength = Math.max(10, effectiveEaglesOffStrength - impact);
                             logToGameSim(`🔻🔻 ${player.name} (${player.philosophy}) critically struggling (${Math.round(player.morale)} morale, ${player.loyalty} loyalty) - Major offensive mistake! (-${impact} strength)`);
                        } else if (moraleLoyaltyAvg > 80 && Math.random() < 0.07) { // Increased threshold, increased chance
                             const impact = Math.floor(Math.random() * 6) + 4; // Increased impact: 4-9
                             effectiveEaglesOffStrength = Math.min(115, effectiveEaglesOffStrength + impact); // Max strength slightly higher
                             logToGameSim(`⬆️⬆️ ${player.name} (${player.philosophy}) in the zone! (${Math.round(player.morale)} morale, ${player.loyalty} loyalty) - Significant offensive boost! (+${impact} strength)`);
                        }

                        // Incorporate realStatsSummary (example: influence specific play types)
                        if (player.realStatsSummary && Math.random() < 0.12) { 
                            const summary = player.realStatsSummary.toLowerCase();
                            logToGameSim(`Player Narrative: ${player.name} - ${player.realStatsSummary}`); // Log the narrative

                            if (player.position === "QB") {
                                if (summary.includes("passing yards") || summary.includes("touchdowns") || summary.includes("deep threat")) {
                                    logToGameSim(`✨ ${player.name} (QB) looking to air it out!`);
                                    effectiveEaglesOffStrength += 5; // Increased bonus
                                    specificTdChanceBonus += 0.02; // Increased bonus
                                    yardVarianceMultiplier *= 1.15; // Slight increase in variance for big play potential
                                }
                                if (summary.includes("accurate") || summary.includes("composure")) {
                                    logToGameSim(`🎯 ${player.name} (QB) with a composed, accurate read!`);
                                    interceptionRiskModifier *= 0.80; // Further reduce interception risk
                                    effectiveEaglesOffStrength += 2;
                                }
                            } else if (player.position === "RB") {
                                if (summary.includes("rushing yards") || summary.includes("versatile threat")) {
                                    logToGameSim(`💨 ${player.name} (RB) finding a seam!`);
                                    specificYardBonus += Math.floor(Math.random() * 6) + 3; // Increased bonus
                                    effectiveEaglesOffStrength += 3;
                                }
                                if (summary.includes("powerful runner")) {
                                    logToGameSim(`💪 ${player.name} (RB) breaking a tackle!`);
                                    specificYardBonus += Math.floor(Math.random() * 4) + 2; // Increased bonus: 2-5 yards
                                    fumbleRiskModifier *= 1.03; // Slightly adjusted fumble risk
                                }
                            } else if (player.position === "WR" || player.position === "TE") {
                                if (summary.includes("receiving yards") || summary.includes("deep threat") || summary.includes("highlight reel")) {
                                    logToGameSim(`🙌 ${player.name} (${player.position}) making a key reception!`);
                                    effectiveEaglesOffStrength += 4; // Increased bonus
                                    specificYardBonus += Math.floor(Math.random() * 8) + 4; // Increased bonus
                                    specificTdChanceBonus += 0.015;
                                }
                                 if (summary.includes("reliable hands") || summary.includes("contested catch")) {
                                    logToGameSim(`🖐️ ${player.name} (${player.position}) with a secure catch!`);
                                    fumbleRiskModifier *= 0.85; // Further reduce fumble risk
                                    effectiveEaglesOffStrength += 1;
                                }
                            }
                        }
                    });

                    effectiveEaglesOffStrength = Math.max(10, Math.min(110, effectiveEaglesOffStrength)); 

                    // Score chance calculation based on effective strengths (Revised Aggressive Formula)
                    let scoreChance = (effectiveEaglesOffStrength - (opponentTeamStrength * 0.65) + (Math.random() * 15)) / 68; // Adjusted strength multiplier from 0.75 to 0.65
                    scoreChance += specificTdChanceBonus; // Add bonus from realStats or strategy
                    // Add direct score chance mod from realStatsSummary if applicable (example)
                    playersOnDrive.forEach(player => {
                        if (player.realStatsSummary && player.realStatsSummary.toLowerCase().includes("clutch performer") && Math.random() < 0.15) { // Example keyword
                            logToGameSim(`✨ ${player.name} showing clutch ability!`);
                            scoreChance += 0.02; // Small direct bonus to scoreChance
                        }
                    });


                    let playYards = 0;
                    let playResultForAnim = "Play"; 
                    let playTypeForAnim = "Offensive Play"; 
                    let detailedPlayTypeForAnim = "Offensive Play";

                    if (scoreChance > 0.55) { // TD threshold lowered from 0.58
                        logToGameSim("Touchdown Eagles!", true); eaglesScore += 7; gameState.unansweredOpponentPoints = 0; playYards = currentPossessionEagles ? (100 - ballOnYardLine) : ballOnYardLine;
                        detailedPlayTypeForAnim = playYards > 20 ? "Touchdown! (Long Bomb)" : "Touchdown! (Goal Line Punch)";
                        playTypeForAnim = "Touchdown!"; // Keep for older logic if any, or simplify later
                        playResultForAnim = "TD";
                        if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.setScore(eaglesScore, opponentScore, q);
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                        // ballOnYardLine will be set at the start of the new drive
                    } else if (scoreChance > 0.40 && ballOnYardLine > 65) { // FG Attempt threshold lowered from 0.45
                        detailedPlayTypeForAnim = `Field Goal Attempt (${100 - ballOnYardLine + 17} yds)`; // Approx FG distance
                        playTypeForAnim = "Field Goal Attempt";
                        playYards = 0; 
                        // FG success now also slightly influenced by a key ST player's rating (e.g., Kicker)
                        const kicker = gameState.eaglesRoster.find(p => p.position === "K");
                        const kickerFactor = kicker ? Math.max(0.8, Math.min(1.2, kicker.skills.specialTeams / 70)) : 1.0; // 70 ST is baseline
                        const fgSuccessChance = ((eaglesAvgSTStrength / 100) * 0.90 + 0.05) * kickerFactor;
                        if (Math.random() < fgSuccessChance) {
                            logToGameSim("Eagles Field Goal is GOOD!", true); eaglesScore += 3; gameState.unansweredOpponentPoints = 0;
                            playResultForAnim = "FG_GOOD";
                            detailedPlayTypeForAnim = `FG GOOD! (${100 - ballOnYardLine + 17} yds)`;
                        } else {
                            logToGameSim("Eagles Field Goal is NO GOOD!", true);
                            playResultForAnim = "FG_NO_GOOD";
                            detailedPlayTypeForAnim = `FG NO GOOD (${100 - ballOnYardLine + 17} yds)`;
                        }
                        if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.setScore(eaglesScore, opponentScore, q);
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                    } else if (scoreChance < (0.18 * interceptionRiskModifier * fumbleRiskModifier) ) { // Turnover base chance increased from 0.15
                        logToGameSim("Turnover! Opponent ball.", true); playYards = Math.floor(Math.random() * 5); // Small yardage for return/spot
                        detailedPlayTypeForAnim = Math.random() < 0.5 ? "FUMBLE! Eagles Lose Ball" : "INTERCEPTION! Eagles Throw Pick";
                        playTypeForAnim = detailedPlayTypeForAnim; 
                        playResultForAnim = "Turnover";
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                        // ballOnYardLine for opponent's new drive will be set based on this turnover spot (simplified next)
                    } else { // Regular play, no score or turnover
                        playYards = Math.floor(Math.random() * 25) - 4; // Range: -4 to 20 yards (base increased slightly)
                        playYards = Math.floor(playYards * yardVarianceMultiplier); // Apply variance
                        playYards += specificYardBonus; // Add bonus from realStats
                        let isBigPlay = false;

                        // Big play chance more tied to strength, and bigger potential gain
                        if (playYards > 4 && Math.random() < (effectiveEaglesOffStrength / 110)) { // Denominator slightly increased for scaling
                            playYards += Math.floor(Math.random() * 40) + 15; // Enhanced big play logic (15 to 54 yards bonus)
                            isBigPlay = true;
                        }

                        ballOnYardLine += playYards;
                        yardsToGo -= playYards;
                        detailedPlayTypeForAnim = playYards > 15 ? "Long Pass Complete!" : (playYards > 7 ? "Nice Gain!" : (playYards >= 0 ? "Short Gain." : "Loss of Yards."));
                        if (isBigPlay) detailedPlayTypeForAnim = `BIG PLAY! ${detailedPlayTypeForAnim}`;
                        playTypeForAnim = detailedPlayTypeForAnim; // Keep generic one updated too
                        playResultForAnim = `${playYards} yd gain`;

                        if (yardsToGo <= 0) {
                            logToGameSim(`Eagles get a First Down! Gain of ${playYards} yards. Ball on opponent's ${100-ballOnYardLine}.`);
                            currentDown = 1; 
                            yardsToGo = 10;
                            detailedPlayTypeForAnim = `First Down! (${detailedPlayTypeForAnim})`;
                            playTypeForAnim = detailedPlayTypeForAnim;
                        } else {
                            currentDown++;
                            logToGameSim(`Eagles gain ${playYards} yards. ${window.gameVisualizer.getOrdinal(currentDown)} & ${yardsToGo}. Ball on opponent's ${100-ballOnYardLine}.`);
                        }

                        if (currentDown > 4) {
                            logToGameSim("Turnover on downs! Opponent ball.");
                            detailedPlayTypeForAnim = "Turnover on Downs (Eagles)";
                            playTypeForAnim = detailedPlayTypeForAnim;
                            playResultForAnim = "Turnover";
                            currentPossessionEagles = !currentPossessionEagles; // Possession changes
                            driveActive = false; // End of drive
                        } else if (ballOnYardLine >= 60 && currentDown === 4 && yardsToGo > 3) { 
                            logToGameSim("Eagles punt."); 
                            playYards = 30 + Math.floor(Math.random() * 15); // Punt distance
                            detailedPlayTypeForAnim = "Eagles Punt";
                            playTypeForAnim = detailedPlayTypeForAnim;
                            playResultForAnim = "Punt";
                            // ballOnYardLine += playYards; // This was incorrect for punt logic
                            currentPossessionEagles = !currentPossessionEagles; // Possession changes
                            driveActive = false; // End of drive
                            // ballOnYardLine for opponent's new drive will be set based on punt result (simplified next)
                            playYards = 0; // Reset playYards for animation if it's just a punt event
                        }
                    }
                    if (window.gameVisualizer && window.gameVisualizer.ctx) {
                        window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                        await window.gameVisualizer.animatePlay({ yards: playYards, result: playResultForAnim, playType: playTypeForAnim, detailedPlayType: detailedPlayTypeForAnim });
                        window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
                    }
                    // Store results of this play for potential challenge on the *next* play
                    previousPlayResultOutcome = playResultForAnim;
                    previousPlayTypeOutcome = playTypeForAnim;
                    previousDetailedPlayTypeOutcome = detailedPlayTypeForAnim;

                } else { // Opponent possession
                    logToGameSim(`${opponent.opponentName} possession...`);
                    let effectiveOpponentStrength = opponentTeamStrength; 
                    let effectiveEaglesDefStrength = currentDriveEaglesDefStrength + tempDefStrengthMod;
                    specificYardBonus = 0; // Reset for opponent drive

                    // Simulate a few key opponent players' impact (conceptual)
                    const opponentKeyPlayerCount = Math.min(opponentRoster.length, 3);
                    for(let i=0; i < opponentKeyPlayerCount; i++) {
                        const oppPlayer = opponentRoster[Math.floor(Math.random() * opponentRoster.length)];
                        if (oppPlayer) {
                            let individualOppPlayBoost = 0;
                            if (oppPlayer.skills.offence > 80 && Math.random() < 0.1) individualOppPlayBoost += (oppPlayer.skills.offence - 80) / 5;
                            else if (oppPlayer.skills.offence < 50 && Math.random() < 0.05) individualOppPlayBoost -= (50 - oppPlayer.skills.offence) / 10;
                            effectiveOpponentStrength += individualOppPlayBoost;
                            // Could log opponent player boosts if desired for debugging, but not to player
                        }
                    }


                    // Apply individual player traits and morale/loyalty impact on defense
                     playersOnDrive.forEach(player => { // These are Eagles players on defense
                        // Individual Stat-based "Momentum/Focus" for this play (defense)
                        let individualDefensiveBoost = 0;
                        if (player.skills.defence > 80 && Math.random() < 0.1) individualDefensiveBoost += (player.skills.defence - 80) / 5;
                        else if (player.skills.defence < 50 && Math.random() < 0.05) individualDefensiveBoost -= (50 - player.skills.defence) / 10;
                        effectiveEaglesDefStrength += individualDefensiveBoost;
                        if(individualDefensiveBoost > 0) logToGameSim(`🛡️ ${player.name} locks in on defense! +${individualDefensiveBoost.toFixed(1)} boost!`);
                        if(individualDefensiveBoost < 0) logToGameSim(`⚠️ ${player.name} caught off guard on D! ${individualDefensiveBoost.toFixed(1)} hit.`);


                        const philosophyTemplate = PLAYER_PHILOSOPHY_TEMPLATES[player.philosophy];
                        if (!philosophyTemplate) return;

                        // Trait effects
                        if (player.uniqueTraitName === "Stay the Course" && Math.random() < 0.20) { 
                            logToGameSim(`🛡️ ${player.name} (${philosophyTemplate.name}) with 'Stay the Course' disrupts the opponent!`);
                            effectiveOpponentStrength -= 12; // Increased from -10
                        } else if (player.uniqueTraitName === "Unit Cohesion" && Math.random() < 0.18) { 
                             // Unit Cohesion on defense could manifest as better team tackling or coverage adjustments
                             logToGameSim(`🛡️ Defensive 'Unit Cohesion' from ${player.name} (${philosophyTemplate.name}) solidifies the Eagles' D!`);
                             effectiveEaglesDefStrength += 6; // Increased from +5
                             effectiveOpponentStrength -= 5; // Increased from -4
                        }
                        
                        // Morale/Loyalty Impact (negative impact on defense)
                        const moraleLoyaltyAvg = (player.morale + player.loyalty) / 2;
                        if (moraleLoyaltyAvg < 35 && Math.random() < 0.08) { // Lowered threshold, increased chance
                             const impact = Math.floor(Math.random() * 6) + 4; // Increased impact: 4-9
                             effectiveEaglesDefStrength = Math.max(10, effectiveEaglesDefStrength - impact);
                             logToGameSim(`🔻🔻 ${player.name} (${player.philosophy}) critically struggling (${Math.round(player.morale)} morale, ${player.loyalty} loyalty) - Major defensive lapse! (-${impact} strength)`);
                        } else if (moraleLoyaltyAvg > 80 && Math.random() < 0.07) { // Increased threshold, increased chance
                             const impact = Math.floor(Math.random() * 6) + 4; // Increased impact: 4-9
                             effectiveEaglesDefStrength = Math.min(115, effectiveEaglesDefStrength + impact); // Max strength slightly higher
                             logToGameSim(`⬆️⬆️ ${player.name} (${player.philosophy}) playing lights out on D! (${Math.round(player.morale)} morale, ${player.loyalty} loyalty) - Significant defensive boost! (+${impact} strength)`);
                        }

                        // Incorporate realStatsSummary for defensive players
                        if (player.realStatsSummary && Math.random() < 0.12) { 
                            const summary = player.realStatsSummary.toLowerCase();
                            logToGameSim(`Player Narrative (Defense): ${player.name} - ${player.realStatsSummary}`); // Log the narrative

                            if (player.position === "DE" || player.position === "DT" || player.position === "LB") {
                                if (summary.includes("sacks") || summary.includes("disruptive") || summary.includes("pass rusher") || summary.includes("shutdown")) {
                                    logToGameSim(`💥 ${player.name} (${player.position}) generating significant pressure or shutting down the play!`);
                                    effectiveOpponentStrength -= 7; // Increased malus
                                    opponentScoreChance *= 0.88; // Reduce opponent score chance
                                }
                            } else if (player.position === "CB" || player.position === "S") {
                                if (summary.includes("interceptions") || summary.includes("shutdown") || summary.includes("tight coverage")) {
                                    logToGameSim(`🔒 ${player.name} (${player.position}) with blanket coverage or turnover threat!`);
                                    effectiveOpponentStrength -= 6; // Increased malus
                                    opponentScoreChance *= 0.82; // Reduce opponent score chance
                                }
                            }
                        }
                    });

                    effectiveOpponentStrength = Math.max(10, Math.min(110, effectiveOpponentStrength));
                    effectiveEaglesDefStrength = Math.max(10, Math.min(110, effectiveEaglesDefStrength));

                    let opponentScoreChance = (effectiveOpponentStrength - (effectiveEaglesDefStrength * 0.65) + (Math.random() * 15)) / 68; // Adjusted strength multiplier from 0.75 to 0.65
                    let playYardsOpp = 0;
                    let playResultForAnimOpp = "Play";
                    let playTypeForAnimOpp = "Opponent Offensive Play";
                    let detailedPlayTypeForAnimOpp = "Opponent Offensive Play";

                    if (opponentScoreChance > 0.57) { // Opponent TD threshold lowered from 0.60
                        logToGameSim(`Touchdown ${opponent.opponentName}.`, true); opponentScore += 7; gameState.unansweredOpponentPoints += 7; playYardsOpp = currentPossessionEagles ? ballOnYardLine : (100-ballOnYardLine); 
                        detailedPlayTypeForAnimOpp = playYardsOpp > 20 ? `TD ${opponent.opponentName}! (Long Bomb)` : `TD ${opponent.opponentName}! (Short Score)`;
                        playTypeForAnimOpp = "Touchdown!";
                        playResultForAnimOpp = "TD";
                        if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.setScore(eaglesScore, opponentScore, q);
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                    } else if (opponentScoreChance > 0.42 && ballOnYardLine < 35) { // Opponent FG Attempt threshold lowered from 0.45
                        detailedPlayTypeForAnimOpp = `Opponent FG Attempt (${ballOnYardLine + 17} yds)`;
                        playTypeForAnimOpp = "Field Goal Attempt";
                        playYardsOpp = 0;
                        
                        let fgSuccessChanceOppModifier = 1.0;
                        // --- "Ice the Kicker" Decision Point ---
                        const isCrucialKick = (q >= 4 && Math.abs(eaglesScore - (opponentScore + 3)) <= 3) || (q >= 3 && Math.abs(eaglesScore - (opponentScore + 3)) <= 0);
                        if (isCrucialKick && eaglesTimeoutsLeft > 0 && Math.random() < 0.40) { // 40% chance in crucial situations
                            const iceKickerContext = {
                                text: `Crucial Field Goal attempt by ${opponent.opponentName}! Do you call a timeout to ice the kicker? (Timeouts left: ${eaglesTimeoutsLeft})`,
                                choices: [
                                    { text: "Yes, ice the kicker! (Cost: 1 Timeout)", action: "ice_kicker_yes" },
                                    { text: "No, let them kick.", action: "ice_kicker_no" }
                                ]
                            };
                            const userIceChoice = await new Promise(resolveUserChoice => {
                                renderDecisionPointUI(iceKickerContext, q, `PHI ${eaglesScore}-${opponent.opponentName.substring(0,3).toUpperCase()} ${opponentScore}`, resolveUserChoice);
                            });
                            logToGameSim(`GM Ice Kicker Decision: ${userIceChoice}`);
                            if (userIceChoice === "ice_kicker_yes") {
                                if (eaglesTimeoutsLeft > 0) {
                                    eaglesTimeoutsLeft--;
                                    logToGameSim("Timeout called by the Eagles to ice the kicker!", true);
                                    fgSuccessChanceOppModifier = 0.88; // 12% reduction in kicker's success chance
                                    if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                                    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate timeout duration
                                } else {
                                    logToGameSim("Wanted to ice kicker, but no timeouts left!");
                                }
                            } else {
                                logToGameSim("GM decides not to ice the kicker.");
                            }
                        }

                        // Calculate opponent's ST strength (assuming a kicker exists or default)
                        const opponentKicker = gameState.allNFLTeams[opponent.opponentName]?.find(p => p.position === "K");
                        const opponentAvgSTStrength = opponentKicker ? opponentKicker.skills.specialTeams : 50; // Default if no kicker
                        const fgSuccessChanceOpp = ((opponentAvgSTStrength / 100) * 0.90 + 0.05) * fgSuccessChanceOppModifier; // Apply ice modifier
                        if (Math.random() < fgSuccessChanceOpp) {
                            logToGameSim(`${opponent.opponentName} Field Goal is GOOD!`, true); opponentScore += 3; gameState.unansweredOpponentPoints += 3;
                            playResultForAnimOpp = "FG_GOOD";
                            detailedPlayTypeForAnimOpp = `Opponent FG GOOD! (${ballOnYardLine + 17} yds)`;
                        } else {
                            logToGameSim(`${opponent.opponentName} Field Goal is NO GOOD!`, true);
                            playResultForAnimOpp = "FG_NO_GOOD";
                            detailedPlayTypeForAnimOpp = `Opponent FG NO GOOD (${ballOnYardLine + 17} yds)`;
                        }
                        if (window.gameVisualizer && window.gameVisualizer.ctx) window.gameVisualizer.setScore(eaglesScore, opponentScore, q);
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                    } else if (opponentScoreChance < 0.20) { // Eagles force turnover, base chance increased from 0.18
                        logToGameSim("Eagles force a turnover!", true); playYardsOpp = Math.floor(Math.random() * 5); // Small yardage for return/spot
                        detailedPlayTypeForAnimOpp = Math.random() < 0.5 ? "FUMBLE! Eagles Recover!" : "INTERCEPTION! Eagles Pick it Off!";
                        playTypeForAnimOpp = detailedPlayTypeForAnimOpp;
                        playResultForAnimOpp = "Turnover";
                        currentPossessionEagles = !currentPossessionEagles; // Possession changes
                        driveActive = false; // End of drive
                    } else { // Regular opponent play
                        playYardsOpp = Math.floor(Math.random() * 25) - 4; // Range: -4 to 20 yards (base increased slightly)
                        let isOppBigPlay = false;
                        // Opponent big play logic (using effectiveOpponentStrength)
                        // Big play chance more tied to strength, and bigger potential gain
                        if (playYardsOpp > 4 && Math.random() < (effectiveOpponentStrength / 110)) { // Denominator slightly increased for scaling
                            playYardsOpp += Math.floor(Math.random() * 40) + 15; // Enhanced big play logic (15 to 54 yards bonus)
                            isOppBigPlay = true;
                        }

                        ballOnYardLine -= playYardsOpp; 
                        yardsToGo -= playYardsOpp;
                        detailedPlayTypeForAnimOpp = playYardsOpp > 15 ? "Opponent Long Gain!" : (playYardsOpp > 7 ? "Opponent Nice Gain!" : (playYardsOpp >=0 ? "Opponent Short Gain." : "Opponent Loss of Yards."));
                        if(isOppBigPlay) detailedPlayTypeForAnimOpp = `OPP BIG PLAY! ${detailedPlayTypeForAnimOpp}`;
                        playTypeForAnimOpp = detailedPlayTypeForAnimOpp;
                        playResultForAnimOpp = `${playYardsOpp} yd gain`;

                        if (yardsToGo <= 0) {
                            logToGameSim(`${opponent.opponentName} gets a First Down! Gain of ${playYardsOpp} yards. Ball on Eagles' ${ballOnYardLine}.`);
                            currentDown = 1; yardsToGo = 10;
                            detailedPlayTypeForAnimOpp = `Opponent First Down! (${detailedPlayTypeForAnimOpp})`;
                            playTypeForAnimOpp = detailedPlayTypeForAnimOpp;
                        } else {
                            currentDown++;
                            logToGameSim(`${opponent.opponentName} gains ${playYardsOpp} yards. ${window.gameVisualizer.getOrdinal(currentDown)} & ${yardsToGo}. Ball on Eagles' ${ballOnYardLine}.`);
                        }
                        if (currentDown > 4) {
                            logToGameSim("Eagles force Turnover on Downs!");
                            detailedPlayTypeForAnimOpp = "Turnover on Downs (Opponent)";
                            playTypeForAnimOpp = detailedPlayTypeForAnimOpp;
                            playResultForAnimOpp = "Turnover";
                            currentPossessionEagles = !currentPossessionEagles; // Possession changes
                            driveActive = false; // End of drive
                        } else if (ballOnYardLine <= 40 && currentDown === 4 && yardsToGo > 3) { 
                            logToGameSim(`${opponent.opponentName} punts.`); 
                            playYardsOpp = 30 + Math.floor(Math.random() * 15); // Punt distance
                            detailedPlayTypeForAnimOpp = "Opponent Punt";
                            playTypeForAnimOpp = detailedPlayTypeForAnimOpp;
                            playResultForAnimOpp = "Punt";
                            // ballOnYardLine -= playYardsOpp; // Incorrect for punt
                            currentPossessionEagles = !currentPossessionEagles; // Possession changes
                            driveActive = false; // End of drive
                            playYardsOpp = 0; // Reset for animation if just a punt event
                        }
                    }
                    if (window.gameVisualizer && window.gameVisualizer.ctx) {
                        window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                        await window.gameVisualizer.animatePlay({ yards: playYardsOpp, result: playResultForAnimOpp, playType: playTypeForAnimOpp, detailedPlayType: detailedPlayTypeForAnimOpp });
                        window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
                    }
                    // Store results of this play for potential challenge on the *next* play
                    previousPlayResultOutcome = playResultForAnimOpp;
                    previousPlayTypeOutcome = playTypeForAnimOpp;
                    previousDetailedPlayTypeOutcome = detailedPlayTypeForAnimOpp;
                }
                if (window.gameVisualizer && window.gameVisualizer.ctx) { 
                    window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, eaglesTimeoutsLeft, opponentTimeoutsLeft);
                }
                
                // End of play logic
                playsThisQuarter++;

                if (playsThisQuarter >= MAX_PLAYS_PER_QUARTER && q < 4) {
                    logToGameSim(`--- End of Quarter ${q} ---`);
                }

                // Blowout rule check
                if (q >= 3 && playsThisQuarter > 5 && Math.abs(eaglesScore - opponentScore) > 28) { // Check after a few plays in Q3/Q4
                    logToGameSim("Game result has become clear, fast-forwarding to the end...");
                    gameEndedEarly = true; 
                }
            } // End of while loop for plays in a quarter
            if (gameEndedEarly) break; // Break from quarter loop if game ended early
        } // End of for loop for quarters

        console.log("simulateGameInstance: Game simulation loop finished.");
        await new Promise(resolve => setTimeout(resolve, 800)); // Final pause before showing result screen
        console.log("simulateGameInstance: Final pause finished.");

        logToGameSim(`--- FINAL SCORE --- Eagles ${eaglesScore} - ${opponent.opponentName} ${opponentScore}`, true);
    const win = eaglesScore > opponentScore;
    let moraleChangeText = "";
    if (win) {
        gameState.seasonWins++;
        logToGameSim("EAGLES WIN!", true);
        // Morale boost adjusted based on philosophy and win margin
        gameState.eaglesRoster.forEach(p => {
            const moraleImpact = PLAYER_PHILOSOPHY_TEMPLATES[p.philosophy]?.baseStatModifiers.moraleImpact || 0;
            const winMarginBonus = Math.abs(eaglesScore - opponentScore) > 10 ? 2 : 0;
            p.morale = Math.round(Math.min(100, p.morale + (5 + moraleImpact + winMarginBonus)));
        });
        moraleChangeText = "Team morale significantly boosted by the win!";
    } else if (eaglesScore < opponentScore) {
        gameState.seasonLosses++;
        logToGameSim("Eagles lose.", true);
         // Morale hit adjusted based on philosophy and loss margin
        gameState.eaglesRoster.forEach(p => {
             const moraleImpact = PLAYER_PHILOSOPHY_TEMPLATES[p.philosophy]?.baseStatModifiers.moraleImpact || 0;
             const lossMarginPenalty = Math.abs(eaglesScore - opponentScore) > 10 ? 2 : 0;
             p.morale = Math.round(Math.max(0, p.morale - (5 - moraleImpact + lossMarginPenalty)));
        });
        moraleChangeText = "Team morale took a hit after the loss.";
    } else {
        logToGameSim("It's a TIE!", true);
         // Morale change for a tie adjusted based on philosophy
        gameState.eaglesRoster.forEach(p => {
             const moraleImpact = PLAYER_PHILOSOPHY_TEMPLATES[p.philosophy]?.baseStatModifiers.moraleImpact || 0;
             p.morale = Math.round(Math.max(0, Math.min(100, p.morale + moraleImpact))); // Small shift based on philosophy
        });
        moraleChangeText = "A hard-fought tie. Mixed feelings in the locker room.";
    }

    gameState.currentOpponentIndex++;
    const finishEarlyButton = document.getElementById('finish-game-early');
    if (finishEarlyButton) {
        finishEarlyButton.style.display = 'block';
        finishEarlyButton.onclick = () => {
            renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
        };
        setTimeout(() => {
            if (gameState.currentScreen === 'gameDaySim') {
                renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
            }
        }, 7000);
    } else {
        renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
    }
}


function showNotification(message, isError = false, duration = 3000, position = 'top') {
    const notificationDiv = document.createElement('div');
    notificationDiv.textContent = message;
    let baseStyle = "position:fixed; left:50%; transform:translateX(-50%); padding:12px 22px; border-radius:6px; z-index:1005; box-shadow: 0 3px 15px rgba(0,0,0,0.2); font-size: 1.05em; transition: opacity 0.5s ease, top 0.5s ease, bottom 0.5s ease; opacity: 0;"; // Start with opacity 0
    
    let colorStyle = isError ? "background-color:#D32F2F; color:white;" : "background-color:#004C54; color:white;";
    let positionStyle = position === 'top' ? 'top: -60px;' : 'bottom: -60px;'; // Start off-screen

    notificationDiv.style.cssText = baseStyle + colorStyle + positionStyle;
    document.body.appendChild(notificationDiv);

    setTimeout(() => { // Animate into view
        notificationDiv.style.opacity = '1';
        if (position === 'top') notificationDiv.style.top = '20px';
        else notificationDiv.style.bottom = '20px';
    }, 100); // Short delay to allow element to be in DOM for transition

    setTimeout(() => { // Animate out
        notificationDiv.style.opacity = '0';
        if (position === 'top') notificationDiv.style.top = '-60px';
        else notificationDiv.style.bottom = '-60px';
        setTimeout(() => { notificationDiv.remove(); }, 500); // Remove from DOM after transition
    }, duration);
}


/**
 * Updates the team budget based on the current scoutingIntel value.
 * The budget is a base amount modified by a percentage based on Intel.
 */
function updateBudgetBasedOnIntel() {
    const baseBudget = 300000000; // Define the base budget
    // Calculate modifier: 0% at 150 Intel, -50% at 0 Intel, +50% at 300+ Intel
    const intelModifierPercentage = Math.max(-0.5, Math.min(0.5, (gameState.scoutingIntel - 150) / 150 * 0.5));
    gameState.teamBudget = Math.max(0, Math.floor(baseBudget * (1 + intelModifierPercentage))); // Ensure budget doesn't go below 0
    console.log(`Budget updated based on Intel: ${gameState.scoutingIntel}. New Budget: $${gameState.teamBudget.toLocaleString()}`);
    // Optionally update UI elements that show budget if this function is called outside of a screen render
    // updateHeaderInfo(); // The header doesn't currently show budget, but could in future
}

// --------------------
// GAME VISUALIZER OBJECT
// --------------------
window.gameVisualizer = {
    canvas: null,
    ctx: null,
    fieldColor: '#3A5F0B', // Dark green
    lineColor: '#FFFFFF',
    homeTeamColor: '#004C54', // Eagles Midnight Green (approx)
    awayTeamColor: '#C8102E', // Generic Red for opponent
    ballColor: '#A52A2A', // Brown for football
    scoreTextColor: '#FFFFFF',
    eaglesLogoImg: null,
    eaglesLogoLoaded: false,
    opponentLogoImg: null, // Placeholder for opponent logo
    opponentLogoLoaded: false, // Placeholder for opponent logo

    // Field dimensions (relative to canvas size for responsiveness)
    fieldPadding: 20,
    yardLineSpacing: 0, // Will be calculated in init
    endZoneHeight: 0, // Will be calculated in init

    // Game state for visualizer
    eaglesScore: 0,
    opponentScore: 0,
    currentQuarter: 1,
    down: 1,
    distance: 10,
    eaglesTimeouts: 3,
    opponentTimeouts: 3,
    possessingTeam: null, // 'Eagles' or 'Opponent'
    ballPosition: { x: 0, y: 0 }, // This will now be the player icon's position
    playerIconRadius: 10, // Radius for the player icon
    particles: [], // For confetti effect
    screenShakeTime: 0,
    screenShakeIntensity: 0,
    screenShakeDuration: 0,

    init: function(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.yardLineSpacing = (this.canvas.width - (2 * this.fieldPadding)) / 10; // 10 sections for 100 yards (50-0-50)
        this.endZoneHeight = this.canvas.height * 0.15; // End zones are 15% of canvas height
        this.ballPosition = { x: this.canvas.width / 2, y: this.canvas.height / 2 }; // Start ball at midfield
        
        this.eaglesLogoImg = new Image();
        this.eaglesLogoImg.onload = () => {
            this.eaglesLogoLoaded = true;
            this.drawField(); // Redraw field once logo is loaded
            this.updateScoreDisplay();
            this.drawBall(); 
            console.log("Eagles logo loaded for visualizer.");
        };
        this.eaglesLogoImg.onerror = () => {
            console.error("Failed to load Eagles logo for visualizer.");
            this.eaglesLogoLoaded = false; // Ensure it's false if error
            this.drawField(); 
            this.updateScoreDisplay();
            this.drawPlayerIconWithBall(); // Draw player icon + ball
        };
        this.eaglesLogoImg.src = 'images/eagles_logo_small.png';

        // Load Opponent Logo
        this.opponentLogoImg = new Image();
        this.opponentLogoImg.onload = () => {
            this.opponentLogoLoaded = true;
            this.drawField(); // Redraw if opponent logo loads
            this.updateScoreDisplay();
            this.drawPlayerIconWithBall();
            console.log("Opponent logo loaded for visualizer.");
        };
        this.opponentLogoImg.onerror = () => {
            console.warn("Failed to load generic opponent logo (images/opponent_logo_generic.png). Opponent end zone will not have a logo.");
            this.opponentLogoLoaded = false;
            this.drawField();
            this.updateScoreDisplay();
            this.drawPlayerIconWithBall();
        };
        // For now, using a generic opponent logo. This could be made dynamic later.
        this.opponentLogoImg.src = 'images/opponent_logo_generic.png'; 


        // Initial draw
        this.drawField();
        this.updateScoreDisplay();
        this.drawPlayerIconWithBall(); // Draw player icon + ball initially
        console.log("Game Visualizer Initialized");
    },

    clearCanvas: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    drawField: function() {
        if (!this.ctx) return;
        this.clearCanvas();

        // Background color (already set on canvas style, but can be drawn too)
        this.ctx.fillStyle = this.fieldColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = 2;

        // End Zones
        const endZoneWidth = this.yardLineSpacing * 1.5; // Approx 15 yards
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Slightly darker green for endzones
        // Left Endzone (Opponent)
        this.ctx.fillRect(this.fieldPadding, 0, endZoneWidth, this.canvas.height);
        // Right Endzone (Eagles)
        this.ctx.fillRect(this.canvas.width - this.fieldPadding - endZoneWidth, 0, endZoneWidth, this.canvas.height);

        // End Zone Text
        this.ctx.save();
        this.ctx.font = 'bold 20px Arial'; // Adjust font as needed
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Opponent End Zone Text (Left)
        const opponentNameForEndzone = gameState.gameSchedule[gameState.currentOpponentIndex]?.opponentName.toUpperCase().substring(0, 10) || 'VISITOR';
        this.ctx.fillStyle = this.awayTeamColor; // Use opponent color
        this.ctx.translate(this.fieldPadding + endZoneWidth / 2, this.canvas.height / 2);
        this.ctx.rotate(-Math.PI / 2); // Rotate text to be vertical
        this.ctx.fillText(opponentNameForEndzone, 0, 0);
        this.ctx.rotate(Math.PI / 2); // Rotate back
        this.ctx.translate(-(this.fieldPadding + endZoneWidth / 2), -(this.canvas.height / 2));
        
        // Eagles End Zone Text (Right)
        this.ctx.fillStyle = this.homeTeamColor; // Use Eagles color
        this.ctx.translate(this.canvas.width - this.fieldPadding - endZoneWidth / 2, this.canvas.height / 2);
        this.ctx.rotate(Math.PI / 2); // Rotate text to be vertical
        this.ctx.fillText("EAGLES", 0, 0);
        this.ctx.restore(); // Restore context to undo rotation and translation for other drawings

        // Yard Lines (simplified)
        for (let i = 0; i <= 10; i++) {
            const x = this.fieldPadding + (i * this.yardLineSpacing);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();

            // Yard numbers (simplified: 50, 40, 30, 20, 10, G)
            if (i > 0 && i < 10 && i % 2 === 0) { // Every 20 yards from center
                 this.ctx.fillStyle = this.lineColor;
                 this.ctx.font = '12px Arial';
                 this.ctx.textAlign = 'center';
                 const yardNumber = 50 - (Math.abs(i - 5) * 10);
                 if (yardNumber > 0) {
                    this.ctx.fillText(yardNumber.toString(), x, this.fieldPadding);
                    this.ctx.fillText(yardNumber.toString(), x, this.canvas.height - this.fieldPadding + 10);
                 } else if (i === 0 || i === 10) { // Goal Lines
                    this.ctx.fillText("G", x + (i === 0 ? 10 : -10) , this.canvas.height / 2);
                 }
            }
        }
        // Midfield Line (thicker or different color if desired)
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.lineWidth = 2;

        // Draw Eagles Logo at midfield if loaded
        if (this.eaglesLogoLoaded && this.eaglesLogoImg) {
            const logoSize = Math.min(this.canvas.width * 0.15, this.canvas.height * 0.25); // Responsive logo size
            const logoX = (this.canvas.width / 2) - (logoSize / 2);
            const logoY = (this.canvas.height / 2) - (logoSize / 2);
            this.ctx.globalAlpha = 0.5; // Make logo slightly transparent
            this.ctx.drawImage(this.eaglesLogoImg, logoX, logoY, logoSize, logoSize);
            this.ctx.globalAlpha = 1.0; // Reset alpha
        }
        
        // Draw Opponent Logo in their endzone if loaded
        if (this.opponentLogoLoaded && this.opponentLogoImg) {
            const oppLogoSize = Math.min(endZoneWidth * 0.5, this.canvas.height * 0.15); // Responsive logo size
            const oppLogoX = this.fieldPadding + (endZoneWidth / 2) - (oppLogoSize / 2);
            const oppLogoY = (this.canvas.height / 2) - (oppLogoSize / 2);
            this.ctx.globalAlpha = 0.4; // Make logo slightly transparent
            this.ctx.drawImage(this.opponentLogoImg, oppLogoX, oppLogoY, oppLogoSize, oppLogoSize);
            this.ctx.globalAlpha = 1.0; // Reset alpha
        }


        // Directional Arrows for Yard Lines (pointing towards scoring end zone for that side)
        this.ctx.fillStyle = this.lineColor;
        const arrowSize = 5;
        for (let i = 1; i < 10; i++) { // Skip 50 and goal lines for arrows
            if (i === 5) continue; // Skip 50-yard line for arrows from numbers
            const x = this.fieldPadding + (i * this.yardLineSpacing);
            const arrowY = this.fieldPadding + 25; // Position arrows below numbers
            const arrowYBottom = this.canvas.height - this.fieldPadding - 15;

            this.ctx.beginPath();
            if (i < 5) { // Left side of field, arrows point right (towards Eagles endzone)
                this.ctx.moveTo(x - arrowSize, arrowY - arrowSize);
                this.ctx.lineTo(x + arrowSize, arrowY);
                this.ctx.lineTo(x - arrowSize, arrowY + arrowSize);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.moveTo(x - arrowSize, arrowYBottom - arrowSize);
                this.ctx.lineTo(x + arrowSize, arrowYBottom);
                this.ctx.lineTo(x - arrowSize, arrowYBottom + arrowSize);
                this.ctx.closePath();
                this.ctx.fill();
            } else { // Right side of field, arrows point left (towards Opponent endzone)
                this.ctx.moveTo(x + arrowSize, arrowY - arrowSize);
                this.ctx.lineTo(x - arrowSize, arrowY);
                this.ctx.lineTo(x + arrowSize, arrowY + arrowSize);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.moveTo(x + arrowSize, arrowYBottom - arrowSize);
                this.ctx.lineTo(x - arrowSize, arrowYBottom);
                this.ctx.lineTo(x + arrowSize, arrowYBottom + arrowSize);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }


        // Hash marks (simplified)
        const hashY1 = this.canvas.height * 0.35;
        const hashY2 = this.canvas.height * 0.65;
        for (let i = 1; i < 10; i++) { // Between yard lines
            const xMid = this.fieldPadding + (i * this.yardLineSpacing) - (this.yardLineSpacing / 2);
            this.ctx.beginPath();
            this.ctx.moveTo(xMid, hashY1 - 5);
            this.ctx.lineTo(xMid, hashY1 + 5);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(xMid, hashY2 - 5);
            this.ctx.lineTo(xMid, hashY2 + 5);
            this.ctx.stroke();
        }
        this.updateScoreDisplay(); // Redraw score after field
        // Note: drawPlayerIconWithBall is called after updates or animations, not directly in drawField
    },

    updateScoreDisplay: function() {
        if (!this.ctx) return;
        const scoreBoxHeight = 60; // Increased height for more info
        const mainScoreY = 25;
        const subInfoY = 48;

        // Background for Eagles score area
        this.ctx.fillStyle = this.homeTeamColor; // Eagles color
        this.ctx.fillRect(0, 0, this.canvas.width / 3, scoreBoxHeight);

        // Background for Opponent score area
        this.ctx.fillStyle = this.awayTeamColor; // Opponent color
        this.ctx.fillRect(this.canvas.width * 2 / 3, 0, this.canvas.width / 3, scoreBoxHeight);
        
        // Background for center info area (Quarter, Down/Dist, Timeouts)
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)'; // Darker, semi-transparent
        this.ctx.fillRect(this.canvas.width / 3, 0, this.canvas.width / 3, scoreBoxHeight);


        this.ctx.fillStyle = this.scoreTextColor;
        this.ctx.font = 'bold 16px Arial';
        
        // Eagles Score
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`EAGLES: ${this.eaglesScore}`, 10, mainScoreY);
        // Eagles Timeouts (Placeholder)
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`TOL: III`, 10, subInfoY);


        // Opponent Score
        this.ctx.textAlign = 'right';
        this.ctx.font = 'bold 16px Arial';
        const opponentName = gameState.gameSchedule[gameState.currentOpponentIndex]?.opponentName.substring(0,10).toUpperCase() || 'OPP';
        this.ctx.fillText(`${opponentName}: ${this.opponentScore}`, this.canvas.width - 10, mainScoreY);
        // Opponent Timeouts (Placeholder)
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`TOL: III`, this.canvas.width - 10, subInfoY);
        
        // Center Info: Quarter, Down/Distance, Possession
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`Q${this.currentQuarter}`, this.canvas.width / 2, mainScoreY - 8); // Quarter slightly higher

        this.ctx.font = '12px Arial';
        // Down & Distance
        this.ctx.fillText(`${this.getOrdinal(this.down)} & ${this.distance}`, this.canvas.width / 2, mainScoreY + 10); 

        // Eagles Timeouts
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`TOL: ${'I'.repeat(this.eaglesTimeouts)}`, 10, subInfoY);

        // Opponent Timeouts
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`TOL: ${'I'.repeat(this.opponentTimeouts)}`, this.canvas.width - 10, subInfoY);


        if (this.possessingTeam) {
            this.ctx.font = 'italic bold 13px Arial';
            const possessionColor = this.possessingTeam === 'Eagles' ? this.homeTeamColor : this.awayTeamColor;
            // Draw a small colored box behind possession text for better visibility
            const possessionText = `${this.possessingTeam} Ball`;
            const textMetrics = this.ctx.measureText(possessionText);
            const boxPadding = 4;
            this.ctx.fillStyle = possessionColor;
            this.ctx.fillRect(
                (this.canvas.width / 2) - (textMetrics.width / 2) - boxPadding, 
                subInfoY - 13 - boxPadding, // Adjusted Y for text baseline
                textMetrics.width + (boxPadding * 2), 
                13 + (boxPadding * 2) // Height based on font size + padding
            );
            this.ctx.fillStyle = this.scoreTextColor; // Text color
            this.ctx.fillText(possessionText, this.canvas.width / 2, subInfoY);
        }
    },

    drawPlayerIcon: function(x, y, teamColor) {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.playerIconRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = teamColor;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)'; // Darker outline for icon
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.closePath();
    },

    drawBall: function(playerX, playerY) { // Ball is drawn relative to player
        if (!this.ctx) return;
        const ballRadiusX = 8; 
        const ballRadiusY = 5; 
        // Offset ball slightly in front of player icon based on direction (simplified)
        const ballOffsetX = (this.possessingTeam === 'Eagles') ? this.playerIconRadius * 0.8 : -this.playerIconRadius * 0.8;
        const ballX = playerX + ballOffsetX;
        const ballY = playerY;

        this.ctx.beginPath();
        this.ctx.ellipse(ballX, ballY, ballRadiusX, ballRadiusY, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = this.ballColor;
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.strokeStyle = this.lineColor; 
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(ballX - ballRadiusX * 0.6, ballY);
        this.ctx.lineTo(ballX + ballRadiusX * 0.6, ballY);
        this.ctx.stroke();
        const numVerticalLaces = 3;
        const laceSpacing = (ballRadiusX * 1.2) / (numVerticalLaces + 1);
        for (let i = 0; i < numVerticalLaces; i++) {
            const laceX = ballX - ballRadiusX * 0.6 + laceSpacing * (i + 0.5);
            this.ctx.beginPath();
            this.ctx.moveTo(laceX, ballY - ballRadiusY * 0.4);
            this.ctx.lineTo(laceX, ballY + ballRadiusY * 0.4);
            this.ctx.stroke();
        }
    },

    drawPlayerIconWithBall: function() {
        if (!this.ctx || !this.possessingTeam) return;
        const playerColor = this.possessingTeam === 'Eagles' ? this.homeTeamColor : this.awayTeamColor;
        this.drawPlayerIcon(this.ballPosition.x, this.ballPosition.y, playerColor);
        this.drawBall(this.ballPosition.x, this.ballPosition.y);
    },

    getOrdinal: function(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    
    // --- Methods to be called by simulateGameInstance ---
    setScore: function(eagles, opponent, quarter) {
        this.eaglesScore = eagles;
        this.opponentScore = opponent;
        this.currentQuarter = quarter;
        // Down, distance, timeouts are updated by updateGameSituation
        this.drawField(); 
        this.drawPlayerIconWithBall(); 
    },

    updateGameSituation: function(down, distance, eaglesTimeouts, opponentTimeouts) {
        this.down = down;
        this.distance = distance;
        this.eaglesTimeouts = eaglesTimeouts;
        this.opponentTimeouts = opponentTimeouts;
        this.drawField(); // Redraw to update scoreboard
        this.drawPlayerIconWithBall();
    },

    setPossession: function(team) { // team can be 'Eagles', 'Opponent', or null
        this.possessingTeam = team;
        this.drawField(); 
        this.drawPlayerIconWithBall();
    },

    animatePlay: async function(playData) { // { yards: number, result: string, playType?: string, detailedPlayType?: string }
        return new Promise(async (resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animatePlay.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            const initialPossessingTeam = this.possessingTeam; // Capture at the start
            console.log(`Visualizer: Animating play for ${initialPossessingTeam}`, playData); // Modified log

            const pixelsPerYard = this.yardLineSpacing / 10;
            let yardageSign = (initialPossessingTeam === 'Eagles') ? 1 : -1; // Use captured value
            const endZoneEntryDepth = this.yardLineSpacing * 0.5; // How far into the endzone the animation goes for a TD

            let targetX;
            if (playData.result === 'TD') {
                // Ensure the animation target is clearly within the endzone
                if (initialPossessingTeam === 'Eagles') { // Use captured value
                    targetX = this.canvas.width - this.fieldPadding - endZoneEntryDepth;
                } else { // Opponent scoring in Eagles' endzone (left side of canvas)
                    targetX = this.fieldPadding + endZoneEntryDepth;
                }
                console.error(`[ animatePlay TD ] initialPossessingTeam: ${initialPossessingTeam}, calculated targetX: ${targetX}`); 
                logToGameSim(`Visualizer: TD animation target set to ${targetX} for ${initialPossessingTeam}`); // Use captured
            } else {
                targetX = this.ballPosition.x + (playData.yards * pixelsPerYard * yardageSign);
                console.error(`[ animatePlay non-TD ] initialPossessingTeam: ${initialPossessingTeam}, calculated targetX: ${targetX}, from yards: ${playData.yards}, current ball.x: ${this.ballPosition.x}`);
            }
            
            // Clamp targetX to be within playable field boundaries, respecting player icon radius
            // The endzone target for TD is already set to be within bounds.
            if (playData.result !== 'TD') {
                targetX = Math.min(this.canvas.width - this.fieldPadding - this.playerIconRadius, Math.max(this.fieldPadding + this.playerIconRadius, targetX));
            }


            let animationStartTime = null;
            const animationDuration = 1000; 
            const startX = this.ballPosition.x;
            const displayPlayType = playData.detailedPlayType || playData.playType || (this.possessingTeam === "Eagles" ? "Eagles Play" : "Opponent Play");
            let playTypeShownTime = 0;
            const playTypeDuration = 1500; // Show play type for 1.5 seconds

            const step = async (timestamp) => {
                if (!animationStartTime) {
                    animationStartTime = timestamp;
                    playTypeShownTime = timestamp; // Start timer for play type text
                }
                const elapsedOverall = timestamp - animationStartTime;
                const animationProgress = Math.min(elapsedOverall / animationDuration, 1);

                this.ballPosition.x = startX + (targetX - startX) * animationProgress;

                this.drawField(); 
                this.drawPlayerIconWithBall(); 

                // Show Play Type Text
                if (timestamp - playTypeShownTime < playTypeDuration) {
                    this.ctx.save();
                    this.ctx.font = 'bold 22px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                    this.ctx.lineWidth = 2;
                    const textY = this.canvas.height - 35; // Positioned near bottom
                    this.ctx.strokeText(displayPlayType, this.canvas.width / 2, textY);
                    this.ctx.fillText(displayPlayType, this.canvas.width / 2, textY);
                    this.ctx.restore();
                } else if (elapsedOverall >= playTypeDuration && elapsedOverall < playTypeDuration + 100 && animationProgress < 1) {
                    // If play type duration is over but animation isn't, redraw once without it
                    // This prevents text from lingering if animation is shorter than playTypeDuration
                    this.drawField(); 
                    this.drawPlayerIconWithBall();
                }


                if (animationProgress < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.ballPosition.x = targetX; 
                    console.error(`[ animatePlay END ] Set this.ballPosition.x to targetX. ball.x: ${this.ballPosition.x}, targetX: ${targetX}`);
                    this.drawField(); // Final draw after animation, ensures play type text is cleared
                    this.drawPlayerIconWithBall();
                    console.log("Visualizer: Animation complete. Player at", this.ballPosition.x);

                    if (displayPlayType.includes("Field Goal Attempt")) { // Check based on displayPlayType
                        await this.animateFieldGoalKick(initialPossessingTeam, playData.result === "FG_GOOD"); // Pass captured
                    } else if (playData.result === 'TD') {
                        // Use initialPossessingTeam for the DEBUG log and for the call to animateScore
                        console.log("DEBUG: About to call animateScore for TD. playData.result:", playData.result, "Possessing team (captured at start of animatePlay):", initialPossessingTeam);
                        await this.animateScore(initialPossessingTeam, 'TD'); // Pass captured
                    } else if (playData.result === 'Turnover' || displayPlayType.includes("Fumble!") || displayPlayType.includes("Interception!")) {
                        this.showTurnover(displayPlayType); // Pass specific turnover type
                    }
                    // Other play results (like punt, regular down) don't need special score/turnover animation here
                    resolve(); // Resolve the main promise for animatePlay
                }
            };
            requestAnimationFrame(step);
        });
    },

    animateFieldGoalKick: async function(team, isGood) {
        return new Promise(async (resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animateFieldGoalKick.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            console.log(`Visualizer: Animating Field Goal Kick. Good: ${isGood}`);

            const uprights = {
                x: team === 'Eagles' ? this.canvas.width - this.fieldPadding - this.endZoneHeight * 0.2 : this.fieldPadding + this.endZoneHeight * 0.2, // Approx goal line
                y: this.canvas.height / 2,
                width: 10, // Width of the posts
                crossbarHeight: this.canvas.height * 0.3,
                postHeight: this.canvas.height * 0.3,
                innerWidth: 60 // Distance between posts
            };

            const ballStartX = this.ballPosition.x;
            const ballStartY = this.ballPosition.y;
            const peakHeight = this.canvas.height * 0.3; // How high the ball goes
            const targetX = uprights.x;
            
            let kickTime = 0;
            const kickDuration = 1200; // ms

            const animateKick = async (timestamp) => {
                if (!kickTime) kickTime = timestamp;
                const elapsed = timestamp - kickTime;
                const progress = Math.min(elapsed / kickDuration, 1);

                // Parabolic arc for the ball
                let currentX = ballStartX + (targetX - ballStartX) * progress;
                const arc = -4 * peakHeight * progress * (progress - 1); // Simple parabola y = -4h*x*(x-1)
                let currentY = ballStartY - arc;

                // If it's the end of the animation, adjust Y for visual success/failure
                if (progress === 1) {
                    if (isGood) {
                        // Aim for center of posts
                        currentY = uprights.y - uprights.crossbarHeight / 2; 
                    } else {
                        // Aim slightly wide or short (visually)
                        const missDirection = Math.random() < 0.5 ? -1 : 1;
                        currentY = uprights.y - uprights.crossbarHeight / 2 + (missDirection * (uprights.innerWidth / 1.5)); // Miss wide
                        if (Math.random() < 0.3) currentY = uprights.y + 20; // Or hit low
                    }
                }

                this.drawField();
                // Draw Uprights
                this.ctx.fillStyle = '#FFD700'; // Yellow for uprights
                this.ctx.fillRect(uprights.x - uprights.innerWidth / 2 - uprights.width / 2, uprights.y - uprights.postHeight / 2 - uprights.crossbarHeight, uprights.width, uprights.postHeight); // Left post
                this.ctx.fillRect(uprights.x + uprights.innerWidth / 2 - uprights.width / 2, uprights.y - uprights.postHeight / 2 - uprights.crossbarHeight, uprights.width, uprights.postHeight); // Right post
                this.ctx.fillRect(uprights.x - uprights.innerWidth / 2, uprights.y - uprights.crossbarHeight / 2 - uprights.crossbarHeight, uprights.innerWidth, uprights.width); // Crossbar
                
                // Draw ball (no player icon for FG kick)
                this.ctx.beginPath();
                this.ctx.ellipse(currentX, currentY, 8, 5, 0, 0, Math.PI * 2);
                this.ctx.fillStyle = this.ballColor;
                this.ctx.fill();
                this.ctx.closePath();


                if (progress < 1) {
                    requestAnimationFrame(animateKick);
                } else {
                    await this.animateScore(team, isGood ? 'FG_GOOD' : 'FG_NO_GOOD');
                    // Reset ball position to midfield after the kick animation sequence is done by animateScore
                    setTimeout(() => {
                        this.ballPosition.x = this.canvas.width / 2;
                        this.ballPosition.y = this.canvas.height / 2;
                    }, 1500); // Delay to allow score animation to play
                    resolve(); // Resolve the main promise for animateFieldGoalKick
                }
            };
            requestAnimationFrame(animateKick);
        });
    },

    animateScore: function(team, type) { // type: 'TD', 'FG_GOOD', 'FG_NO_GOOD'
        return new Promise((resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animateScore.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            console.log(`Visualizer: Animating ${type} for ${team}`);
            // <<< ADD DIAGNOSTIC LOG HERE >>>
            if (type === 'TD') {
                const endZoneWidth = this.yardLineSpacing * 1.5;
                const opponentEndZoneBoundary = this.fieldPadding + endZoneWidth; // Right edge of opponent's endzone (lower X values)
                const eaglesEndZoneBoundary = this.canvas.width - this.fieldPadding - endZoneWidth; // Left edge of Eagles' endzone (higher X values)
                console.log(`TD Animation: Ball at X: ${this.ballPosition.x}. Opponent Endzone (Goal line at X=${this.fieldPadding + endZoneWidth}), Eagles Endzone (Goal line at X=${this.canvas.width - this.fieldPadding - endZoneWidth})`);
            }
            let message = "EVENT!";
            if (type === 'TD') message = "TOUCHDOWN!";
            else if (type === 'FG_GOOD') message = "FIELD GOAL IS GOOD!";
            else if (type === 'FG_NO_GOOD') message = "FIELD GOAL IS NO GOOD!"; // Corrected message
            
            let animationTime = 0;
            const textDuration = 1500; 
            const logoFlashDuration = 1000;
            const confettiDuration = 2000;
            const totalDuration = textDuration + (type === 'TD' ? logoFlashDuration + confettiDuration : (type.includes('FG') ? 500 : 0 ) ); // FG text lingers a bit less

            const pulseSpeed = 500; 
            const baseFontSize = type === 'TD' ? 48 : (type.includes('FG') ? 40 : 36);
        const maxFontIncrease = type === 'TD' ? 12 : (type.includes('FG') ? 10 : 8);

        const scoringTeamLogo = (team === 'Eagles' && this.eaglesLogoLoaded) ? this.eaglesLogoImg : (this.opponentLogoLoaded ? this.opponentLogoImg : null);
        const logoInitialAlpha = 0;
        const logoMaxAlpha = 0.8;
        const logoFadeSpeed = logoFlashDuration / 2;


        const animate = (timestamp) => {
            if (!animationTime) animationTime = timestamp;
            const elapsed = timestamp - animationTime;
            
            this.ctx.save(); // Save context before potential shake
            if (this.screenShakeTime > 0) {
                const shakeProgress = (this.screenShakeDuration - this.screenShakeTime) / this.screenShakeDuration;
                const currentShake = this.screenShakeIntensity * Math.sin(shakeProgress * Math.PI * 4); // 4 oscillations
                this.ctx.translate(Math.random() * currentShake - currentShake / 2, Math.random() * currentShake - currentShake / 2);
                this.screenShakeTime -= (1000/60); // Approximate ms per frame
            }

            this.drawField(); 
            this.drawPlayerIconWithBall();   

            // Phase 1: Pulsing Text
            if (elapsed < textDuration) {
                const pulseProgress = (elapsed % pulseSpeed) / pulseSpeed; 
                const currentFontIncrease = Math.sin(pulseProgress * Math.PI) * maxFontIncrease; 
                const currentFontSize = baseFontSize + currentFontIncrease;

                this.ctx.save();
                this.ctx.font = `bold ${currentFontSize}px Impact, Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = team === 'Eagles' ? this.homeTeamColor : this.awayTeamColor;
                this.ctx.shadowColor = this.lineColor;
                this.ctx.shadowBlur = 15;
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(message, this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.restore();
            }

            // Phase 2: Team Logo Flash (for TD only)
            if (type === 'TD' && scoringTeamLogo && elapsed >= textDuration && elapsed < textDuration + logoFlashDuration) {
                const logoElapsed = elapsed - textDuration;
                let alpha;
                if (logoElapsed < logoFadeSpeed) { // Fade in
                    alpha = (logoElapsed / logoFadeSpeed) * logoMaxAlpha;
                } else { // Fade out
                    alpha = ((logoFlashDuration - logoElapsed) / logoFadeSpeed) * logoMaxAlpha;
                }
                alpha = Math.max(0, Math.min(logoMaxAlpha, alpha)); // Clamp alpha

                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                const logoSize = Math.min(this.canvas.width * 0.4, this.canvas.height * 0.5);
                const logoX = (this.canvas.width / 2) - (logoSize / 2);
                const logoY = (this.canvas.height / 2) - (logoSize / 2);
                this.ctx.drawImage(scoringTeamLogo, logoX, logoY, logoSize, logoSize);
                this.ctx.restore();
            }

            // Phase 3: Confetti (for TD only)
            if (type === 'TD' && elapsed >= textDuration + logoFlashDuration && elapsed < totalDuration) {
                if (this.particles.length === 0 && elapsed < textDuration + logoFlashDuration + 100) { 
                    this.initConfetti(team === 'Eagles' ? this.homeTeamColor : this.awayTeamColor, team === 'Eagles' ? '#A5ACAF' : '#FFFFFF'); 
                }
                this.drawConfetti();
                this.updateConfetti();
            }
            
            if (elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                if (type === 'TD') this.particles = []; // Clear confetti only if it was a TD
                this.drawField(); 
                this.drawPlayerIconWithBall(); // Ensure player icon is back if it was a FG kick
                    resolve(); // Resolve the promise when the animation is complete
            }
            this.ctx.restore(); // Restore context after potential shake
        };

        if (type === 'TD') { // Trigger shake for Touchdowns
            this.triggerScreenShake(8, 300);
        }
        requestAnimationFrame(animate);
        });
    },

    initConfetti: function(color1, color2) {
        this.particles = [];
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * -this.canvas.height, // Start off-screen from top
                size: Math.random() * 5 + 3, // Size 3 to 8
                speedY: Math.random() * 2 + 1, // Fall speed 1 to 3
                speedX: Math.random() * 2 - 1, // Horizontal drift -1 to 1
                color: Math.random() < 0.5 ? color1 : color2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1
            });
        }
    },

    drawConfetti: function() {
        if (!this.ctx) return;
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); // Draw as squares
            this.ctx.restore();
        });
    },

    updateConfetti: function() {
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            // Reset particle if it goes off screen (bottom)
            if (p.y > this.canvas.height + p.size) {
                p.y = Math.random() * -50 - p.size; // Reset to top, slightly staggered
                p.x = Math.random() * this.canvas.width;
            }
        });
        // For simplicity, we'll let them run for the confettiDuration controlled in animateScore
    },

    showTurnover: function(turnoverType = "TURNOVER!") { // Accept specific type
        if (!this.ctx || !this.canvas) return;
        console.log("Visualizer: Showing Turnover - " + turnoverType);
        const message = turnoverType.toUpperCase(); // Use the passed turnoverType

        let animationTime = 0;
        const duration = 2000; 
        const pulseSpeed = 400; 
        const baseFontSize = 40;
        const maxFontIncrease = 10;

        const animate = (timestamp) => {
            if (!animationTime) animationTime = timestamp;
            const elapsed = timestamp - animationTime;
            const progress = Math.min(elapsed / duration, 1);

            this.ctx.save(); // Save context before potential shake
            if (this.screenShakeTime > 0) {
                const shakeProgress = (this.screenShakeDuration - this.screenShakeTime) / this.screenShakeDuration;
                const currentShake = this.screenShakeIntensity * Math.sin(shakeProgress * Math.PI * 3); // 3 oscillations
                this.ctx.translate(Math.random() * currentShake - currentShake / 2, Math.random() * currentShake - currentShake / 2);
                this.screenShakeTime -= (1000/60);
            }

            this.drawField();
            this.drawPlayerIconWithBall();

            const pulseProgress = (elapsed % pulseSpeed) / pulseSpeed;
            const currentFontIncrease = Math.sin(pulseProgress * Math.PI) * maxFontIncrease;
            const currentFontSize = baseFontSize + currentFontIncrease;

            this.ctx.save();
            this.ctx.font = `bold ${currentFontSize}px Impact, Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#FFDD00'; 
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 8;
            
            const x = this.canvas.width / 2;
            const y = this.canvas.height / 2; 

            this.ctx.strokeText(message, x, y);
            this.ctx.fillText(message, x, y);
            this.ctx.restore();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.drawField();
                this.drawPlayerIconWithBall();
            }
            this.ctx.restore(); // Restore context after potential shake
        };
        
        // Trigger shake for Turnovers
        this.triggerScreenShake(6, 250);
        requestAnimationFrame(animate);
    },

    triggerScreenShake: function(intensity, duration) {
        this.screenShakeIntensity = intensity;
        this.screenShakeDuration = duration;
        this.screenShakeTime = duration;
    }
};


console.log("EPG Script Loaded. Game starting process initiated via window.onload...");
