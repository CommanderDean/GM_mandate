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

const PLAY_ADVANTAGE_OUTCOMES = {
    "12+": { category: "Breakthrough Play!", baseYardage: 40, event: "TD_CHANCE_HIGH", notes: "Big play, changes field position dramatically." },
    "8-11": { category: "Solid Gain", baseYardage: 25, event: "FIRST_DOWN_LIKELY", notes: "Consistent offensive success." },
    "4-7": { category: "Positive Gain", baseYardage: 10, event: "SHORT_CONVERSION_SETUP", notes: "Bread-and-butter plays." },
    "1-3": { category: "Minimal Gain", baseYardage: 4, event: "MINIMAL_GAIN", notes: "\"Stuffing the run,\" short completion." },
    "0": { category: "No Gain / Stalemate", baseYardage: 0, event: "NO_GAIN", notes: "Defence holds the line." },
    "-1--3": { category: "Loss / Disruption", baseYardage: -4, event: "LOSS_OF_YARDS", notes: "Offensive struggle." },
    "-4--7": { category: "Significant Stop", baseYardage: -8, event: "SACK_POSSIBLE", notes: "Defence dominates the play." },
    "-8--11": { category: "Major Defensive Win", baseYardage: -12, event: "TURNOVER_RISK_INCREASED", notes: "Turns momentum." },
    "-12-": { category: "Disaster for Offence", baseYardage: -18, event: "TURNOVER_RISK_VERY_HIGH", notes: "Catastrophic play for the offence." }
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
    sfx_button_click: 'audio/sfx_button_click.mp3',
    sfx_intel_gain: 'audio/sfx_intel_gain.mp3',
    sfx_intel_loss: 'audio/sfx_intel_loss.mp3',
    sfx_win_game: 'audio/sfx_win_game.mp3',
    sfx_lose_game: 'audio/sfx_lose_game.mp3',
    sfx_first_down: 'audio/sfx_first_down.mp3',
    sfx_touchdown: 'audio/sfx_touchdown.mp3',
    sfx_field_goal_good: 'audio/sfx_field_goal_good.mp3',
    sfx_field_goal_no_good: 'audio/sfx_field_goal_no_good.mp3',
    sfx_turnover_interception: 'audio/sfx_turnover_interception.mp3',
    sfx_turnover_fumble: 'audio/sfx_turnover_fumble.mp3',
    sfx_sack: 'audio/sfx_sack.mp3', // Although not explicitly called yet, good to have
    sfx_safety: 'audio/sfx_safety.mp3',
    sfx_punt: 'audio/sfx_punt.mp3',
    sfx_kickoff: 'audio/sfx_kickoff.mp3',
    sfx_whistle_end_play: 'audio/sfx_whistle_end_play.mp3',
    sfx_whistle_end_quarter: 'audio/sfx_whistle_end_quarter.mp3',
    sfx_notification: 'audio/sfx_notification.mp3',
    sfx_scenario_trigger: 'audio/sfx_scenario_trigger.mp3',
    sfx_roster_full: 'audio/sfx_roster_full.mp3',
    sfx_insufficient_funds: 'audio/sfx_insufficient_funds.mp3',
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
        sfx_first_down = new Audio(audioFiles.sfx_first_down);
        sfx_touchdown = new Audio(audioFiles.sfx_touchdown);
        sfx_field_goal_good = new Audio(audioFiles.sfx_field_goal_good);
        sfx_field_goal_no_good = new Audio(audioFiles.sfx_field_goal_no_good);
        sfx_turnover_interception = new Audio(audioFiles.sfx_turnover_interception);
        sfx_turnover_fumble = new Audio(audioFiles.sfx_turnover_fumble);
        sfx_sack = new Audio(audioFiles.sfx_sack);
        sfx_safety = new Audio(audioFiles.sfx_safety);
        sfx_punt = new Audio(audioFiles.sfx_punt);
        sfx_kickoff = new Audio(audioFiles.sfx_kickoff);
        sfx_whistle_end_play = new Audio(audioFiles.sfx_whistle_end_play);
        sfx_whistle_end_quarter = new Audio(audioFiles.sfx_whistle_end_quarter);
        sfx_notification = new Audio(audioFiles.sfx_notification);
        sfx_scenario_trigger = new Audio(audioFiles.sfx_scenario_trigger);
        sfx_roster_full = new Audio(audioFiles.sfx_roster_full);
        sfx_insufficient_funds = new Audio(audioFiles.sfx_insufficient_funds);
    } catch (e) {
        console.warn("Could not load all audio files. Some sounds may be missing.", e);
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
        case 'sfx_first_down': sound = sfx_first_down; break;
        case 'sfx_touchdown': sound = sfx_touchdown; break;
        case 'sfx_field_goal_good': sound = sfx_field_goal_good; break;
        case 'sfx_field_goal_no_good': sound = sfx_field_goal_no_good; break;
        case 'sfx_turnover_interception': sound = sfx_turnover_interception; break;
        case 'sfx_turnover_fumble': sound = sfx_turnover_fumble; break;
        case 'sfx_sack': sound = sfx_sack; break;
        case 'sfx_safety': sound = sfx_safety; break;
        case 'sfx_punt': sound = sfx_punt; break;
        case 'sfx_kickoff': sound = sfx_kickoff; break;
        case 'sfx_whistle_end_play': sound = sfx_whistle_end_play; break;
        case 'sfx_whistle_end_quarter': sound = sfx_whistle_end_quarter; break;
        case 'sfx_notification': sound = sfx_notification; break;
        case 'sfx_scenario_trigger': sound = sfx_scenario_trigger; break;
        case 'sfx_roster_full': sound = sfx_roster_full; break;
        case 'sfx_insufficient_funds': sound = sfx_insufficient_funds; break;
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
        playAudio('sfx_roster_full');
        showNotification(`Your roster is already full (${MINIMUM_ROSTER_SIZE} players). You cannot draft more players.`, true);
        return;
    }

    // Calculate Intel cost (contract_cost / 500,000)
    const intelCost = Math.ceil(playerData.contract_cost / 500000); // Use Math.ceil to round up

    // Check if both Intel and Budget are sufficient
    if (gameState.scoutingIntel >= intelCost && gameState.teamBudget >= playerData.contract_cost) {
        gameState.scoutingIntel -= intelCost; // Deduct calculated Intel cost
        gameState.teamBudget -= playerData.contract_cost; // Deduct contract cost from budget

        // Check if budget falls below 965,000 after a successful draft
        if (gameState.teamBudget < 965000) {
            playAudio('sfx_insufficient_funds');
            showNotification(`Warning: Your team budget has fallen below $965,000!`, true);
        }

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
        playAudio('sfx_insufficient_funds'); // Use specific sound for insufficient funds
        showNotification(`Not enough Scouting Intel to draft this player. Intel Cost: ${intelCost}, Have: ${gameState.scoutingIntel}`, true);
    } else { // Must be insufficient budget
         playAudio('sfx_insufficient_funds'); // Use specific sound for insufficient funds
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
        realStatsSummary: realStatsSummary, // Include real stats summary
        originalContractCost: playerData ? playerData.contract_cost : 0 // Store original contract cost
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
                        <th>Name</th><th>Pos.</th><th>Age</th><th>Philosophy</th><th>Morale</th><th>Loyalty</th><th>Off</th><th>Def</th><th>ST</th><th>Trait</th><th>Actions</th>
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
                    <td><button class="sell-player-button" data-player-id="${player.id}" data-player-name="${player.name}" data-player-cost="${player.originalContractCost || 0}">Sell</button></td>
                </tr>`;
        });
        content += `</tbody></table>`;
    }
    content += `<button onclick="window.navigateTo('gmOffice')" class="secondary mt-2">Back to GM Office</button>`;
    screenArea.innerHTML = content;

    // Add event listeners for sell buttons
    document.querySelectorAll('.sell-player-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const playerId = event.target.dataset.playerId;
            const playerName = event.target.dataset.playerName;
            const playerCost = parseInt(event.target.dataset.playerCost);
            window.sellPlayer(playerId, playerName, playerCost);
        });
    });
}

/**
 * Sells a player from the Eagles roster, refunds a percentage of their original cost,
 * and returns them to the draft pool.
 * @param {string} playerId - The unique ID of the player to sell.
 * @param {string} playerName - The name of the player (for confirmation/notification).
 * @param {number} originalCost - The original contract cost of the player.
 */
window.sellPlayer = function(playerId, playerName, originalCost) {
    playAudio('sfx_button_click');
    const refundPercentage = 0.5; // 50% refund
    const refundAmount = Math.floor(originalCost * refundPercentage);

    if (!confirm(`Are you sure you want to sell ${playerName} for $${refundAmount.toLocaleString()}?`)) {
        return;
    }

    const playerIndex = gameState.eaglesRoster.findIndex(p => p.id === playerId);

    if (playerIndex !== -1) {
        const playerToSell = gameState.eaglesRoster[playerIndex];

        // Remove player from roster
        gameState.eaglesRoster.splice(playerIndex, 1);

        // Add refund to budget
        gameState.teamBudget += refundAmount;

        // Add player back to draft pool (if they were a real NFL player)
        // We need to find the original player data from allNFLPlayers to add back to draftPool
        const originalPlayerData = allNFLPlayers.find(p => p.name === playerToSell.name);
        if (originalPlayerData && !gameState.draftPool.some(p => p.name === originalPlayerData.name)) {
            gameState.draftPool.push(originalPlayerData);
            console.log(`Player ${playerName} returned to draft pool.`);
        } else if (playerToSell.originalContractCost === 0) { // This is a basic player, don't add back to draft pool
            console.log(`Basic player ${playerName} sold. Not returned to draft pool.`);
        } else {
            console.warn(`Could not find original player data for ${playerName} to return to draft pool, or player already in pool.`);
        }

        showNotification(`${playerName} sold for $${refundAmount.toLocaleString()}! Your budget is now $${gameState.teamBudget.toLocaleString()}.`, false, 5000, 'top');
        updateBudgetBasedOnIntel(); // Ensure budget display is updated
        renderRosterScreen(); // Re-render the roster screen
    } else {
        showNotification(`Error: Player ${playerName} not found on roster.`, true);
        console.error(`Attempted to sell player with ID ${playerId} but not found.`);
    }
};


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

    let enhancedScoutingReport = opponent.philosophyHint;
    if (gameState.jakeHarrisSkills.designersInsight) {
        // Generate a more specific hint based on opponent's potential strategies
        // This is a simplified example; could be tied to actual opponent AI tendencies if they were more complex
        const opponentPotentialStrategies = ["Aggressive Offence", "Strong Defensive Line", "Blitz Heavy", "Conservative Run Game"];
        const randomInsight = opponentPotentialStrategies[Math.floor(Math.random() * opponentPotentialStrategies.length)];
        enhancedScoutingReport += ` <strong style="color: #FFD700;">(Designer's Insight: Expect them to lean on ${randomInsight}.)</strong>`;
    }

    screenArea.innerHTML = `
        <h2>Game Day Preparation: Week ${gameState.currentWeek}</h2>
        <div class="game-day-info">
            <h3>Upcoming Opponent: ${opponent.opponentName}</h3>
            <p>Strength: ${opponent.strength}</p>
            <p>Scouting Report: ${enhancedScoutingReport}</p>
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
    playAudio('sfx_scenario_trigger');

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

    // Check roster size before advancing to a game week
    if (gameState.eaglesRoster.length < MINIMUM_ROSTER_SIZE) {
        showNotification(`Your roster has ${gameState.eaglesRoster.length}/${MINIMUM_ROSTER_SIZE} players. You must have at least ${MINIMUM_ROSTER_SIZE} players to play a game. Recruit more talent!`, true);
        // Ensure the screen stays on GM Office or navigates there if not already
        if (gameState.currentScreen !== 'gmOffice') {
            window.navigateTo('gmOffice');
        }
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

function calculatePhilosophicalHarmony(roster) {
    if (!roster || roster.length === 0) {
        return 50; // Default neutral harmony for empty roster
    }

    const philosophyCounts = { "Individualist": 0, "Egalitarian": 0, "Traditionalist": 0, "Neutral": 0 };
    roster.forEach(player => {
        if (philosophyCounts.hasOwnProperty(player.philosophy)) {
            philosophyCounts[player.philosophy]++;
        } else {
            philosophyCounts["Neutral"]++; // Should not happen if players always have a valid philosophy
        }
    });

    let harmonyScore = 70; // Start with a base that's slightly positive leaning
    const totalPlayers = roster.length;

    if (totalPlayers > 0) {
        // Egalitarian bonus: They are glue guys
        harmonyScore += philosophyCounts["Egalitarian"] * 5; // +5 per Egalitarian

        // Individualist/Traditionalist Clash Penalty
        // More significant penalty if both are present in large numbers
        const indCount = philosophyCounts["Individualist"];
        const tradCount = philosophyCounts["Traditionalist"];
        if (indCount > 0 && tradCount > 0) {
            // Penalty scales with the product, or minimum of the two, to represent friction
            harmonyScore -= Math.min(indCount, tradCount) * 6; // -6 for each "pair" that could clash
        }
        
        // Imbalance penalty (less severe than direct clashes)
        // Penalize if one philosophy (excluding Neutral) heavily dominates others
        const nonNeutralPhilosophies = ["Individualist", "Egalitarian", "Traditionalist"];
        let maxCount = 0;
        let minCount = totalPlayers;
        let nonNeutralPlayerCount = 0;
        nonNeutralPhilosophies.forEach(phil => {
            const count = philosophyCounts[phil];
            nonNeutralPlayerCount += count;
            if (count > maxCount) maxCount = count;
            if (count < minCount) minCount = count;
        });

        if (nonNeutralPlayerCount > 0) {
            const idealSpread = nonNeutralPlayerCount / nonNeutralPhilosophies.length;
            let deviationSum = 0;
            nonNeutralPhilosophies.forEach(phil => {
                deviationSum += Math.abs(philosophyCounts[phil] - idealSpread);
            });
            harmonyScore -= deviationSum * 1.5; // Penalty based on sum of deviations
        }
    }
    
    return Math.max(0, Math.min(100, Math.round(harmonyScore))); // Clamp 0-100
}

function getFourthDownDecision(ballOnYardLine, yardsToGo, currentPlayNumber, totalPlays, teamScore, opponentScore, isPossessingTeamEagles) {
    const playsRemaining = totalPlays - currentPlayNumber;
    const scoreDiff = teamScore - opponentScore; // Positive if current team is winning

    // Field position from opponent's endzone (0-100, where 0 is opponent's goal line)
    const yardsFromOpponentEndzone = isPossessingTeamEagles ? (100 - ballOnYardLine) : ballOnYardLine;
    const fieldGoalDistance = yardsFromOpponentEndzone + 17; // LoS + 10yd endzone + 7yd snap/hold

    // --- Field Goal Considerations ---
    if (fieldGoalDistance <= 58) { // Max attemptable FG distance (approx 58 yards, ball at opponent's 41)
        if (yardsToGo >= 5 && fieldGoalDistance <= 50) { // If long to go, but decent FG range
             // If losing by a FG or less, or tied, or winning by a bit and want to extend
            if (scoreDiff <= 0 || (scoreDiff > 0 && scoreDiff < 7 && playsRemaining < totalPlays / 2)) {
                logToGameSim(`4th Down Decision: Attempting Field Goal from ${fieldGoalDistance} yards.`);
                return "ATTEMPT_FG";
            }
        }
        // If very short FG and not desperate to go for it
        if (fieldGoalDistance <= 35 && yardsToGo > 2) {
            logToGameSim(`4th Down Decision: Attempting short Field Goal from ${fieldGoalDistance} yards.`);
            return "ATTEMPT_FG";
        }
    }

    // --- Go For It Considerations ---
    if (yardsToGo <= 5) { // 4th and short/medium
        // If in opponent territory, or desperate
        if (yardsFromOpponentEndzone < 50 || (scoreDiff < -7 && playsRemaining < totalPlays / 3)) {
            logToGameSim(`4th Down Decision: Going for it on 4th & ${yardsToGo}!`);
            return "GO_FOR_IT";
        }
    }
    if (scoreDiff < -10 && playsRemaining < totalPlays / 4 && yardsFromOpponentEndzone < 60) { // Desperate late
        logToGameSim(`4th Down Decision: Desperate - Going for it on 4th & ${yardsToGo}!`);
        return "GO_FOR_IT";
    }

    // --- Punt Considerations ---
    // If not in FG range, or winning comfortably, or early in game and bad field position
    if (yardsFromOpponentEndzone > 45) { // Generally punt if outside opponent's 45 (FG distance > 62)
        logToGameSim(`4th Down Decision: Punting. Ball at own ${isPossessingTeamEagles ? ballOnYardLine : 100 - ballOnYardLine}, ${yardsFromOpponentEndzone} from opponent endzone.`);
        return "PUNT";
    }
    if (scoreDiff > 7 && playsRemaining < totalPlays / 2) { // Winning, play it safe
        logToGameSim(`4th Down Decision: Punting to protect lead.`);
        return "PUNT";
    }

    // Default / Fallback (could be more nuanced)
    if (fieldGoalDistance <= 55 && yardsToGo > 3) { // If reasonable FG and not super short to go
        logToGameSim(`4th Down Decision (Fallback): Attempting Field Goal from ${fieldGoalDistance} yards.`);
        return "ATTEMPT_FG";
    }
    
    logToGameSim(`4th Down Decision (Fallback): Going for it on 4th & ${yardsToGo}.`);
    return "GO_FOR_IT"; // Default to going for it if no other strong signal
}


function selectKeyPlayer(roster, playerType, isOffense) { // playerType: 'Eagles' or 'Opponent', isOffense: boolean
    if (!roster || roster.length === 0) return null;

    // Filter for relevant players (e.g., non-K/P for general offense/defense impact)
    const eligiblePlayers = roster.filter(p => p.position !== 'K' && p.position !== 'P');
    if (eligiblePlayers.length === 0) return null;

    // Sort by a combination of relevant skill and morale
    eligiblePlayers.sort((a, b) => {
        const skillA = isOffense ? (a.skills.offence || 0) : (a.skills.defence || 0);
        const skillB = isOffense ? (b.skills.offence || 0) : (b.skills.defence || 0);
        const moraleA = a.morale || 50;
        const moraleB = b.morale || 50;
        
        let statsSummaryBonusA = 0;
        if (a.realStatsSummary) {
            const summary = a.realStatsSummary.toLowerCase();
            if (summary.includes("mvp") || summary.includes("all-pro") || summary.includes("leader") || summary.includes("top performer")) {
                statsSummaryBonusA = 10; // Arbitrary bonus for positive summary, adds to score
            }
        }
        let statsSummaryBonusB = 0;
        if (b.realStatsSummary) {
            const summary = b.realStatsSummary.toLowerCase();
            if (summary.includes("mvp") || summary.includes("all-pro") || summary.includes("leader") || summary.includes("top performer")) {
                statsSummaryBonusB = 10;
            }
        }

        // Weighted score: skill * 0.6 + morale * 0.2 + statsSummaryBonus * 0.2 (example weights)
        const scoreA = (skillA * 0.6) + (moraleA * 0.2) + statsSummaryBonusA;
        const scoreB = (skillB * 0.6) + (moraleB * 0.2) + statsSummaryBonusB;
        
        return scoreB - scoreA; // Sort descending
    });

    // Select the top player, but add a bit of randomness so it's not always the absolute best
    if (Math.random() < 0.7 && eligiblePlayers.length > 0) { // 70% chance to pick the top player
        return eligiblePlayers[0];
    } else if (eligiblePlayers.length > 1 && Math.random() < 0.5) { // 50% of remaining 30% to pick 2nd best (if exists)
        return eligiblePlayers[1];
    } else if (eligiblePlayers.length > 0) { // Fallback to a random eligible player from the top few or any
        return eligiblePlayers[Math.floor(Math.random() * Math.min(eligiblePlayers.length, 3))]; // Pick from top 3 or fewer
    }
    return null;
}

function getOpponentStrategy(eaglesScore, opponentScore, currentDown, yardsToGo, ballOnYardLine, currentPlayNumber, totalPlays) {
    let offensiveStrategy = "balanced_offence"; // Default
    let defensiveStrategy = "standard_defense"; // Default

    const scoreDiff = opponentScore - eaglesScore; // Positive if opponent is winning
    const playsRemaining = totalPlays - currentPlayNumber;
    const isLateGame = playsRemaining < totalPlays / 4; // Last quarter of plays

    // Offensive Strategy Logic (when opponent has the ball)
    if (isLateGame) {
        if (scoreDiff < -7) offensiveStrategy = "aggressive_pass"; // Losing late, go aggressive
        else if (scoreDiff > 7) offensiveStrategy = "conservative_run"; // Winning late, run clock
    } else {
        if (scoreDiff < -10) offensiveStrategy = "aggressive_pass"; // Significantly behind
        else if (currentDown === 3 && yardsToGo > 7) offensiveStrategy = "aggressive_pass";
        else if (currentDown === 3 && yardsToGo <= 3) offensiveStrategy = "conservative_run";
        else if (scoreDiff > 10) offensiveStrategy = "conservative_run"; // Significantly ahead
    }

    // Defensive Strategy Logic (when Eagles have the ball)
    // Opponent's ballOnYardLine for their defensive perspective would be 100 - ballOnYardLine (if ballOnYardLine is from Eagles perspective)
    const opponentDefendingRedZone = (100 - ballOnYardLine) < 20; // Eagles are in opponent's red zone

    if (isLateGame) {
        if (scoreDiff > 0 && scoreDiff <= 7) defensiveStrategy = "blitz_heavy_defense"; // Protecting a small lead late
        else if (scoreDiff < -7) defensiveStrategy = "blitz_heavy_defense"; // Desperate for a stop
    } else {
        if (currentDown === 3 && yardsToGo > 7) defensiveStrategy = "standard_defense"; // Or bend_dont_break if AI can use it
        else if (currentDown === 3 && yardsToGo <= 3) defensiveStrategy = "blitz_heavy_defense";
        else if (opponentDefendingRedZone) defensiveStrategy = "blitz_heavy_defense";
    }
    
    // Randomness factor to prevent predictability
    if (Math.random() < 0.15) { // 15% chance to deviate slightly
        const offStrategies = ["aggressive_pass", "conservative_run", "balanced_offence"];
        const defStrategies = ["blitz_heavy_defense", "standard_defense"]; // Add "bend_dont_break_defense" if AI uses it
        offensiveStrategy = offStrategies[Math.floor(Math.random() * offStrategies.length)];
        defensiveStrategy = defStrategies[Math.floor(Math.random() * defStrategies.length)];
    }

    return { offensive: offensiveStrategy, defensive: defensiveStrategy };
}


function calculateSpecialTeamsPlayerModifier(roster, targetPosition) {
    if (!roster || roster.length === 0) {
        // No roster, apply modifier for a default low skill (e.g., 40)
        const defaultSkill = 40;
        const modifier = Math.round((defaultSkill - 70) / 5);
        return Math.max(-4, Math.min(4, modifier)); // Clamped: -4
    }

    const specialists = roster.filter(player => player.position === targetPosition);

    let bestSkill = 0; // Default to a very low skill if no specialist or specialist has no ST skill

    if (specialists.length > 0) {
        specialists.forEach(sp => {
            if (sp.skills && typeof sp.skills.specialTeams === 'number') {
                if (sp.skills.specialTeams > bestSkill) {
                    bestSkill = sp.skills.specialTeams;
                }
            }
        });
        // If after checking all specialists, bestSkill is still 0 (meaning no specialist had a valid ST skill)
        // or if no specialists were found initially, we use a default low skill.
        if (bestSkill === 0) {
             bestSkill = 40; // Default low skill if specialist found but no ST rating, or no specialist found
        }
    } else {
        // No specialist found for the targetPosition
        bestSkill = 40; // Default low skill
    }

    const modifier = Math.round((bestSkill - 70) / 5);
    return Math.max(-6, Math.min(6, modifier)); // Clamped between -6 and +6 for more impact
}

function calculateTeamAttributeModifier(roster, attribute) { // attribute can be 'offence', 'defence', 'specialTeams'
    if (!roster || roster.length === 0) {
        return 0; // Default modifier if no roster
    }
    let totalSkill = 0;
    let playerCount = 0;
    roster.forEach(player => {
        if (player.skills && typeof player.skills[attribute] === 'number') {
            totalSkill += player.skills[attribute];
            playerCount++;
        } else if (attribute === 'specialTeams' && player.skills && typeof player.skills.specialTeams !== 'number') {
            // Fallback for players without explicit ST rating, e.g. use a low default or skip
            totalSkill += 40; // Example low default for ST if not present
            playerCount++;
        }
    });

    if (playerCount === 0) return 0; // No players with the specified skill

    const averageSkill = totalSkill / playerCount;
    // Convert to a concise modifier (e.g., if ratings are 0-100, (Rating - 70) / 5. So an 80 rating is +2, a 60 is -2).
    const modifier = Math.round((averageSkill - 70) / 5);
    // Clamp modifier to a reasonable range, e.g., -5 to +5 or -10 to +10, to prevent d20 from being overshadowed.
    // User suggested -5 to +10. Let's start with a slightly tighter clamp for initial balance.
    return Math.max(-6, Math.min(6, modifier)); // Clamped between -6 and +6 for more impact
}

function getPlayOutcomeFromAdvantage(playAdvantage) {
    let outcomeCategoryKey;
    if (playAdvantage >= 12) outcomeCategoryKey = "12+";
    else if (playAdvantage >= 8) outcomeCategoryKey = "8-11";
    else if (playAdvantage >= 4) outcomeCategoryKey = "4-7";
    else if (playAdvantage >= 1) outcomeCategoryKey = "1-3";
    else if (playAdvantage === 0) outcomeCategoryKey = "0";
    else if (playAdvantage >= -3) outcomeCategoryKey = "-1--3";
    else if (playAdvantage >= -7) outcomeCategoryKey = "-4--7";
    else if (playAdvantage >= -11) outcomeCategoryKey = "-8--11";
    else outcomeCategoryKey = "-12-";

    const outcomeDetails = PLAY_ADVANTAGE_OUTCOMES[outcomeCategoryKey];
    let yardage = outcomeDetails.baseYardage;

    // Add some variability to yardage, e.g., +/- 0-3 yards for smaller gains, more for bigger ones
    if (outcomeDetails.baseYardage > 0 && outcomeDetails.baseYardage <= 10) { // Minimal to Positive Gain
        yardage += Math.floor(Math.random() * 7) - 3; // -3 to +3
    } else if (outcomeDetails.baseYardage > 10 && outcomeDetails.baseYardage <= 25) { // Solid Gain
        yardage += Math.floor(Math.random() * 11) - 5; // -5 to +5
    } else if (outcomeDetails.baseYardage > 25) { // Breakthrough
        yardage += Math.floor(Math.random() * 15) - 7; // -7 to +7
    } else if (outcomeDetails.baseYardage < 0 && outcomeDetails.baseYardage >= -8) { // Loss/Disruption to Sig Stop
        yardage += Math.floor(Math.random() * 5) - 2; // -2 to +2
    } else if (outcomeDetails.baseYardage < -8) { // Major Defensive Win / Disaster
        yardage += Math.floor(Math.random() * 7) - 3; // -3 to +3
    }
    // Ensure yardage doesn't become positive for a negative base, or too small for a positive base.
    if (outcomeDetails.baseYardage > 0) yardage = Math.max(1, yardage);
    if (outcomeDetails.baseYardage < 0) yardage = Math.min(-1, yardage);
    if (outcomeDetails.baseYardage === 0) yardage = 0;


    return {
        yardage: yardage,
        category: outcomeDetails.category,
        event: outcomeDetails.event, // e.g., "TD_CHANCE_HIGH", "TURNOVER_RISK_INCREASED"
        notes: outcomeDetails.notes
    };
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

    // --- NEW SIMULATION LOGIC ---
    const TOTAL_PLAYS_PER_GAME = 30; // Increased to allow more drives and scoring opportunities
    let currentPlayNumber = 0;
    let eaglesScore = 0;
    let opponentScore = 0;
    let firstDownSoundPlayedThisQuarter = false; // New variable to track first down sound per quarter

    // Calculate Team Level Modifiers
    const eaglesRoster = gameState.eaglesRoster;
    const opponentRoster = gameState.allNFLTeams[opponent.opponentName] || [];

    let eaglesOffenceModifier = calculateTeamAttributeModifier(eaglesRoster, 'offence');
    eaglesOffenceModifier += gameState.temporaryGameModifiers.offence || 0;

    let eaglesDefenceModifier = calculateTeamAttributeModifier(eaglesRoster, 'defence');
    eaglesDefenceModifier += gameState.temporaryGameModifiers.defence || 0;
    
    const harmonyScore = calculatePhilosophicalHarmony(eaglesRoster);
    const harmonyModifier = Math.round((harmonyScore - 70) / 10); // e.g., 70 score = 0 mod, 80 = +1, 60 = -1. Max/min around +/-3
    logToGameSim(`Eagles Philosophical Harmony: ${harmonyScore}/100 (Modifier: ${harmonyModifier > 0 ? '+' : ''}${harmonyModifier})`);
    eaglesOffenceModifier += harmonyModifier;
    eaglesDefenceModifier += harmonyModifier;
    
    // TODO: Add ST modifiers based on specific K/P players later

    let opponentOffenceModifier = calculateTeamAttributeModifier(opponentRoster, 'offence');
    let opponentDefenceModifier = calculateTeamAttributeModifier(opponentRoster, 'defence');
    // TODO: Add ST modifiers for opponent later

    // For ST, we'd need to identify kicker/punter.
    let eaglesSpecialTeamsKickerModifier = calculateSpecialTeamsPlayerModifier(eaglesRoster, "K");
    let eaglesSpecialTeamsPunterModifier = calculateSpecialTeamsPlayerModifier(eaglesRoster, "P");
    let opponentSpecialTeamsKickerModifier = calculateSpecialTeamsPlayerModifier(opponentRoster, "K");
    let opponentSpecialTeamsPunterModifier = calculateSpecialTeamsPlayerModifier(opponentRoster, "P");

    logToGameSim(`Eagles Kicker Mod: ${eaglesSpecialTeamsKickerModifier}, Punter Mod: ${eaglesSpecialTeamsPunterModifier}`);
    logToGameSim(`${opponent.opponentName} Kicker Mod: ${opponentSpecialTeamsKickerModifier}, Punter Mod: ${opponentSpecialTeamsPunterModifier}`);

    // Simplified Game State for this phase
    let currentPossessionEagles = Math.random() < 0.5; // Initial possession
    let ballOnYardLine = currentPossessionEagles ? 25 : 75; // Eagles: own 25. Opp: their 25 (Eagles' 75)
    let currentDown = 1;
    let yardsToGo = 10;
    // gameState.eaglesChallengesLeft = 2; // Already in gameState

    logToGameSim(`New D&D Style Game Started: Philadelphia Eagles vs ${opponent.opponentName}`, true);
    playAudio('sfx_kickoff');

    // Function to handle PAT decision and outcome
    async function getPATDecisionAndOutcome(scoringTeamIsEagles, currentEaglesScore, currentOpponentScore) {
        let patAttemptType = "XP"; // Default to Extra Point
        let pointsAwarded = 0;
        let patDescription = "";

        const kickerModifier = scoringTeamIsEagles ? eaglesSpecialTeamsKickerModifier : opponentSpecialTeamsKickerModifier;
        const teamOffensiveModifier = scoringTeamIsEagles ? eaglesOffenceModifier : opponentOffenceModifier; // Simplified, could be more nuanced
        const opposingTeamDefensiveModifier = scoringTeamIsEagles ? opponentDefenceModifier : eaglesDefenceModifier; // Simplified

        // AI Decision Logic (simple for now)
        if (!scoringTeamIsEagles) {
            const scoreDiff = currentOpponentScore - currentEaglesScore; // Opponent's perspective
            if (scoreDiff < -1 && scoreDiff > -5) { // If down by 2, 3, or 4, might go for 2 to catch up
                if (Math.random() < 0.4) patAttemptType = "2PT"; // 40% chance
            } else if (scoreDiff === 0 || scoreDiff === 1 || scoreDiff === 4 || scoreDiff === 5) { // Tie, up 1, up 4, up 5
                 if (Math.random() < 0.6) patAttemptType = "2PT"; // More aggressive if close or trying to make it a 2-score game
            } else if (currentPlayNumber > TOTAL_PLAYS_PER_GAME * 0.75 && (scoreDiff < 0 || scoreDiff > 7)) { // Late game, either desperate or sealing
                if (Math.random() < 0.5) patAttemptType = "2PT";
            }
        } else {
            // TODO: Add GM decision point for Eagles PAT choice later
            // For now, Eagles always attempt XP
            patAttemptType = "XP";
        }

        logToGameSim(`${scoringTeamIsEagles ? "Eagles" : opponent.opponentName} will attempt a ${patAttemptType}.`);

        if (patAttemptType === "XP") {
            const xpRoll = Math.floor(Math.random() * 20) + 1;
            const xpSuccessTarget = 5; // Very easy target
            const xpScore = xpRoll + kickerModifier;
            if (xpScore >= xpSuccessTarget) {
                pointsAwarded = 1;
                patDescription = "Extra Point IS GOOD!";
                logToGameSim(`XP Attempt: Roll ${xpRoll} + K_Mod ${kickerModifier} = ${xpScore}. Target >= ${xpSuccessTarget}. GOOD!`);
            } else {
                patDescription = "Extra Point IS NO GOOD!";
                logToGameSim(`XP Attempt: Roll ${xpRoll} + K_Mod ${kickerModifier} = ${xpScore}. Target >= ${xpSuccessTarget}. NO GOOD!`);
            }
        } else { // 2PT Conversion
            logToGameSim(`${scoringTeamIsEagles ? "Eagles" : opponent.opponentName} going for Two! Ball on the 2-yard line.`);
            const twoPtAttackRoll = Math.floor(Math.random() * 20) + 1;
            const twoPtDefenceRoll = Math.floor(Math.random() * 20) + 1;
            // Apply a situational modifier for being close to goal line (e.g., defense gets slight edge)
            const twoPtAttackScore = twoPtAttackRoll + teamOffensiveModifier;
            const twoPtDefenceScore = twoPtDefenceRoll + opposingTeamDefensiveModifier + 1; // Small defensive bonus for goal line stand

            if (twoPtAttackScore > twoPtDefenceScore) {
                pointsAwarded = 2;
                patDescription = "Two-Point Conversion IS GOOD!";
                logToGameSim(`2PT Attempt: Attack ${twoPtAttackScore} (Roll ${twoPtAttackRoll}) vs Defence ${twoPtDefenceScore} (Roll ${twoPtDefenceRoll}). GOOD!`);
            } else {
                patDescription = "Two-Point Conversion IS NO GOOD!";
                logToGameSim(`2PT Attempt: Attack ${twoPtAttackScore} (Roll ${twoPtAttackRoll}) vs Defence ${twoPtDefenceScore} (Roll ${twoPtDefenceRoll}). NO GOOD!`);
            }
            // Animate 2PT as a short play
            if (window.gameVisualizer && window.gameVisualizer.ctx) {
                const twoPtActingTeam = scoringTeamIsEagles ? 'Eagles' : 'Opponent';
                // Ball is at the 2-yard line for a 2PT conversion.
                // Use the new helper to get the correct pixel X.
                window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(2, scoringTeamIsEagles);
                window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
                
                let visualizerResult = pointsAwarded === 2 ? "2PT GOOD" : "2PT NO GOOD";
                let animPlayType = "2PT Conversion";

                await window.gameVisualizer.animatePlay({
                    yards: pointsAwarded === 2 ? 2 : 0, // Simulate 2 yards for success, 0 for failure
                    result: visualizerResult,
                    playType: animPlayType,
                    detailedPlayType: `${animPlayType} (${visualizerResult})`
                }, twoPtActingTeam);
            }
        }
        logToGameSim(patDescription, true);
        return { points: pointsAwarded, description: patDescription };
    }

    if (window.gameVisualizer && window.gameVisualizer.ctx) {
        window.gameVisualizer.setScore(eaglesScore, opponentScore, 1); // Quarter is just for display now
        window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
        window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, gameState.eaglesChallengesLeft, 3); // Assuming 3 opponent timeouts for now
    }

    while (currentPlayNumber < TOTAL_PLAYS_PER_GAME) {
        currentPlayNumber++;
        logToGameSim(`--- Play ${currentPlayNumber}/${TOTAL_PLAYS_PER_GAME} ---`, true);

        let attackingTeamModifier, defendingTeamModifier;
        let attackerIsEagles = currentPossessionEagles;

        // --- Apply Strategic Modifiers ---
        let eaglesStrategyOffenceMod = 0;
        let eaglesStrategyDefenceMod = 0;
        let opponentStrategyOffenceMod = 0;
        let opponentStrategyDefenceMod = 0;

        // Eagles Strategies (from gameState.playerStrategies, set in gameDayPrep)
        let composureOffenceBoost = 0;
        let composureDefenceBoost = 0;

        if (gameState.playerStrategies.offensive === "aggressive_pass") {
            eaglesStrategyOffenceMod = 2;
        } else if (gameState.playerStrategies.offensive === "conservative_run") {
            eaglesStrategyOffenceMod = 0; // Changed from -1 to 0
            logToGameSim("Conservative Run strategy active: Focus on ball security, less explosive plays.");
        } else if (gameState.playerStrategies.offensive === "exploit_matchups") {
            eaglesStrategyOffenceMod = 1; // Small general boost
        }

        if (gameState.playerStrategies.defensive === "blitz_heavy") {
            eaglesStrategyDefenceMod = 2;
        } else if (gameState.playerStrategies.defensive === "bend_dont_break") {
            eaglesStrategyDefenceMod = 0; // Changed from -1 to 0
            logToGameSim("Bend Don't Break strategy active: Aim to prevent big plays, may concede shorter gains.");
        } else if (gameState.playerStrategies.defensive === "shutdown_star") {
            eaglesStrategyDefenceMod = 1; // Small general boost
            if (gameState.jakeHarrisSkills.cricketersComposure) {
                composureDefenceBoost = 1;
                logToGameSim("Cricketer's Composure enhances Shutdown Star! +1 to Eagles Defence Modifier for this play.");
            }
        }

        // --- Determine Opponent AI Strategy Dynamically ---
        const opponentStrategies = getOpponentStrategy(eaglesScore, opponentScore, currentDown, yardsToGo, ballOnYardLine, currentPlayNumber, TOTAL_PLAYS_PER_GAME);
        opponent.currentOffensiveStrategy = opponentStrategies.offensive;
        opponent.currentDefensiveStrategy = opponentStrategies.defensive;
        
        if (attackerIsEagles) { // Eagles on Offense, Opponent on Defense
            logToGameSim(`${opponent.opponentName} Defensive Strategy: ${opponent.currentDefensiveStrategy}`);
            if (opponent.currentDefensiveStrategy === "blitz_heavy_defense") opponentStrategyDefenceMod = 2;
            else if (opponent.currentDefensiveStrategy === "standard_defense") opponentStrategyDefenceMod = 0;
            // Add other opponent defensive strategies here
        } else { // Opponent on Offense, Eagles on Defense
            logToGameSim(`${opponent.opponentName} Offensive Strategy: ${opponent.currentOffensiveStrategy}`);
            if (opponent.currentOffensiveStrategy === "aggressive_pass") opponentStrategyOffenceMod = 2;
            else if (opponent.currentOffensiveStrategy === "conservative_run") opponentStrategyOffenceMod = -1;
            // Add other opponent offensive strategies here
        }


        if (attackerIsEagles) {
            attackingTeamModifier = eaglesOffenceModifier + eaglesStrategyOffenceMod;
            defendingTeamModifier = opponentDefenceModifier + opponentStrategyDefenceMod; // opponentStrategyDefenceMod is from AI
            logToGameSim(`Eagles Offense (BaseMod: ${eaglesOffenceModifier}, StratMod: ${eaglesStrategyOffenceMod} = Total: ${attackingTeamModifier}) vs. ${opponent.opponentName} Defense (BaseMod: ${opponentDefenceModifier}, StratMod: ${opponentStrategyDefenceMod} = Total: ${defendingTeamModifier})`);
        } else { // Opponent on Offense
            attackingTeamModifier = opponentOffenceModifier + opponentStrategyOffenceMod; // opponentStrategyOffenceMod is from AI
            defendingTeamModifier = eaglesDefenceModifier + eaglesStrategyDefenceMod + composureDefenceBoost; // Added composureDefenceBoost
            logToGameSim(`${opponent.opponentName} Offense (BaseMod: ${opponentOffenceModifier}, StratMod: ${opponentStrategyOffenceMod} = Total: ${attackingTeamModifier}) vs. Eagles Defense (BaseMod: ${eaglesDefenceModifier}, StratMod: ${eaglesStrategyDefenceMod}, ComposureBoost: ${composureDefenceBoost} = Total: ${defendingTeamModifier})`);
        }

        const attackRoll = Math.floor(Math.random() * 20) + 1;
        const defenceRoll = Math.floor(Math.random() * 20) + 1;

        // --- Apply Key Player Impact Modifier (Refined) ---
        if (attackerIsEagles) { // Eagles on Offense
            const keyOffensivePlayer = selectKeyPlayer(eaglesRoster, 'Eagles', true);
            if (keyOffensivePlayer) {
                let impact = 0;
                const baseSkill = keyOffensivePlayer.skills.offence || 50;
                if (baseSkill > 75) { // Threshold for impact
                    impact = Math.max(0, Math.min(3, Math.round((baseSkill - 70) / 10)));
                }
                // Morale Modifier for impact
                if (keyOffensivePlayer.morale > 80) impact += 1;
                else if (keyOffensivePlayer.morale < 40) impact -= 1;
                
                // realStatsSummary check for additional impact boost
                if (keyOffensivePlayer.realStatsSummary && (keyOffensivePlayer.realStatsSummary.toLowerCase().includes("mvp") || keyOffensivePlayer.realStatsSummary.toLowerCase().includes("all-pro"))) {
                    impact +=1; // Small boost for highly acclaimed players
                }
                impact = Math.max(0, Math.min(4, impact)); // Clamp final impact, allow slightly higher max with all boosts

                if (impact > 0) {
                    // "Hero Ball" trait integration for Eagles offensive player
                    if (keyOffensivePlayer.uniqueTraitName === "Hero Ball" && Math.random() < 0.15) { // 15% chance for Hero Ball to activate
                        const heroBoost = Math.random() < 0.7 ? 1 : 2; // +1 or +2 extra
                        impact += heroBoost;
                        impact = Math.min(5, impact); // Cap total impact from hero ball slightly higher
                        logToGameSim(`HERO BALL! ${keyOffensivePlayer.name} makes a spectacular play! Impact further boosted by +${heroBoost}.`);
                    }
                    attackingTeamModifier += impact;
                    logToGameSim(`Eagles Key Player (Offense): ${keyOffensivePlayer.name} (Morale: ${keyOffensivePlayer.morale}, Stats: ${keyOffensivePlayer.realStatsSummary || 'N/A'}) adds +${impact} offensive impact!`);
                }
            }
        } else { // Opponent on Offense
            const keyOppOffensivePlayer = selectKeyPlayer(opponentRoster, 'Opponent', true);
            if (keyOppOffensivePlayer) {
                let impact = 0;
                const baseSkill = keyOppOffensivePlayer.skills.offence || 50;
                if (baseSkill > 75) {
                     impact = Math.max(0, Math.min(3, Math.round((baseSkill - 70) / 10)));
                }
                if (keyOppOffensivePlayer.morale > 80) impact += 1;
                else if (keyOppOffensivePlayer.morale < 40) impact -=1;

                if (keyOppOffensivePlayer.realStatsSummary && (keyOppOffensivePlayer.realStatsSummary.toLowerCase().includes("mvp") || keyOppOffensivePlayer.realStatsSummary.toLowerCase().includes("all-pro"))) {
                    impact +=1;
                }
                impact = Math.max(0, Math.min(4, impact));

                if (impact > 0) {
                    attackingTeamModifier += impact; // Opponent's attack gets stronger
                    logToGameSim(`Opponent Key Player (Offense): ${keyOppOffensivePlayer.name} (Morale: ${keyOppOffensivePlayer.morale}, Stats: ${keyOppOffensivePlayer.realStatsSummary || 'N/A'}) adds +${impact} offensive impact!`);
                }
            }
        }

        // Defensive Key Player Impact
        if (!attackerIsEagles) { // Eagles on Defense
            const keyDefensivePlayer = selectKeyPlayer(eaglesRoster, 'Eagles', false);
            if (keyDefensivePlayer) {
                let impact = 0;
                const baseSkill = keyDefensivePlayer.skills.defence || 50;
                 if (baseSkill > 75) {
                    impact = Math.max(0, Math.min(3, Math.round((baseSkill - 70) / 10)));
                }
                if (keyDefensivePlayer.morale > 80) impact += 1;
                else if (keyDefensivePlayer.morale < 40) impact -=1;

                if (keyDefensivePlayer.realStatsSummary && (keyDefensivePlayer.realStatsSummary.toLowerCase().includes("all-pro") || keyDefensivePlayer.realStatsSummary.toLowerCase().includes("top defender"))) {
                    impact +=1;
                }
                impact = Math.max(0, Math.min(4, impact));
                
                if (impact > 0) {
                    defendingTeamModifier += impact; // Eagles' defense gets stronger
                    logToGameSim(`Eagles Key Player (Defense): ${keyDefensivePlayer.name} (Morale: ${keyDefensivePlayer.morale}, Stats: ${keyDefensivePlayer.realStatsSummary || 'N/A'}) adds +${impact} defensive impact!`);
                }
            }
        } else { // Opponent on Defense
            const keyOppDefensivePlayer = selectKeyPlayer(opponentRoster, 'Opponent', false);
             if (keyOppDefensivePlayer) {
                let impact = 0;
                const baseSkill = keyOppDefensivePlayer.skills.defence || 50;
                if (baseSkill > 75) {
                    impact = Math.max(0, Math.min(3, Math.round((baseSkill - 70) / 10)));
                }
                if (keyOppDefensivePlayer.morale > 80) impact += 1;
                else if (keyOppDefensivePlayer.morale < 40) impact -=1;
                
                if (keyOppDefensivePlayer.realStatsSummary && (keyOppDefensivePlayer.realStatsSummary.toLowerCase().includes("all-pro") || keyOppDefensivePlayer.realStatsSummary.toLowerCase().includes("top defender"))) {
                    impact +=1;
                }
                impact = Math.max(0, Math.min(4, impact));

                if (impact > 0) {
                    defendingTeamModifier += impact; // Opponent's defense gets stronger
                    logToGameSim(`Opponent Key Player (Defense): ${keyOppDefensivePlayer.name} (Morale: ${keyOppDefensivePlayer.morale}, Stats: ${keyOppDefensivePlayer.realStatsSummary || 'N/A'}) adds +${impact} defensive impact!`);
                }
            }
        }

        const attackScore = attackRoll + attackingTeamModifier;
        const defenceScore = defenceRoll + defendingTeamModifier;
        let playAdvantage = attackScore - defenceScore; // Make playAdvantage mutable for strategy adjustments

        // Cricketer's Composure: Offensive PlayAdvantage modification in critical moments
        if (attackerIsEagles && gameState.jakeHarrisSkills.cricketersComposure) {
            const isLateGameCritical = currentPlayNumber > TOTAL_PLAYS_PER_GAME * 0.75;
            const isScoreCloseCritical = Math.abs(eaglesScore - opponentScore) <= 7;
            const isDownCritical = currentDown >= 3;

            if (isLateGameCritical && isScoreCloseCritical && isDownCritical) {
                if (Math.random() < 0.25) { // 25% chance to trigger composure effect
                    let composureEffect = 0;
                    if (playAdvantage >= -3 && playAdvantage <= 3) { // If play was marginal
                        composureEffect = Math.floor(Math.random() * 2) + 2; // +2 or +3
                        playAdvantage += composureEffect;
                        logToGameSim(`CRICKETER'S COMPOSURE! Eagles gain +${composureEffect} Play Advantage in a critical moment! New PA: ${playAdvantage}`);
                    } else if (playAdvantage < -7) { // If play was very bad
                        composureEffect = Math.floor(Math.random() * 2) + 1; // Mitigate by +1 or +2
                        playAdvantage += composureEffect;
                        logToGameSim(`CRICKETER'S COMPOSURE! Eagles mitigate a bad play by +${composureEffect} Play Advantage in a critical moment! New PA: ${playAdvantage}`);
                    }
                }
            }
        }

        // Apply "conservative_run" outcome modifications (Eagles on Offense)
        if (attackerIsEagles && gameState.playerStrategies.offensive === "conservative_run") {
            if (playAdvantage >= 12) { // Was a "Breakthrough Play!"
                playAdvantage = 11; // Cap at top of "Solid Gain"
                logToGameSim("Conservative Run: Capped potential breakthrough to a solid gain.");
            }
            if (playAdvantage <= -12) { // Was a "Disaster for Offence"
                playAdvantage = -11; // Mitigate to "Major Defensive Win"
                logToGameSim("Conservative Run: Mitigated potential disaster to a major defensive win.");
            }
        }

        // Apply "bend_dont_break" outcome modifications (Eagles on Defense)
        if (!attackerIsEagles && gameState.playerStrategies.defensive === "bend_dont_break") {
            if (playAdvantage >= 12) { // Opponent was heading for a "Breakthrough Play!"
                playAdvantage = 11; // Cap at top of "Solid Gain" for opponent
                logToGameSim("Bend Don't Break: Prevented opponent breakthrough, capped to solid gain.");
            } else if (playAdvantage >= 1 && playAdvantage <= 3) { // Opponent had "Minimal Gain"
                // Slightly increase chance of it becoming a "Positive Gain"
                if (Math.random() < 0.33) { // 33% chance to nudge up
                    playAdvantage = Math.min(7, playAdvantage + 3); // Nudge towards/into Positive Gain category
                    logToGameSim("Bend Don't Break: Opponent's minimal gain potentially becomes a positive gain.");
                }
            }
        }

        logToGameSim(`Attack Roll: ${attackRoll} + Mod ${attackingTeamModifier} = ${attackScore}. Defence Roll: ${defenceRoll} + Mod ${defendingTeamModifier} = ${defenceScore}. Final Play Advantage: ${playAdvantage}`);

        const outcome = getPlayOutcomeFromAdvantage(playAdvantage);
        let yardageGained = outcome.yardage;
        let playDescription = outcome.category;
        let turnover = false;
        let scoreEvent = null; // 'TD', 'FG_GOOD', 'SAFETY'

        // Refine "blitz_heavy" strategy: Amplify opponent's gain if blitz fails badly
        if (!attackerIsEagles && gameState.playerStrategies.defensive === "blitz_heavy") { // Eagles on defense with blitz
            if (playAdvantage > 7) { // Opponent won the roll significantly (e.g., PlayAdvantage for Opponent is high)
                const blitzBackfireBonus = Math.floor(Math.random() * 6) + 5; // Opponent gets extra 5-10 yards
                yardageGained += blitzBackfireBonus;
                playDescription += ` (Blitz Backfire! +${blitzBackfireBonus} yds)`;
                logToGameSim(`Blitz Heavy strategy backfires! Opponent gains an extra ${blitzBackfireBonus} yards.`);
            }
        }
        // Note: If opponent is blitzing, a similar logic could be added if attackerIsEagles and opponent.currentStrategy includes a blitz.

        // Apply yardage
        if (attackerIsEagles) {
            ballOnYardLine += yardageGained;
        } else {
            ballOnYardLine -= yardageGained; // Yardage is from offensive perspective
        }
        
        logToGameSim(`${attackerIsEagles ? "Eagles" : opponent.opponentName} play: ${playDescription}. Yards: ${yardageGained}.`);

        // Safety Check
        let safetyOccurred = false;
        if (attackerIsEagles && ballOnYardLine <= 0) {
            logToGameSim("SAFETY! Eagles tackled in their own endzone.", true);
            playAudio('sfx_safety');
            opponentScore += 2;
            scoreEvent = 'SAFETY_OPPONENT';
            safetyOccurred = true;
            currentPossessionEagles = false; // Opponent gets ball
            ballOnYardLine = 75; // Opponent starts at their 25 (Eagles' 75) after free kick
            currentDown = 1; yardsToGo = 10;
        } else if (!attackerIsEagles && ballOnYardLine >= 100) {
            logToGameSim(`SAFETY! ${opponent.opponentName} tackled in their own endzone.`, true);
            playAudio('sfx_safety');
            eaglesScore += 2;
            scoreEvent = 'SAFETY_EAGLES';
            safetyOccurred = true;
            currentPossessionEagles = true; // Eagles get ball
            ballOnYardLine = 25; // Eagles start at their 25 after free kick
            currentDown = 1; yardsToGo = 10;
        }

        // Touchdown Check (only if no safety)
        if (!safetyOccurred && attackerIsEagles && ballOnYardLine >= 100) {
            logToGameSim("TOUCHDOWN EAGLES!", true);
            eaglesScore += 6;
            scoreEvent = 'TD_EAGLES';
            // PAT Attempt
            const patResultEagles = await getPATDecisionAndOutcome(true, eaglesScore, opponentScore);
            eaglesScore += patResultEagles.points;
            // End PAT
            currentPossessionEagles = false; // Opponent gets ball
            ballOnYardLine = 75; // Kickoff to opponent's 25
            currentDown = 1; yardsToGo = 10;
            window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
            window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
        } else if (!safetyOccurred && !attackerIsEagles && ballOnYardLine <= 0) {
            logToGameSim(`TOUCHDOWN ${opponent.opponentName}!`, true);
            opponentScore += 6;
            scoreEvent = 'TD_OPPONENT';
            // PAT Attempt
            const patResultOpponent = await getPATDecisionAndOutcome(false, eaglesScore, opponentScore);
            opponentScore += patResultOpponent.points;
            // End PAT
            currentPossessionEagles = true; // Eagles get ball
            ballOnYardLine = 25; // Kickoff to Eagles' 25
            currentDown = 1; yardsToGo = 10;
            window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
            window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
        } else {
            // No TD, continue down logic
            yardsToGo -= yardageGained;
            if (yardsToGo <= 0) {
                logToGameSim("First Down!");
                if (!firstDownSoundPlayedThisQuarter) {
                    playAudio('sfx_first_down');
                    firstDownSoundPlayedThisQuarter = true;
                }
                currentDown = 1;
                yardsToGo = 10;
            } else {
                currentDown++;
            }
        }
        
        // Turnover on Downs
        if (currentDown > 4 && !scoreEvent) { // Don't flip possession if a TD just happened on 4th
            logToGameSim(`Turnover on downs! ${currentPossessionEagles ? opponent.opponentName : "Eagles"} ball.`);
            currentPossessionEagles = !currentPossessionEagles;
            ballOnYardLine = 100 - ballOnYardLine; // Flip field position
            currentDown = 1;
            yardsToGo = 10;
            turnover = true; // To signify end of possession for animation/visualizer
            window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
            window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
        }

        // --- Refined Turnover Check with d100 and BallSecurityModifier ---
        let baseTurnoverChance = 0;
        if (outcome.event === "TURNOVER_RISK_VERY_HIGH") {
            baseTurnoverChance = 25; // Reduced base risk slightly
        } else if (outcome.event === "TURNOVER_RISK_INCREASED") {
            baseTurnoverChance = 10; // Reduced base risk slightly
        }

        if (baseTurnoverChance > 0) {
            let finalTurnoverChance = baseTurnoverChance;

            // 1. PlayAdvantage Effect (Offensive perspective: negative advantage increases chance)
            // If playAdvantage is -12 (Disaster), adds 24% chance. If -8 (Major Def Win), adds 16%.
            const playAdvantageEffect = Math.max(0, -playAdvantage * 2); 
            finalTurnoverChance += playAdvantageEffect;

            // 2. Strategy & BallSecurityModifier Effect (for Eagles only currently)
            let ballSecurityModifierValue = 0; // Higher is better for offense (reduces chance)
            let offensiveStrategyFactor = 0; // Positive increases chance, negative decreases

            if (attackerIsEagles) {
                if (gameState.playerStrategies.offensive === "aggressive_pass") {
                    offensiveStrategyFactor = 20; // Aggressive pass adds 20% to turnover chance (more risky)
                    logToGameSim("Aggressive Pass strategy: +20% turnover chance.");
                } else if (gameState.playerStrategies.offensive === "conservative_run") {
                    ballSecurityModifierValue = 20; // Conservative run provides +20 ball security (reduces chance)
                    logToGameSim("Conservative Run strategy: Ball Security +20 (reduces turnover chance).");
                }
            }
            // TODO: Implement for Opponent AI strategies if they have similar risk profiles

            finalTurnoverChance += offensiveStrategyFactor;
            finalTurnoverChance -= ballSecurityModifierValue;

            // 3. Defensive Player Trait Effect (e.g., "Ball Hawk")
            let defensiveTraitFactor = 0;
            if (!attackerIsEagles) { // Eagles are on defense
                const keyDefender = selectKeyPlayer(eaglesRoster, 'Eagles', false); // See if a key defender is making an impact
                if (keyDefender && keyDefender.uniqueTraitName === "Ball Hawk") {
                    defensiveTraitFactor = 15; // "Ball Hawk" adds 15% to turnover chance (more impactful)
                    logToGameSim(`Eagles Defensive Trait: ${keyDefender.name} (Ball Hawk) active! +15% turnover chance.`);
                }
            } else { // Opponent is on defense
                const keyOpponentDefender = selectKeyPlayer(opponentRoster, 'Opponent', false);
                if (keyOpponentDefender && keyOpponentDefender.uniqueTraitName === "Ball Hawk") { // Assuming opponents can have traits
                    defensiveTraitFactor = 15; // "Ball Hawk" adds 15% to turnover chance (more impactful)
                    logToGameSim(`Opponent Defensive Trait: ${keyOpponentDefender.name} (Ball Hawk) active! +15% turnover chance.`);
                }
            }
            finalTurnoverChance += defensiveTraitFactor;


            // Clamp final chance (e.g., 5% to 80% to allow for strong trait effects)
            finalTurnoverChance = Math.max(5, Math.min(80, finalTurnoverChance));
            
            logToGameSim(`Turnover Check: Base ${baseTurnoverChance}% + PA_Effect ${playAdvantageEffect}% + StratFactor ${offensiveStrategyFactor}% - BallSec ${ballSecurityModifierValue}% + DefTrait ${defensiveTraitFactor}% = Final ${finalTurnoverChance}%`);

            const turnoverRoll = Math.floor(Math.random() * 100) + 1; // d100 roll
            if (turnoverRoll <= finalTurnoverChance) {
                logToGameSim(`TURNOVER! (Rolled ${turnoverRoll} vs. Chance ${finalTurnoverChance}%)`, true);
                currentPossessionEagles = !currentPossessionEagles;
                ballOnYardLine = 100 - ballOnYardLine; // Flip field position
                // TODO: Add small random yardage for return later, or determine fumble/interception spot
                currentDown = 1; yardsToGo = 10;
                turnover = true;
                window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
                window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
                
                let turnoverType = "FUMBLE"; // Default
                let offensivePlayStyle = "balanced"; // Default

                if (attackerIsEagles) {
                    offensivePlayStyle = gameState.playerStrategies.offensive || "balanced";
                } else {
                    offensivePlayStyle = opponent.currentOffensiveStrategy || "balanced_offence";
                }

                if (offensivePlayStyle.includes("pass")) { // e.g., "aggressive_pass"
                    turnoverType = Math.random() < 0.75 ? "INTERCEPTION" : "FUMBLE"; // 75% chance Interception on pass plays
                    logToGameSim(`Pass-heavy play style (${offensivePlayStyle}) - turnover weighted towards Interception.`);
                } else if (offensivePlayStyle.includes("run")) { // e.g., "conservative_run"
                    turnoverType = Math.random() < 0.70 ? "FUMBLE" : "INTERCEPTION"; // 70% chance Fumble on run plays
                    logToGameSim(`Run-heavy play style (${offensivePlayStyle}) - turnover weighted towards Fumble.`);
                } else { // Balanced or other
                    turnoverType = Math.random() < 0.6 ? "FUMBLE" : "INTERCEPTION"; // Slightly more fumbles generally
                }
                
                logToGameSim(`Turnover type: ${turnoverType}`);
                playDescription += ` (${turnoverType})`; // Add to play description for visualizer
            } else {
                logToGameSim(`No turnover (Rolled ${turnoverRoll} vs. Chance ${finalTurnoverChance}%)`);
            }
        }
        // --- End Refined Turnover Check ---

        let fourthDownDecisionAction = null; 

        // --- 4th Down Decision Logic ---
        if (currentDown === 4 && !scoreEvent && !turnover) { 
            fourthDownDecisionAction = getFourthDownDecision(
                ballOnYardLine, 
                yardsToGo, 
                currentPlayNumber, 
                TOTAL_PLAYS_PER_GAME, 
                attackerIsEagles ? eaglesScore : opponentScore, 
                attackerIsEagles ? opponentScore : eaglesScore, 
                attackerIsEagles
            );

            if (fourthDownDecisionAction === "ATTEMPT_FG") {
                logToGameSim(`${attackerIsEagles ? "Eagles" : opponent.opponentName} line up for a Field Goal...`);
                const fgDistance = (attackerIsEagles ? (100 - ballOnYardLine) : ballOnYardLine) + 17;
                logToGameSim(`FG attempt from ${fgDistance} yards.`);
                
                const kickerModifier = attackerIsEagles ? eaglesSpecialTeamsKickerModifier : opponentSpecialTeamsKickerModifier;
                
                let distancePenalty = 0;
                if (fgDistance >= 30) {
                    distancePenalty = Math.floor((fgDistance - 30) / 3);
                }
                
                const fgRoll = Math.floor(Math.random() * 20) + 1;
                const successTarget = 10; // Base success target, can be adjusted for balance

                const fgScore = fgRoll + kickerModifier - distancePenalty;
                const fgIsGood = fgScore >= successTarget;

                logToGameSim(`FG Roll: ${fgRoll} + K_Mod ${kickerModifier} - DistPenalty ${distancePenalty} (for ${fgDistance}yds) = ${fgScore}. Needed >= ${successTarget}`);

                if (window.gameVisualizer && window.gameVisualizer.ctx) {
                    // Set ball position for FG animation (at the spot of the kick)
                    // The `ballOnYardLine` here is the game's current ball position (0-100 from Eagles' goal line).
                    // We need to convert this to the visualizer's pixel X.
                    window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, attackerIsEagles);
                    window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
                    
                    await window.gameVisualizer.animatePlay({
                        yards: 0, // FG animation is handled by animateFieldGoalKick, not yardage movement here
                        result: fgIsGood ? "FG_GOOD" : "FG_NO_GOOD",
                        playType: "Field Goal Attempt",
                        detailedPlayType: `Field Goal Attempt (${fgDistance} yds)`
                    }, attackerIsEagles ? 'Eagles' : 'Opponent');
                }

                if (fgIsGood) {
                    logToGameSim("FIELD GOAL IS GOOD!", true);
                    if (attackerIsEagles) eaglesScore += 3; else opponentScore += 3;
                    scoreEvent = 'FG_GOOD'; // Mark that a score happened
                    currentPossessionEagles = !attackerIsEagles; 
                    ballOnYardLine = currentPossessionEagles ? 25 : 75; 
                    currentDown = 1; yardsToGo = 10;
                    window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
                    window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
                } else {
                    logToGameSim("FIELD GOAL IS NO GOOD!", true);
                    currentPossessionEagles = !attackerIsEagles; 
                    ballOnYardLine = 100 - ballOnYardLine; 
                    currentDown = 1; yardsToGo = 10;
                    turnover = true; // Signifies possession change
                    window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
                    window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
                }
            } else if (fourthDownDecisionAction === "PUNT") {
                logToGameSim(`${attackerIsEagles ? "Eagles" : opponent.opponentName} elect to PUNT.`);
                playAudio('sfx_punt');
                const punterModifier = attackerIsEagles ? eaglesSpecialTeamsPunterModifier : opponentSpecialTeamsPunterModifier;
                const puntRoll = Math.floor(Math.random() * 20) + 1;
                let puntDistance = (puntRoll + punterModifier) * 2 + 20; // (d20 + PunterMod) * 2 + 20 yards
                puntDistance = Math.max(10, Math.min(70, puntDistance)); // Ensure punt distance is between 10 and 70 yards
                logToGameSim(`Punt Roll: ${puntRoll} + P_Mod ${punterModifier} = ${puntRoll + punterModifier}. Base Punt: ${(puntRoll + punterModifier) * 2 + 20}. Final Distance: ${puntDistance.toFixed(0)} yards.`);
                
                const originalBallOnYardLineForPunt = ballOnYardLine; // Store before modification

                if (attackerIsEagles) {
                    ballOnYardLine += puntDistance;
                } else {
                    ballOnYardLine -= puntDistance;
                }
                
                if (ballOnYardLine >= 100 && attackerIsEagles) { 
                    ballOnYardLine = 80; 
                    logToGameSim("Touchback. Ball on the 20.");
                } else if (ballOnYardLine <= 0 && !attackerIsEagles) { 
                    ballOnYardLine = 20; 
                    logToGameSim("Touchback. Ball on the 20.");
                }
                ballOnYardLine = Math.max(1, Math.min(99, ballOnYardLine)); // Clamp on field

                if (window.gameVisualizer && window.gameVisualizer.ctx) {
                    // Set ball position for Punt animation (at the spot of the kick)
                    // The `originalBallOnYardLineForPunt` is the game's current ball position (0-100 from Eagles' goal line).
                    // We need to convert this to the visualizer's pixel X.
                    window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(originalBallOnYardLineForPunt, attackerIsEagles);
                    window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;

                    await window.gameVisualizer.animatePlay({
                        yards: puntDistance, // Pass positive punt distance, direction handled by actingTeam
                        result: "Punt",
                        playType: "Punt",
                        detailedPlayType: `Punt (${puntDistance.toFixed(0)} yds from own ${attackerIsEagles ? originalBallOnYardLineForPunt : 100 - originalBallOnYardLineForPunt})`
                    }, attackerIsEagles ? 'Eagles' : 'Opponent');
                }

                currentPossessionEagles = !attackerIsEagles;
                ballOnYardLine = 100 - ballOnYardLine; 
                currentDown = 1; yardsToGo = 10;
                turnover = true; 
                window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
                window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
            }
            // If "GO_FOR_IT", normal play logic below will handle it.
        }
        // --- End 4th Down Decision ---


        // Update Visualizer - Only call animatePlay if it wasn't a special teams play that already animated
        if (window.gameVisualizer && window.gameVisualizer.ctx && !(fourthDownDecisionAction === "ATTEMPT_FG" || fourthDownDecisionAction === "PUNT")) {
            const pseudoQuarter = Math.ceil(currentPlayNumber / (TOTAL_PLAYS_PER_GAME / 4));
            window.gameVisualizer.setScore(eaglesScore, opponentScore, pseudoQuarter);
            window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
            window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, gameState.eaglesChallengesLeft, 3);
            
            // Set visualizer ball position before regular play animation
            // The `ballOnYardLine` here is the game's current ball position *after* the play's yardage has been applied.
            // We need the position *before* the play for the animation's starting point.
            const playStartingBallOnYardLine = attackerIsEagles ? (ballOnYardLine - yardageGained) : (ballOnYardLine + yardageGained);
            window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(playStartingBallOnYardLine, attackerIsEagles);
            window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;


            let animPlayType = outcome.category;
            if (scoreEvent === 'TD_EAGLES' || scoreEvent === 'TD_OPPONENT') animPlayType = "Touchdown!";
            else if (turnover) animPlayType = "Turnover!";

            await window.gameVisualizer.animatePlay({
                yards: yardageGained,
                result: scoreEvent || (turnover ? "Turnover" : `${yardageGained} yd gain`), // Pass TD_EAGLES/TD_OPPONENT if it's a score
                playType: animPlayType,
                detailedPlayType: playDescription
            }, attackerIsEagles ? 'Eagles' : 'Opponent');
        }
        
        // If possession changed due to score or turnover, reset down for new possession
        if (scoreEvent || turnover) {
            currentDown = 1;
            yardsToGo = 10;
            // Ball position already set for kickoff/turnover spot
            if (window.gameVisualizer && window.gameVisualizer.ctx) {
                 window.gameVisualizer.setPossession(currentPossessionEagles ? 'Eagles' : 'Opponent');
                 window.gameVisualizer.updateGameSituation(currentDown, yardsToGo, gameState.eaglesChallengesLeft, 3);
            }
        }
        
        // Ensure ballOnYardLine stays within 0-100 (e.g. after a long gain from deep)
        // This is a rough clamp, actual goal line logic is above. This prevents ball from going "past" 100.
        ballOnYardLine = Math.max(0, Math.min(100, ballOnYardLine));

        // Safety Check - Update visualizer ball position after safety
        if (safetyOccurred) {
            window.gameVisualizer.ballPosition.x = window.gameVisualizer.getPixelXFromGameYardLine(ballOnYardLine, currentPossessionEagles);
            window.gameVisualizer.ballPosition.y = window.gameVisualizer.canvas.height / 2;
        }

        // Brief pause between plays
        await new Promise(resolve => setTimeout(resolve, 750)); // 0.75 second pause

        // Play end of quarter whistle
        const playsPerQuarter = TOTAL_PLAYS_PER_GAME / 4;
        if (currentPlayNumber % playsPerQuarter === 0 && currentPlayNumber < TOTAL_PLAYS_PER_GAME) {
            logToGameSim(`--- End of Quarter ${currentPlayNumber / playsPerQuarter} ---`, true);
            playAudio('sfx_whistle_end_quarter');
            firstDownSoundPlayedThisQuarter = false; // Reset for the new quarter
            await new Promise(resolve => setTimeout(resolve, 1500)); // Longer pause for quarter end
        }
    } // End of main play loop

    logToGameSim(`--- FINAL SCORE --- Eagles ${eaglesScore} - ${opponent.opponentName} ${opponentScore}`, true);
    const win = eaglesScore > opponentScore;
    let moraleChangeText = ""; // Placeholder for morale changes

    let advertiserRevenue = 0;
    if (win) {
        gameState.seasonWins++;
        logToGameSim("EAGLES WIN!", true);
        moraleChangeText = "Team morale boosted by the win!";
        advertiserRevenue = 5000000; // Base revenue for a win
    } else if (eaglesScore < opponentScore) {
        gameState.seasonLosses++;
        logToGameSim("Eagles lose.", true);
        moraleChangeText = "Team morale took a hit after the loss.";
        advertiserRevenue = 1000000; // Base revenue for a loss
    } else {
        logToGameSim("It's a TIE!", true);
        moraleChangeText = "A hard-fought tie. Mixed feelings in the locker room.";
        advertiserRevenue = 2500000; // Base revenue for a tie (mid-point)
    }

    // Apply Eco-Fiscal Modifier to advertiser revenue
    // Formula: baseAmount * (1 + (gmReputation.ecoFiscal - 50) / 50 * 0.2)
    const ecoFiscalModifier = (gameState.gmReputation.ecoFiscal - 50) / 50 * 0.2;
    advertiserRevenue = Math.floor(advertiserRevenue * (1 + ecoFiscalModifier));
    gameState.teamBudget += advertiserRevenue;
    showNotification(`Advertiser Revenue: $${advertiserRevenue.toLocaleString()} added to budget!`, false, 4000, 'bottom');


    gameState.currentOpponentIndex++; // Move to next opponent for next game if any

    // Display results
    const finishEarlyButton = document.getElementById('finish-game-early');
    if (finishEarlyButton) {
        finishEarlyButton.style.display = 'block'; // Should already be hidden by renderDecisionPointUI if that was active
        finishEarlyButton.onclick = () => {
            renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
        };
        // Auto-proceed after a delay
        setTimeout(() => {
            if (gameState.currentScreen === 'gameDaySim') { // Ensure we are still on sim screen
                renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
            }
        }, 2000); // Shorter delay for new sim
    } else {
        // Fallback if button not found (should not happen if screen rendered correctly)
        renderGameResultScreen({ win: win, eaglesScore: eaglesScore, opponentScore: opponentScore, opponentName: opponent.opponentName, moraleChangeText: moraleChangeText });
    }
}


