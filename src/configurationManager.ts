import * as vscode from 'vscode';
import { TmuxTarget } from './tmuxService';

export class ConfigurationManager {
    private static readonly RECENT_TARGETS_KEY = 'recentTargets';
    private static readonly MAX_RECENT_TARGETS = 10;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Get configuration value
     */
    private getConfig<T>(key: string): T | undefined {
        const config = vscode.workspace.getConfiguration('sendtmux');
        return config.get<T>(key);
    }

    /**
     * Get default target from configuration
     */
    getDefaultTarget(): TmuxTarget | null {
        const session = this.getConfig<string>('session');
        if (!session) {
            return null;
        }

        return {
            session,
            window: this.getConfig<string>('window') || undefined,
            pane: this.getConfig<string>('pane') || undefined,
        };
    }

    /**
     * Get send mode configuration
     */
    getSendMode(): 'line-by-line' | 'all-at-once' {
        return this.getConfig<'line-by-line' | 'all-at-once'>('sendMode') || 'all-at-once';
    }

    /**
     * Get confirm before send configuration
     */
    getConfirmBeforeSend(): boolean {
        return this.getConfig<boolean>('confirmBeforeSend') || false;
    }

    /**
     * Get remember target configuration
     */
    getRememberTarget(): boolean {
        return this.getConfig<boolean>('rememberTarget') !== false;
    }


    /**
     * Get final key to send after content
     * Returns the key name(s) (e.g., "Enter", "Space", etc.) or empty string if none
     * Multiple keys can be comma-separated (e.g., "Enter,Space")
     */
    getFinalKey(): string {
        const finalKey = this.getConfig<string>('finalKey');
        if (typeof finalKey === 'string' && finalKey !== '') {
            return finalKey;
        }
        // Backward compatibility: check appendNewline setting (deprecated)
        const appendNewline = this.getConfig<boolean>('appendNewline');
        if (appendNewline !== undefined) {
            // If appendNewline is explicitly set to false, return empty string
            // If true or undefined, default to "Enter"
            return appendNewline ? 'Enter' : '';
        }
        // No explicit configuration, default to "Enter"
        return 'Enter';
    }

    /**
     * Get recently used targets
     */
    getRecentTargets(): TmuxTarget[] {
        const targets = this.context.globalState.get<TmuxTarget[]>(
            ConfigurationManager.RECENT_TARGETS_KEY,
            []
        );
        return targets;
    }

    /**
     * Add target to recent targets
     */
    async addRecentTarget(target: TmuxTarget): Promise<void> {
        if (!this.getRememberTarget()) {
            return;
        }

        let recentTargets = this.getRecentTargets();

        // Remove duplicate if exists
        recentTargets = recentTargets.filter(
            t => !(t.session === target.session &&
                   t.window === target.window &&
                   t.pane === target.pane)
        );

        // Add to beginning
        recentTargets.unshift(target);

        // Limit to MAX_RECENT_TARGETS
        if (recentTargets.length > ConfigurationManager.MAX_RECENT_TARGETS) {
            recentTargets = recentTargets.slice(0, ConfigurationManager.MAX_RECENT_TARGETS);
        }

        await this.context.globalState.update(
            ConfigurationManager.RECENT_TARGETS_KEY,
            recentTargets
        );
    }

    /**
     * Get last used target
     */
    getLastUsedTarget(): TmuxTarget | null {
        const recentTargets = this.getRecentTargets();
        return recentTargets.length > 0 ? recentTargets[0] : null;
    }

    /**
     * Format target as string for display
     */
    formatTarget(target: TmuxTarget): string {
        let str = target.session;
        if (target.window) {
            str += `:${target.window}`;
        }
        if (target.pane) {
            str += `.${target.pane}`;
        }
        return str;
    }

    /**
     * Clear all recent targets history
     */
    async clearRecentTargets(): Promise<void> {
        await this.context.globalState.update(
            ConfigurationManager.RECENT_TARGETS_KEY,
            []
        );
    }
}
