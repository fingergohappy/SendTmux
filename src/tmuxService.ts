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
            const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"');
            return stdout
                .trim()
                .split('\n')
                .filter(name => name)
                .map(name => ({ name }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get list of windows in a session
     */
    async listWindows(session: string): Promise<TmuxWindow[]> {
        try {
            const { stdout } = await execAsync(
                `tmux list-windows -t "${session}" -F "#{window_index}:#{window_name}"`
            );
            return stdout
                .trim()
                .split('\n')
                .filter(line => line)
                .map(line => {
                    const [index, name] = line.split(':', 2);
                    return { index, name: name || index };
                });
        } catch (error) {
            return [];
        }
    }

    /**
     * Get list of panes in a window
     */
    async listPanes(session: string, window?: string): Promise<TmuxPane[]> {
        try {
            const target = window ? `${session}:${window}` : session;
            const { stdout } = await execAsync(
                `tmux list-panes -t "${target}" -F "#{pane_index}:#{pane_id}"`
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
            return [];
        }
    }

    /**
     * Validate if a target exists
     */
    async validateTarget(target: TmuxTarget): Promise<boolean> {
        try {
            const targetStr = this.buildTargetString(target);
            await execAsync(`tmux has-session -t "${targetStr}"`);
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
     * Send text to tmux target
     */
    async sendText(target: TmuxTarget, text: string, appendNewline: boolean = true): Promise<void> {
        const targetStr = this.buildTargetString(target);

        // Escape single quotes in the text
        const escapedText = text.replace(/'/g, "'\\''");

        // Send the text
        await execAsync(`tmux send-keys -t "${targetStr}" -l '${escapedText}'`);

        // Send Enter key if appendNewline is true
        if (appendNewline) {
            await execAsync(`tmux send-keys -t "${targetStr}" Enter`);
        }
    }

    /**
     * Send text line by line
     */
    async sendTextLineByLine(target: TmuxTarget, text: string, appendNewline: boolean = true): Promise<void> {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                await this.sendText(target, line, appendNewline);
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
            const { stdout } = await execAsync(`tmux display-message -t "${session}" -p "#{window_index}"`);
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
            const { stdout } = await execAsync(`tmux display-message -t "${target}" -p "#{pane_index}"`);
            return stdout.trim();
        } catch {
            return null;
        }
    }
}
