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
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="mt-6 text-apple-gray-500 font-medium">Loading tournaments...</p>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="error-container">
      <div className="error-card">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-apple-red/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-apple-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-apple-gray-900 mb-2">Something went wrong</h2>
        <p className="text-apple-gray-500">{message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary mt-6"
        >
          Try Again
        </button>
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
    <div className="min-h-screen bg-apple-gray-100">
      {/* Header - Apple-style frosted glass */}
      <header className="app-header sticky top-0 z-50">
        <div className="container-app">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="logo-container flex-shrink-0">
                <img 
                  src={impactLogo} 
                  alt="Impact" 
                  className="h-8 sm:h-10 md:h-12 w-auto"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-semibold text-apple-gray-900 tracking-tight truncate">
                  Battle of the Games
                </h1>
                <p className="text-xs sm:text-sm text-apple-gray-500 -mt-0.5 hidden sm:block">
                  Tournament Bracket System
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <ExportImport />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container-app py-8">
          <div className="space-y-8">
            {/* Tournament List Section */}
            <ErrorBoundary>
              <TournamentList />
            </ErrorBoundary>

            {/* Active Tournament Bracket */}
            {activeTournament && (
              <div className="animate-in">
                <div className="layout-with-sidebar">
                  {/* Bracket View */}
                  <div className="order-2 xl:order-1">
                    <ErrorBoundary>
                      <BracketView />
                    </ErrorBoundary>
                  </div>
                  
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer py-8 mt-auto">
        <div className="container-app">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-apple-gray-400 text-sm">
              © {new Date().getFullYear()} Impact • Battle of the Games
            </p>
            <p className="text-apple-gray-400 text-xs">
              Single-elimination tournament bracket system
            </p>
          </div>
        </div>
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
