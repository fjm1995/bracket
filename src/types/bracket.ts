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
  usePointSystem: boolean;
  scoreType: 'points' | 'kills' | 'gamePoints';
  targetScore?: number;
  participants: Participant[];
  matches: Match[];
  currentRound: number;
  totalRounds: number;
}

export interface TournamentState {
  tournaments: Tournament[];
  activeTournamentId: string | null;
}

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; game: string; usePointSystem: boolean; scoreType: 'points' | 'kills' | 'gamePoints'; targetScore?: number } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_PARTICIPANT'; payload: { tournamentId: string; name: string } }
  | { type: 'UPDATE_MATCH'; payload: { tournamentId: string; matchId: string; participant1Score: number; participant2Score: number } }
  | { type: 'SET_ACTIVE_TOURNAMENT'; payload: string | null }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: { tournamentId: string; participantId: string; name: string } }
  | { type: 'REMOVE_PARTICIPANT'; payload: { tournamentId: string; participantId: string } };
