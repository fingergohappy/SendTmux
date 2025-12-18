import * as vscode from 'vscode';
import { TmuxService } from './tmuxService';
import { ConfigurationManager } from './configurationManager';
import { selectTarget } from './targetPicker';
import { sendSelection } from './sendHandler';

let tmuxService: TmuxService;
let configManager: ConfigurationManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('SendTmux extension is now active!');

    tmuxService = new TmuxService();
    configManager = new ConfigurationManager(context);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sendtmux.sendToTmux', () => 
            sendSelection(tmuxService, configManager, false)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sendtmux.sendWithConfirmation', () => 
            sendSelection(tmuxService, configManager, true)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sendtmux.selectTarget', async () => {
            const target = await selectTarget(tmuxService, configManager);
            if (target) {
                await configManager.addRecentTarget(target);
                const targetStr = configManager.formatTarget(target);
                vscode.window.showInformationMessage(`Target selected: ${targetStr}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sendtmux.clearHistory', async () => {
            await clearHistory(configManager);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sendtmux.showOutput', () => {
            tmuxService.showOutput();
        })
    );
}

/**
 * Clear recent targets history
 */
async function clearHistory(configManager: ConfigurationManager): Promise<void> {
    try {
        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all recent targets history?',
            { modal: true },
            'Clear History',
            'Cancel'
        );

        if (result !== 'Clear History') {
            return;
        }

        await configManager.clearRecentTargets();
        vscode.window.showInformationMessage('Recent targets history cleared');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to clear history: ${errorMessage}`);
    }
}

export function deactivate() {}