function showNotification(message, isError = false, duration = 3000, position = 'top') {
    // Removed notification sound effect as requested.
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
    const baseBudget = 150000000; // Define the base budget
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

    getPixelXFromGameYardLine: function(gameYardLine, isEaglesAttacking) {
        // gameYardLine is 0-100 from the perspective of the attacking team.
        // 0 is their own goal line, 100 is the opponent's goal line they are trying to reach.
        
        const endZoneVisualWidth = this.yardLineSpacing * 1.5; // Visual width of endzone on canvas
        
        // Define pixel X coordinates of the goal lines on the canvas
        // Opponent's goal line (left side of field, where Eagles score by reaching it from the right)
        const opponentGoalLinePixelX = this.fieldPadding + endZoneVisualWidth;
        // Eagles' goal line (right side of field, where Opponent scores by reaching it from the left)
        const eaglesGoalLinePixelX = this.canvas.width - this.fieldPadding - endZoneVisualWidth;
        
        const playableFieldWidthPixels = eaglesGoalLinePixelX - opponentGoalLinePixelX;
        const pixelsPerGameYard = playableFieldWidthPixels / 100;

        let pixelX;
        if (isEaglesAttacking) {
            // Eagles attack from right to left on canvas.
            // Their 0-yard line (own goal) corresponds to eaglesGoalLinePixelX.
            // Their 100-yard line (opponent's goal) corresponds to opponentGoalLinePixelX.
            pixelX = eaglesGoalLinePixelX - (gameYardLine * pixelsPerGameYard);
        } else { // Opponent is attacking
            // Opponent attacks from left to right on canvas.
            // Their 0-yard line (own goal) corresponds to opponentGoalLinePixelX.
            // Their 100-yard line (Eagles' goal) corresponds to eaglesGoalLinePixelX.
            pixelX = opponentGoalLinePixelX + (gameYardLine * pixelsPerGameYard);
        }
        
        // Clamp to ensure ball stays visually on/near the field, adjust with playerIconRadius if needed for edges
        return Math.max(this.fieldPadding + this.playerIconRadius, Math.min(this.canvas.width - this.fieldPadding - this.playerIconRadius, pixelX));
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

    animatePlay: async function(playData, actingTeam) { // { yards: number, result: string, playType?: string, detailedPlayType?: string }, actingTeam: 'Eagles' or 'Opponent'
        return new Promise(async (resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animatePlay.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            // const initialPossessingTeam = this.possessingTeam; // No longer relying on this.possessingTeam for animation logic
            console.log(`Visualizer: Animating play for ${actingTeam}`, playData);

            const pixelsPerYard = this.yardLineSpacing / 10; // This is visual pixels per 10 game yards on the main field display
            // Corrected yardageSign for canvas coordinates:
            // Eagles gain yards by moving LEFT (decreasing X).
            // Opponent gains yards by moving RIGHT (increasing X).
            let yardageSign = (actingTeam === 'Eagles') ? -1 : 1; 
            const endZoneEntryDepth = this.yardLineSpacing * 0.5; // How far into the endzone the animation goes for a TD

            let targetX;
            if (playData.result === 'TD' || (playData.result && playData.result.startsWith('TD_'))) { // Check for TD_EAGLES or TD_OPPONENT as well
                // Ensure the animation target is clearly within the endzone
                if (actingTeam === 'Eagles') {
                    targetX = this.canvas.width - this.fieldPadding - endZoneEntryDepth;
                } else { // Opponent scoring in Eagles' endzone (left side of canvas)
                    targetX = this.fieldPadding + endZoneEntryDepth;
                }
                logToGameSim(`Visualizer: TD animation target set to ${targetX} for ${actingTeam}`);
            } else {
                targetX = this.ballPosition.x + (playData.yards * pixelsPerYard * yardageSign);
            }

            // Clamp targetX to be within playable field boundaries, respecting player icon radius
            // The endzone target for TD is already set to be within bounds.
            if (playData.result !== 'TD') {
                targetX = Math.min(this.canvas.width - this.fieldPadding - this.playerIconRadius, Math.max(this.fieldPadding + this.playerIconRadius, targetX));
            }

            let animationDuration = 1500; 
            let playTypeDuration = 3000; // Show play type for 3 seconds

            // Adjust durations for smaller plays
            const smallPlayCategories = ["Minimal Gain", "Positive Gain", "Solid Gain", "No Gain / Stalemate", "Loss / Disruption", "Significant Stop"];
            if (playData.playType && smallPlayCategories.includes(playData.playType)) {
                animationDuration = 375; // Increased from 250
                playTypeDuration = 750; // Increased from 625
                console.log(`Adjusting animation for small play: ${playData.playType}`);
            }

            let animationStartTime = null;
            const startX = this.ballPosition.x;
            const displayPlayType = playData.detailedPlayType || playData.playType || (actingTeam === "Eagles" ? "Eagles Play" : "Opponent Play");
            let playTypeShownTime = 0;

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
                    this.drawField(); // Final draw after animation, ensures play type text is cleared
                    this.drawPlayerIconWithBall();

                    if (displayPlayType.includes("Field Goal Attempt")) { // Check based on displayPlayType
                        await this.animateFieldGoalKick(actingTeam, playData.result === "FG_GOOD");
                    } else if (playData.result && playData.result.startsWith('TD_')) {
                        await this.animateScore(actingTeam, 'TD');
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

    animateFieldGoalKick: async function(actingTeam, isGood) {
        return new Promise(async (resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animateFieldGoalKick.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            // Removed console.log for animating Field Goal Kick

            const uprights = {
                x: actingTeam === 'Eagles' ? this.canvas.width - this.fieldPadding - this.endZoneHeight * 0.2 : this.fieldPadding + this.endZoneHeight * 0.2, // Approx goal line
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
                    await this.animateScore(actingTeam, isGood ? 'FG_GOOD' : 'FG_NO_GOOD');
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

    animateScore: function(actingTeam, type) { // type: 'TD', 'FG_GOOD', 'FG_NO_GOOD', actingTeam: 'Eagles' or 'Opponent'
        return new Promise((resolve) => {
            if (!this.ctx || !this.canvas) {
                console.warn("Visualizer context or canvas not available for animateScore.");
                resolve(); // Resolve immediately if visualizer isn't ready
                return;
            }
            // Removed console.log for animating score type
            if (type === 'TD') {
                const endZoneWidth = this.yardLineSpacing * 1.5;
                const opponentEndZoneBoundary = this.fieldPadding + endZoneWidth; // Right edge of opponent's endzone (lower X values)
                const eaglesEndZoneBoundary = this.canvas.width - this.fieldPadding - endZoneWidth; // Left edge of Eagles' endzone (higher X values)
                // Removed console.log for TD animation ball position
            }
            let message = "EVENT!";
            if (type === 'TD') {
                message = "TOUCHDOWN!";
                playAudio('sfx_touchdown');
            } else if (type === 'FG_GOOD') {
                message = "FIELD GOAL IS GOOD!";
                playAudio('sfx_field_goal_good');
            } else if (type === 'FG_NO_GOOD') {
                message = "FIELD GOAL IS NO GOOD!";
                playAudio('sfx_field_goal_no_good');
            }
            
            let animationTime = 0;
            const textDuration = 1500; 
            const logoFlashDuration = 1000;
            const confettiDuration = 2000;
            const totalDuration = textDuration + (type === 'TD' ? logoFlashDuration + confettiDuration : (type.includes('FG') ? 500 : 0 ) ); // FG text lingers a bit less

            const pulseSpeed = 500; 
            const baseFontSize = type === 'TD' ? 48 : (type.includes('FG') ? 40 : 36);
            const maxFontIncrease = type === 'TD' ? 12 : (type.includes('FG') ? 10 : 8);

            const scoringTeamLogo = (actingTeam === 'Eagles' && this.eaglesLogoLoaded) ? this.eaglesLogoImg : (this.opponentLogoLoaded ? this.opponentLogoImg : null);
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
                this.ctx.fillStyle = actingTeam === 'Eagles' ? this.homeTeamColor : this.awayTeamColor;
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
                    this.initConfetti(actingTeam === 'Eagles' ? this.homeTeamColor : this.awayTeamColor, actingTeam === 'Eagles' ? '#A5ACAF' : '#FFFFFF');
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
        const message = turnoverType.toUpperCase(); // Use the passed turnoverType

        if (message.includes("INTERCEPTION")) {
            playAudio('sfx_turnover_interception');
        } else if (message.includes("FUMBLE")) {
            playAudio('sfx_turnover_fumble');
        } else {
            // Fallback for generic turnover if needed, or no sound
        }

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
