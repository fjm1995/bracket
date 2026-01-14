export interface Participant {
  id: string;
  name: string;
  gamePoints: number;
}

export interface Match {
  id: string;
  round: number;
  position: number;
  participant1?: Participant | null;
  participant2?: Participant | null;
  participant1Score: number;
  participant2Score: number;
  winner?: Participant | null;
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  scoringMode: ScoringMode;
  scoreLabel: string;
  targetScore?: number;
  participants: Participant[];
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  createdAt: number;
  updatedAt: number;
}

export interface TournamentState {
  tournaments: Tournament[];
  activeTournamentId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type ScoringMode = 'higher_score' | 'best_of' | 'lower_score';

export type TournamentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; game: string; scoringMode: ScoringMode; scoreLabel: string; targetScore?: number } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_PARTICIPANT'; payload: { tournamentId: string; name: string } }
  | { type: 'UPDATE_MATCH'; payload: { tournamentId: string; matchId: string; participant1Score: number; participant2Score: number } }
  | { type: 'SET_ACTIVE_TOURNAMENT'; payload: string | null }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: { tournamentId: string; participantId: string; name: string } }
  | { type: 'REMOVE_PARTICIPANT'; payload: { tournamentId: string; participantId: string } }
  | { type: 'IMPORT_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'RESET_TOURNAMENT'; payload: string };

export interface GameConfig {
  name: string;
  description: string;
  example: string;
  scoringMode: ScoringMode;
  scoreLabel: string;
  targetScore?: number;
}

export const GAME_RULES: Record<string, GameConfig> = {
  // Sports Games - Higher Score Wins
  'NBA 2K': {
    name: 'NBA 2K',
    description: 'Basketball simulation. Player with the higher final score wins the match.',
    example: 'Player A: 87 pts, Player B: 82 pts → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Points'
  },
  'Madden NFL': {
    name: 'Madden NFL',
    description: 'Football simulation. Player with the higher final score wins the match.',
    example: 'Player A: 28 pts, Player B: 21 pts → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Points'
  },
  'EA FC (FIFA)': {
    name: 'EA FC (FIFA)',
    description: 'Soccer simulation. Player with more goals wins. Overtime/penalties if tied.',
    example: 'Player A: 3 goals, Player B: 1 goal → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Goals'
  },
  'Rocket League': {
    name: 'Rocket League',
    description: 'Car soccer. Team/player with more goals wins.',
    example: 'Player A: 5 goals, Player B: 3 goals → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Goals'
  },
  'MLB The Show': {
    name: 'MLB The Show',
    description: 'Baseball simulation. Player with more runs wins.',
    example: 'Player A: 7 runs, Player B: 4 runs → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Runs'
  },
  'NHL': {
    name: 'NHL',
    description: 'Hockey simulation. Player with more goals wins.',
    example: 'Player A: 4 goals, Player B: 2 goals → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Goals'
  },

  // Fighting/Battle Games - Best of X Rounds
  'Fortnite (Box Fights)': {
    name: 'Fortnite (Box Fights)',
    description: '1v1 box fights or build battles. First to win 3 rounds advances.',
    example: 'Player A: 3 wins, Player B: 1 win → Player A wins (Best of 5)',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 3
  },
  'Fortnite (Kill Race)': {
    name: 'Fortnite (Kill Race)',
    description: 'Battle royale kill race. Player with more eliminations wins.',
    example: 'Player A: 8 kills, Player B: 5 kills → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Kills'
  },
  'Super Smash Bros': {
    name: 'Super Smash Bros',
    description: 'Platform fighter. First to win 3 matches (stocks) advances.',
    example: 'Player A: 3 wins, Player B: 2 wins → Player A wins (Best of 5)',
    scoringMode: 'best_of',
    scoreLabel: 'Match Wins',
    targetScore: 3
  },
  'Mortal Kombat': {
    name: 'Mortal Kombat',
    description: 'Fighting game. First to win 2 rounds advances.',
    example: 'Player A: 2 wins, Player B: 0 wins → Player A wins (Best of 3)',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 2
  },
  'Street Fighter': {
    name: 'Street Fighter',
    description: 'Fighting game. First to win 2 rounds advances.',
    example: 'Player A: 2 wins, Player B: 1 win → Player A wins (Best of 3)',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 2
  },
  'Tekken': {
    name: 'Tekken',
    description: 'Fighting game. First to win 3 rounds advances.',
    example: 'Player A: 3 wins, Player B: 2 wins → Player A wins (Best of 5)',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 3
  },

  // Shooter Games
  'Call of Duty (1v1)': {
    name: 'Call of Duty (1v1)',
    description: '1v1 match. Player with more kills wins.',
    example: 'Player A: 30 kills, Player B: 24 kills → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Kills'
  },
  'Call of Duty (Search)': {
    name: 'Call of Duty (Search)',
    description: 'Search & Destroy. First to win 6 rounds advances.',
    example: 'Team A: 6 wins, Team B: 4 wins → Team A wins',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 6
  },
  'Apex Legends': {
    name: 'Apex Legends',
    description: 'Battle royale. Player/team with more kills wins.',
    example: 'Player A: 12 kills, Player B: 8 kills → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Kills'
  },
  'Valorant': {
    name: 'Valorant',
    description: 'Tactical shooter. First to win 13 rounds wins.',
    example: 'Team A: 13 wins, Team B: 9 wins → Team A wins',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 13
  },
  'Counter-Strike 2': {
    name: 'Counter-Strike 2',
    description: 'Tactical shooter. First to win 13 rounds wins (MR12).',
    example: 'Team A: 13 wins, Team B: 11 wins → Team A wins',
    scoringMode: 'best_of',
    scoreLabel: 'Round Wins',
    targetScore: 13
  },

  // Racing Games
  'Mario Kart': {
    name: 'Mario Kart',
    description: 'Racing game. Player with higher total points wins (1st=15pts, 2nd=12pts, etc).',
    example: 'Player A: 45 pts, Player B: 38 pts → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Points'
  },
  'Gran Turismo': {
    name: 'Gran Turismo',
    description: 'Racing simulation. Player with better finishing position (lower = better).',
    example: 'Player A: 1st place, Player B: 3rd place → Player A wins',
    scoringMode: 'lower_score',
    scoreLabel: 'Position'
  },
  'Forza': {
    name: 'Forza',
    description: 'Racing simulation. Player with better finishing position wins.',
    example: 'Player A: 1st place, Player B: 2nd place → Player A wins',
    scoringMode: 'lower_score',
    scoreLabel: 'Position'
  },

  // Other Games
  'Chess': {
    name: 'Chess',
    description: 'Classic strategy. First to win 2 games advances (draws = 0.5).',
    example: 'Player A: 2 wins, Player B: 1 win → Player A wins',
    scoringMode: 'best_of',
    scoreLabel: 'Wins',
    targetScore: 2
  },
  'Mario Party': {
    name: 'Mario Party',
    description: 'Party game. Player with more stars/coins wins.',
    example: 'Player A: 5 stars, Player B: 3 stars → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Stars'
  },
  'Tetris': {
    name: 'Tetris',
    description: 'Puzzle game. Player with higher score wins.',
    example: 'Player A: 150,000 pts, Player B: 120,000 pts → Player A wins',
    scoringMode: 'higher_score',
    scoreLabel: 'Score'
  },
  'Custom Game': {
    name: 'Custom Game',
    description: 'Set your own rules. Higher score wins by default.',
    example: 'Define your own scoring system',
    scoringMode: 'higher_score',
    scoreLabel: 'Score'
  }
};

export type GameType = keyof typeof GAME_RULES;
