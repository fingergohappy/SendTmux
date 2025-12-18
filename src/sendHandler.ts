import * as vscode from 'vscode';
import { TmuxService, TmuxTarget } from './tmuxService';
import { ConfigurationManager } from './configurationManager';
import { selectTarget } from './targetPicker';

/**
 * Send selected text to tmux
 */
export async function sendSelection(
    tmuxService: TmuxService,
    configManager: ConfigurationManager,
    forceConfirm: boolean
): Promise<void> {
    try {
        const tmuxInstalled = await tmuxService.isTmuxInstalled();
        if (!tmuxInstalled) {
            const result = await vscode.window.showErrorMessage(
                'Tmux is not installed or not in PATH',
                'Install Instructions'
            );
            if (result === 'Install Instructions') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/tmux/tmux/wiki/Installing'));
            }
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor');
            return;
        }

        const selection = editor.selection;
        let textToSend: string;

        if (selection.isEmpty) {
            const line = editor.document.lineAt(selection.active.line);
            if (!line.text.trim()) {
                vscode.window.showErrorMessage('Current line is empty');
                return;
            }
            textToSend = line.text;
        } else {
            const selectedText = editor.document.getText(selection);
            if (!selectedText) {
                vscode.window.showErrorMessage('Selected text is empty');
                return;
            }
            textToSend = selectedText;
        }

        const target = await getTargetForSending(tmuxService, configManager, forceConfirm);
        if (!target) {
            return;
        }

        const isValid = await tmuxService.validateTarget(target);
        if (!isValid) {
            const targetStr = configManager.formatTarget(target);
            vscode.window.showErrorMessage(`Tmux target not found: ${targetStr}`);
            return;
        }

        const sendMode = configManager.getSendMode();
        const appendNewline = configManager.getAppendNewline();

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Sending to Tmux...',
                cancellable: false,
            },
            async () => {
                if (sendMode === 'line-by-line') {
                    await tmuxService.sendTextLineByLine(target, textToSend, appendNewline);
                } else {
                    await tmuxService.sendText(target, textToSend, appendNewline);
                }
            }
        );

        await configManager.addRecentTarget(target);
        const targetStr = configManager.formatTarget(target);
        vscode.window.showInformationMessage(`Sent to tmux: ${targetStr}`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to send to tmux: ${errorMessage}`);
    }
}

/**
 * Get target for sending (either from config, recent, or prompt user)
 */
async function getTargetForSending(
    tmuxService: TmuxService,
    configManager: ConfigurationManager,
    forceConfirm: boolean
): Promise<TmuxTarget | null> {
    const confirmBeforeSend = configManager.getConfirmBeforeSend() || forceConfirm;
    let target = configManager.getDefaultTarget() || configManager.getLastUsedTarget();

    if (!target || confirmBeforeSend) {
        return await selectTarget(tmuxService, configManager);
    }

    return target;
}

