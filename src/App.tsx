import React from 'react';
import { TournamentProvider } from './context/TournamentContext';
import { TournamentList } from './components/TournamentList';
import { BracketView } from './components/BracketView';
import { ParticipantForm } from './components/ParticipantForm';
import { useTournament } from './context/TournamentContext';
import './App.css';

function TournamentManager() {
  const { state } = useTournament();
  const activeTournament = state.tournaments.find(t => t.id === state.activeTournamentId);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Battle of the Games</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-8">
              <TournamentList />
              {activeTournament && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3">
                    <BracketView />
                  </div>
                  <div>
                    <ParticipantForm tournamentId={activeTournament.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <TournamentProvider>
      <TournamentManager />
    </TournamentProvider>
  );
}

export default App;
