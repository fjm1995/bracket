import React, { useState, useRef, useCallback } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Modal } from './Modal';
import { db } from '../services/db';
import { importTournaments } from '../services/tournamentService';

export function ExportImport() {
  const { dispatch } = useTournament();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    try {
      const data = await db.exportTournaments();
      setExportData(data);
      setIsExportOpen(true);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournaments-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportData]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [exportData]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const tournaments = importTournaments(content);
        await dispatch({ type: 'IMPORT_TOURNAMENTS', payload: tournaments });
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => {
          setIsImportOpen(false);
          setImportSuccess(false);
        }, 1500);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  }, [dispatch]);

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleExport}
          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Export Tournaments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Import Tournaments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      {/* Export Modal */}
      <Modal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} title="Export Tournaments" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Your tournament data is ready for export. Download or copy to backup your tournaments.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
              {exportData}
            </pre>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCopyToClipboard}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Download JSON
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => { setIsImportOpen(false); setImportError(null); }} title="Import Tournaments" size="md">
        <div className="space-y-4">
          {importSuccess ? (
            <div className="text-center py-8">
              <div className="text-green-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900">Import Successful!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Select a JSON file containing tournament data to import. Existing tournaments with the same ID will be updated.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600 group-hover:text-emerald-600">
                    Click to select a file or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-400">JSON files only</p>
                </div>
              </button>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{importError}</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
