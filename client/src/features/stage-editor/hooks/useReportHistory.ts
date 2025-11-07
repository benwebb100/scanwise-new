import { useState as reactUseState } from 'react';

// hooks/useReportHistory.ts (was embedded in main component)
export const useReportHistory = () => {
    const [history, setHistory] = reactUseState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
    const [auditTrail, setAuditTrail] = reactUseState<{ action: string, timestamp: string }[]>([]);

    const addVersion = (html: string, type: string, summary: string) => {
        const timestamp = new Date().toLocaleString();
        setHistory(prev => [...prev, { html, timestamp, type, summary }]);
        setAuditTrail(prev => [
            { action: `${type}: ${summary}`, timestamp },
            ...prev
        ]);
    };

    const handleUndo = (currentReport: string) => {
        if (history.length > 1) {
            const prev = history[history.length - 2];
            setHistory(h => h.slice(0, -1));
            setAuditTrail(prevTrail => [
                { action: "Undo to previous version", timestamp: new Date().toLocaleString() },
                ...prevTrail
            ]);
            return prev.html;
        }
        return currentReport;
    };

    const handleRestoreVersion = (idx: number) => {
        const versionToRestore = history[idx];
        setHistory(h => h.slice(0, idx + 1));
        setAuditTrail(prevTrail => [
            { action: `Restored version from ${versionToRestore.timestamp}`, timestamp: new Date().toLocaleString() },
            ...prevTrail
        ]);
        return versionToRestore.html;
    };

    const handleRevertToVersion = (auditEntry: { action: string; timestamp: string }) => {
        const historyIndex = history.findIndex(h => h.timestamp === auditEntry.timestamp);
        
        if (historyIndex >= 0 && historyIndex < history.length - 1) {
            const versionToRestore = history[historyIndex];
            setHistory(h => h.slice(0, historyIndex + 1));
            setAuditTrail(prevTrail => [
                { 
                    action: `Reverted to version from ${versionToRestore.timestamp}`, 
                    timestamp: new Date().toLocaleString() 
                },
                ...prevTrail
            ]);
            return versionToRestore.html;
        }
        return null;
    };

    return {
        history,
        setHistory,
        auditTrail,
        setAuditTrail,
        addVersion,
        handleUndo,
        handleRestoreVersion,
        handleRevertToVersion
    };
};

function useState<T>(arg0: never[]): [any, any] {
    throw new Error("Function not implemented.");
}
