import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TmuxTarget {
    session: string;
    window?: string;
    pane?: string;
}

export interface TmuxSession {
    name: string;
}

export interface TmuxWindow {
    name: string;
    index: string;
}

export interface TmuxPane {
    index: string;
    id: string;
}

export class TmuxService {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('SendTmux');
    }

    private log(message: string) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Check if tmux is installed and accessible
     */
    async isTmuxInstalled(): Promise<boolean> {
        try {
            await execAsync('which tmux');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get list of tmux sessions
     */
    async listSessions(): Promise<TmuxSession[]> {
        try {
            this.log('Listing tmux sessions');
            const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"');
            return stdout
                .trim()
                .split('\n')
                .filter(name => name)
                .map(name => ({ name }));
        } catch (error) {
            this.log(`Error listing sessions: ${error}`);
            return [];
        }
    }

    /**
     * Get list of windows in a session
     */
    async listWindows(session: string): Promise<TmuxWindow[]> {
        try {
            this.log(`Listing windows for session: ${session}`);
            const sanitizedSession = this.escapeShellArg(session);
            const { stdout, stderr } = await execAsync(
                `tmux list-windows -t ${sanitizedSession} -F "#{window_index}:#{window_name}"`
            );
            if (stderr) {
                this.log(`tmux list-windows stderr: ${stderr}`);
            }
            const windows = stdout
                .trim()
                .split('\n')
                .filter(line => line)
                .map(line => {
                    const [index, name] = line.split(':', 2);
                    return { index, name: name || index };
                });
            if (windows.length === 0 && stdout.trim() === '') {
                throw new Error(`No windows found in session "${session}"`);
            }
            return windows;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`Error listing windows: ${errorMessage}`);
            throw new Error(`Failed to list windows for session "${session}": ${errorMessage}`);
        }
    }

    /**
     * Get list of panes in a window
     */
    async listPanes(session: string, window?: string): Promise<TmuxPane[]> {
        try {
            const target = window ? `${session}:${window}` : session;
            this.log(`Listing panes for target: ${target}`);
            const sanitizedTarget = this.escapeShellArg(target);
            const { stdout } = await execAsync(
                `tmux list-panes -t ${sanitizedTarget} -F "#{pane_index}:#{pane_id}"`
            );
            return stdout
                .trim()
                .split('\n')
                .filter(line => line)
                .map(line => {
                    const [index, id] = line.split(':', 2);
                    return { index, id };
                });
        } catch (error) {
            this.log(`Error listing panes: ${error}`);
            return [];
        }
    }

    /**
     * Validate if a target exists
     */
    async validateTarget(target: TmuxTarget): Promise<boolean> {
        try {
            const targetStr = this.buildTargetString(target);
            this.log(`Validating target: ${targetStr}`);
            const sanitizedTarget = this.escapeShellArg(targetStr);
            await execAsync(`tmux has-session -t ${sanitizedTarget}`);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Build tmux target string from target object
     */
    buildTargetString(target: TmuxTarget): string {
        let targetStr = target.session;
        if (target.window) {
            targetStr += `:${target.window}`;
        }
        if (target.pane) {
            targetStr += `.${target.pane}`;
        }
        return targetStr;
    }

    /**
     * Escape shell argument to prevent injection
     */
    private escapeShellArg(arg: string): string {
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }

    /**
     * Send text to tmux target
     * For multi-line text, send line by line to preserve indentation
     * @param finalKey Key(s) to send after all content is sent (e.g., "Enter", "Space", "" for none).
     *                Multiple keys can be comma-separated (e.g., "Enter,Space")
     */
    async sendText(target: TmuxTarget, text: string, finalKey: string = 'Enter'): Promise<void> {
        const targetStr = this.buildTargetString(target);
        this.log(`Sending text to ${targetStr}`);
        const sanitizedTarget = this.escapeShellArg(targetStr);

        // If text contains newlines, send line by line to preserve indentation
        if (text.includes('\n')) {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Escape single quotes in the line (preserve all whitespace including leading spaces)
                const escapedLine = line.replace(/'/g, "'\\''");
                
                // Send the line (preserving indentation)
                await execAsync(`tmux send-keys -t ${sanitizedTarget} -l '${escapedLine}'`);
                
                // Send newline for all lines except the last one
                if (i < lines.length - 1) {
                    await execAsync(`tmux send-keys -t ${sanitizedTarget} Enter`);
                }
            }
        } else {
            // Single line text: send as before
            const escapedText = text.replace(/'/g, "'\\''");
            await execAsync(`tmux send-keys -t ${sanitizedTarget} -l '${escapedText}'`);
        }
        
        // Send final key after all content is sent
        if (finalKey) {
            // Split comma-separated keys, trim whitespace, and filter empty strings
            const keys = finalKey.split(',').map(k => k.trim()).filter(k => k !== '');
            for (const key of keys) {
                await execAsync(`tmux send-keys -t ${sanitizedTarget} ${key}`);
            }
        }
    }

    /**
     * Send text line by line, preserving indentation
     * @param finalKey Key(s) to send after all content is sent (e.g., "Enter", "Space", "" for none).
     *                Multiple keys can be comma-separated (e.g., "Enter,Space")
     */
    async sendTextLineByLine(target: TmuxTarget, text: string, finalKey: string = 'Enter'): Promise<void> {
        const targetStr = this.buildTargetString(target);
        const sanitizedTarget = this.escapeShellArg(targetStr);
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Escape single quotes in the line (preserve all whitespace including leading spaces)
            const escapedLine = line.replace(/'/g, "'\\''");
            
            // Send the line (preserving indentation)
            await execAsync(`tmux send-keys -t ${sanitizedTarget} -l '${escapedLine}'`);
            
            // Send newline for all lines except the last one
            if (i < lines.length - 1) {
                await execAsync(`tmux send-keys -t ${sanitizedTarget} Enter`);
            }
        }
        
        // Send final key after all content is sent
        if (finalKey) {
            // Split comma-separated keys, trim whitespace, and filter empty strings
            const keys = finalKey.split(',').map(k => k.trim()).filter(k => k !== '');
            for (const key of keys) {
                await execAsync(`tmux send-keys -t ${sanitizedTarget} ${key}`);
            }
        }
    }

    /**
     * Get current tmux session (if running inside tmux)
     */
    async getCurrentSession(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('tmux display-message -p "#{session_name}"');
            return stdout.trim();
        } catch {
            return null;
        }
    }

    /**
     * Get current active window index in a session
     */
    async getActiveWindow(session: string): Promise<string | null> {
        try {
            const sanitizedSession = this.escapeShellArg(session);
            const { stdout } = await execAsync(`tmux display-message -t ${sanitizedSession} -p "#{window_index}"`);
            return stdout.trim();
        } catch {
            return null;
        }
    }

    /**
     * Get current active pane index in a window
     */
    async getActivePane(session: string, window?: string): Promise<string | null> {
        try {
            const target = window ? `${session}:${window}` : session;
            const sanitizedTarget = this.escapeShellArg(target);
            const { stdout } = await execAsync(`tmux display-message -t ${sanitizedTarget} -p "#{pane_index}"`);
            return stdout.trim();
        } catch {
            return null;
        }
    }

    public showOutput() {
        this.outputChannel.show();
    }
}
