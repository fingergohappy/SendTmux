import * as vscode from 'vscode';
import { TmuxService, TmuxTarget } from './tmuxService';
import { ConfigurationManager } from './configurationManager';

let tmuxService: TmuxService;
let configManager: ConfigurationManager;

export function activate(context: vscode.ExtensionContext) {
	console.log('SendTmux extension is now active!');

	tmuxService = new TmuxService();
	configManager = new ConfigurationManager(context);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('sendtmux.sendToTmux', () => sendSelection(false))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('sendtmux.sendWithConfirmation', () => sendSelection(true))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('sendtmux.selectTarget', async () => {
			const target = await selectTarget();
			if (target) {
				// Save to recent targets
				await configManager.addRecentTarget(target);
				const targetStr = configManager.formatTarget(target);
				vscode.window.showInformationMessage(`Target selected: ${targetStr}`);
			}
		})
	);
}

/**
 * Send selected text to tmux
 */
async function sendSelection(forceConfirm: boolean): Promise<void> {
	try {
		// Check if tmux is installed
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

		// Get active editor and selection
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor');
			return;
		}

		const selection = editor.selection;
		let textToSend: string;

		if (selection.isEmpty) {
			// No selection, get current line
			const line = editor.document.lineAt(selection.active.line);
			const lineText = line.text.trim();

			if (!lineText) {
				vscode.window.showErrorMessage('Current line is empty');
				return;
			}

			textToSend = line.text;
		} else {
			// Has selection
			const selectedText = editor.document.getText(selection);
			if (!selectedText) {
				vscode.window.showErrorMessage('Selected text is empty');
				return;
			}
			textToSend = selectedText;
		}

		// Get target
		let target = await getTargetForSending(forceConfirm);
		if (!target) {
			return; // User cancelled
		}

		// Validate target
		const isValid = await tmuxService.validateTarget(target);
		if (!isValid) {
			const targetStr = configManager.formatTarget(target);
			vscode.window.showErrorMessage(`Tmux target not found: ${targetStr}`);
			return;
		}

		// Send text
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

		// Remember target
		await configManager.addRecentTarget(target);

		// Show success message
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
async function getTargetForSending(forceConfirm: boolean): Promise<TmuxTarget | null> {
	const confirmBeforeSend = configManager.getConfirmBeforeSend() || forceConfirm;

	// Try to get target from config or recent
	let target = configManager.getDefaultTarget() || configManager.getLastUsedTarget();

	if (!target || confirmBeforeSend) {
		// Prompt user to select target
		return await selectTarget();
	}

	return target;
}

/**
 * Interactive target selection
 * After selecting a session, user is directly presented with window selection,
 * then pane selection (if window was selected).
 * Each step has a "Skip" option to use default window/pane.
 */
async function selectTarget(): Promise<TmuxTarget | null> {
	try {
		// Check if tmux is installed
		const tmuxInstalled = await tmuxService.isTmuxInstalled();
		if (!tmuxInstalled) {
			vscode.window.showErrorMessage('Tmux is not installed or not in PATH');
			return null;
		}

		// Build quick pick items from recent targets and available sessions
		const recentTargets = configManager.getRecentTargets();
		const sessions = await tmuxService.listSessions();

		interface TargetQuickPickItem extends vscode.QuickPickItem {
			target?: TmuxTarget;
			isCustom?: boolean;
		}

		const items: TargetQuickPickItem[] = [];

		// Add recent targets
		if (recentTargets.length > 0) {
			items.push({ label: '$(history) Recent Targets', kind: vscode.QuickPickItemKind.Separator });
			for (const target of recentTargets) {
				items.push({
					label: configManager.formatTarget(target),
					description: 'Recent',
					target,
				});
			}
		}

		// Add available sessions
		if (sessions.length > 0) {
			items.push({ label: '$(server) Available Sessions', kind: vscode.QuickPickItemKind.Separator });
			for (const session of sessions) {
				items.push({
					label: session.name,
					description: 'Session',
					target: { session: session.name },
				});
			}
		}

		// Add custom input option
		items.push({ label: '$(add) Custom Target...', isCustom: true });

		// Show quick pick
		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select tmux target (session[:window[.pane]])',
		});

		if (!selected) {
			return null;
		}

		if (selected.isCustom) {
			// Custom input
			const input = await vscode.window.showInputBox({
				prompt: 'Enter tmux target (session[:window[.pane]])',
				placeHolder: 'mysession:0.1',
			});

			if (!input) {
				return null;
			}

			return parseTargetString(input);
		}

		let target = selected.target!;

		// If only session is selected, directly show window selection
		if (!target.window) {
			const windows = await tmuxService.listWindows(target.session);
			if (windows.length > 0) {
				const windowItems = windows.map(w => ({
					label: `${w.index}: ${w.name}`,
					description: 'Window',
					window: w,
				}));

				// Add skip option
				windowItems.unshift({
					label: '$(arrow-right) Skip (use default window)',
					description: 'Continue without selecting specific window',
					window: null as any,
				});

				const selectedWindow = await vscode.window.showQuickPick(windowItems, {
					placeHolder: 'Select window or skip to use default',
				});

				if (selectedWindow && selectedWindow.window) {
					target.window = selectedWindow.window.index;
				}
				// If user selects skip option or cancels, target.window remains undefined
			}
		}

		// If window is selected, directly show pane selection
		if (target.window && !target.pane) {
			const panes = await tmuxService.listPanes(target.session, target.window);
			if (panes.length > 0) {
				const paneItems = panes.map(p => ({
					label: `Pane ${p.index} (${p.id})`,
					description: 'Pane',
					pane: p,
				}));

				// Add skip option
				paneItems.unshift({
					label: '$(arrow-right) Skip (use default pane)',
					description: 'Continue without selecting specific pane',
					pane: null as any,
				});

				const selectedPane = await vscode.window.showQuickPick(paneItems, {
					placeHolder: 'Select pane or skip to use default',
				});

				if (selectedPane && selectedPane.pane) {
					target.pane = selectedPane.pane.index;
				}
				// If user selects skip option or cancels, target.pane remains undefined
			}
		}

		return target;

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to select target: ${errorMessage}`);
		return null;
	}
}

/**
 * Parse target string into TmuxTarget object
 */
function parseTargetString(targetStr: string): TmuxTarget {
	const parts = targetStr.split(':');
	const session = parts[0];
	const windowParts = parts[1]?.split('.');

	return {
		session,
		window: windowParts?.[0],
		pane: windowParts?.[1],
	};
}

export function deactivate() {}
