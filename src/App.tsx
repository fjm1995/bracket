import React from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { TournamentList } from './components/TournamentList';
import { BracketView } from './components/BracketView';
import { ParticipantForm } from './components/ParticipantForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExportImport } from './components/ExportImport';
import impactLogo from './impact-logo-on-white-box.png';
import './App.css';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full loading-spinner mx-auto mb-4" />
        <p className="text-blue-300 font-medium">Loading tournaments...</p>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
        <div className="text-red-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-red-300 mb-2">Error Loading Data</h2>
        <p className="text-red-400/80">{message}</p>
      </div>
    </div>
  );
}

function TournamentManager() {
  const { state, activeTournament } = useTournament();

  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return <ErrorDisplay message={state.error} />;
  }

  return (
    <div className="min-h-screen bg-blue-950">
      {/* Header */}
      <header className="bg-blue-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={impactLogo} 
                alt="Impact Logo" 
                className="h-12 w-auto drop-shadow-lg"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Battle of the Games
              </h1>
            </div>
            <ExportImport />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <ErrorBoundary>
            <TournamentList />
          </ErrorBoundary>

          {activeTournament && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 fade-in">
              <div className="xl:col-span-3 order-2 xl:order-1">
                <ErrorBoundary>
                  <BracketView />
                </ErrorBoundary>
              </div>
              <div className="order-1 xl:order-2">
                <ErrorBoundary>
                  <ParticipantForm tournamentId={activeTournament.id} />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-blue-400 text-sm">
        <p>© {new Date().getFullYear()} Impact • Battle of the Games</p>
      </footer>
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
