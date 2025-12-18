import * as vscode from 'vscode';
import { TmuxService, TmuxTarget } from './tmuxService';
import { ConfigurationManager } from './configurationManager';

export interface SelectionItem extends vscode.QuickPickItem {
    type: 'session' | 'window' | 'pane' | 'recent';
    target: TmuxTarget;
}

/**
 * Interactive target selection with real-time filtering
 */
export async function selectTarget(
    tmuxService: TmuxService,
    configManager: ConfigurationManager
): Promise<TmuxTarget | null> {
    try {
        const tmuxInstalled = await tmuxService.isTmuxInstalled();
        if (!tmuxInstalled) {
            vscode.window.showErrorMessage('Tmux is not installed or not in PATH');
            return null;
        }

        const recentTargets = configManager.getRecentTargets();
        const allSessions = await tmuxService.listSessions();

        const quickPick = vscode.window.createQuickPick<SelectionItem>();
        quickPick.placeholder = 'Type or select tmux target (session:window.pane)';

        const updateItems = async (input: string) => {
            const items: SelectionItem[] = [];
            const trimmed = input.trim();

            // 1. Handle empty input: Show recent and available sessions
            if (!trimmed) {
                if (recentTargets.length > 0) {
                    items.push({ 
                        label: 'Recent Targets', 
                        kind: vscode.QuickPickItemKind.Separator, 
                        type: 'recent', 
                        target: recentTargets[0],
                        alwaysShow: true
                    });
                    recentTargets.forEach(t => {
                        items.push({
                            label: configManager.formatTarget(t),
                            description: 'Recent',
                            type: 'recent',
                            target: t,
                            alwaysShow: true
                        });
                    });
                }

                if (allSessions.length > 0) {
                    items.push({ 
                        label: 'Available Sessions', 
                        kind: vscode.QuickPickItemKind.Separator, 
                        type: 'session', 
                        target: { session: '' },
                        alwaysShow: true
                    });
                    allSessions.forEach(s => {
                        items.push({
                            label: s.name,
                            description: 'Session',
                            type: 'session',
                            target: { session: s.name },
                            alwaysShow: true
                        });
                    });
                }
                quickPick.items = items;
                return;
            }

            // 2. Parse input and show filtered results
            // Format: session:window.pane
            const colonIndex = trimmed.indexOf(':');
            const dotIndex = trimmed.indexOf('.');

            if (colonIndex === -1) {
                // Phase 1: Selecting or searching for a session
                const filteredSessions = allSessions.filter(s => 
                    s.name.toLowerCase().includes(trimmed.toLowerCase())
                );
                
                if (filteredSessions.length > 0) {
                    filteredSessions.forEach(s => {
                        items.push({
                            label: s.name,
                            description: 'Matched Session',
                            type: 'session',
                            target: { session: s.name },
                            alwaysShow: true
                        });
                    });
                } else {
                    items.push({
                        label: trimmed,
                        description: 'Use this as session name',
                        type: 'session',
                        target: { session: trimmed },
                        alwaysShow: true
                    });
                }
            } else {
                // Phase 2 or 3: Session specified, selecting window or pane
                const session = trimmed.substring(0, colonIndex);
                const rest = trimmed.substring(colonIndex + 1);

                if (dotIndex === -1 || dotIndex < colonIndex) {
                    // Phase 2: Selecting a window
                    const windowFilter = rest.toLowerCase();
                    try {
                        const windows = await tmuxService.listWindows(session);
                        items.push({ 
                            label: `Windows in session ${session}`, 
                            kind: vscode.QuickPickItemKind.Separator, 
                            type: 'window', 
                            target: { session },
                            alwaysShow: true
                        });
                        
                        windows.forEach(w => {
                            const label = `${w.index}: ${w.name}`;
                            if (!windowFilter || label.toLowerCase().includes(windowFilter)) {
                                items.push({
                                    label: label,
                                    description: 'Window',
                                    type: 'window',
                                    target: { session, window: w.index },
                                    alwaysShow: true
                                });
                            }
                        });

                        // Fallback: use what the user typed as window name
                        if (windowFilter && !items.some(i => i.type === 'window' && i.kind !== vscode.QuickPickItemKind.Separator)) {
                            items.push({
                                label: `${session}:${windowFilter}`,
                                description: 'Custom window',
                                type: 'window',
                                target: { session, window: windowFilter },
                                alwaysShow: true
                            });
                        }
                    } catch (e) {
                        items.push({ 
                            label: `Cannot list windows`, 
                            description: `Session: ${session}`, 
                            type: 'window', 
                            target: { session },
                            alwaysShow: true
                        });
                    }
                } else {
                    // Phase 3: Selecting a pane
                    const windowPart = trimmed.substring(colonIndex + 1, dotIndex);
                    const paneFilter = trimmed.substring(dotIndex + 1).toLowerCase();
                    
                    try {
                        const panes = await tmuxService.listPanes(session, windowPart);
                        items.push({ 
							label: `Panes in ${session}:${windowPart}`, 
							kind: vscode.QuickPickItemKind.Separator, 
							type: 'pane', 
							target: { session, window: windowPart },
							alwaysShow: true
						});
                        
                        panes.forEach(p => {
                            const label = `Pane ${p.index} (${p.id})`;
                            if (!paneFilter || label.toLowerCase().includes(paneFilter)) {
                                items.push({
                                    label: label,
                                    description: 'Pane',
                                    type: 'pane',
                                    target: { session, window: windowPart, pane: p.index },
                                    alwaysShow: true
                                });
                            }
                        });
                    } catch (e) {
                        items.push({ 
                            label: `Cannot list panes`, 
                            type: 'pane', 
                            target: { session, window: windowPart },
                            alwaysShow: true
                        });
                    }
                }
            }
            quickPick.items = items;
        };

        quickPick.onDidChangeValue(value => updateItems(value));
        await updateItems('');

        const result = await new Promise<TmuxTarget | null>((resolve) => {
            quickPick.onDidAccept(() => {
                const selected = quickPick.activeItems[0];
                if (!selected) {
                    resolve(parseTargetString(quickPick.value));
                    quickPick.hide();
                    return;
                }

                if (selected.type === 'session') {
                    quickPick.value = `${selected.target.session}:`;
                } else if (selected.type === 'window') {
                    quickPick.value = `${selected.target.session}:${selected.target.window}.`;
                } else {
                    resolve(selected.target);
                    quickPick.hide();
                }
            });

            quickPick.onDidHide(() => resolve(null));
            quickPick.show();
        });

        quickPick.dispose();
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to select target: ${errorMessage}`);
        return null;
    }
}

/**
 * Parse target string into TmuxTarget object
 */
export function parseTargetString(targetStr: string): TmuxTarget | null {
    try {
        const parts = targetStr.split(':');
        const session = parts[0];
        if (!session) {
            return null;
        }
        
        if (parts.length === 2 && parts[1] === '') {
            return { session, window: undefined, pane: undefined };
        }
        
        const windowParts = parts[1]?.split('.');
        return {
            session,
            window: windowParts?.[0] || undefined,
            pane: windowParts?.[1] || undefined,
        };
    } catch {
        return null;
    }
}

