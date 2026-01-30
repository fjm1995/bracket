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
  const [copySuccess, setCopySuccess] = useState(false);
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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
    e.target.value = '';
  }, [dispatch]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-apple-gray-600 
                     hover:text-apple-gray-900 hover:bg-apple-gray-100 rounded-apple transition-colors"
          title="Export Tournaments"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-apple-gray-600 
                     hover:text-apple-gray-900 hover:bg-apple-gray-100 rounded-apple transition-colors"
          title="Import Tournaments"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      {/* Export Modal */}
      <Modal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} title="Export Tournaments" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-apple-gray-600">
            Your tournament data is ready. Download or copy to save a backup.
          </p>
          
          <div className="bg-apple-gray-50 rounded-apple-lg p-4 max-h-48 overflow-auto scrollbar-apple">
            <pre className="text-xs text-apple-gray-700 font-mono whitespace-pre-wrap break-all">
              {exportData}
            </pre>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCopyToClipboard}
              className={`btn-secondary ${copySuccess ? 'bg-apple-green/10 text-apple-green border-apple-green/20' : ''}`}
            >
              {copySuccess ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button onClick={handleDownload} className="btn-success">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download JSON
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal 
        isOpen={isImportOpen} 
        onClose={() => { setIsImportOpen(false); setImportError(null); }} 
        title="Import Tournaments" 
        size="md"
      >
        <div className="space-y-4">
          {importSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-apple-green/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-apple-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-apple-gray-900">Import Successful!</p>
              <p className="text-sm text-apple-gray-500 mt-1">Your tournaments have been imported.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-apple-gray-600">
                Select a JSON file to import tournaments. Existing tournaments with the same ID will be updated.
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
                className="w-full py-10 border-2 border-dashed border-apple-gray-300 rounded-apple-lg 
                         hover:border-apple-blue hover:bg-apple-blue/5 transition-all group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-apple-gray-100 
                               group-hover:bg-apple-blue/10 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-apple-gray-400 group-hover:text-apple-blue transition-colors" 
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-apple-gray-600 group-hover:text-apple-blue font-medium transition-colors">
                    Click to select a file
                  </p>
                  <p className="text-xs text-apple-gray-400 mt-1">JSON files only</p>
                </div>
              </button>

              {importError && (
                <div className="p-3 bg-apple-red/10 border border-apple-red/20 rounded-apple">
                  <p className="text-sm text-apple-red">{importError}</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
