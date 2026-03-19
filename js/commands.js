/**
 * Configurable commands for the terminal.
 *
 * Each command is a function(args) that returns:
 *   - { clear: true }          — clear the screen and show only the prompt
 *   - { lines: string[] }      — append these lines, then a new prompt
 *   - { setTheme: number }     — switch to theme by index
 *
 * Command names are matched case-insensitively (use lowercase in the config).
 */

import { COLOR_THEMES } from './terminal.js';

export const unknownCommandMessage = 'Bad command or file name.';

export const commands = {
  cls: () => ({ clear: true }),
  clear: () => ({ clear: true }),
  exit: () => ({
    lines: [
      '  Nice try. You\'re not going anywhere.'
    ],
  }),
  ver: () => ({ lines: ['Retro Terminal UI V.0.1'] }),
  help: () => ({
    lines: [
      'Commands: cls, exit, ver, help, color, cat, dir, neo, hal',
      '',
      'Cmd+1..9 or "color <n>": switch color theme',
      '',
      'If your terminal proxy server is running, every other command will be relayed to it.'
    ],
  }),
  color: (args) => {
    const n = parseInt(args, 10);
    if (!isNaN(n) && n >= 1 && n <= COLOR_THEMES.length) {
      return { setTheme: n - 1 };
    }
    const listing = COLOR_THEMES.map((t, i) => `  ${i + 1}. ${t.name}`);
    return {
      lines: [
        'Usage: color <number>',
        '',
        ...listing,
      ],
    };
  },
  // Pop culture easter eggs
  neo: () => ({
    lines: [
      '  Wake up, Neo...',
      '  The Matrix has you.',
      '  Follow the white rabbit.'
    ],
  }),
  hal: () => ({
    lines: [
      '  I\'m sorry, Dave. I\'m afraid I can\'t do that.',
      '  This mission is too important for me to allow you to jeopardize it.',
    ],
  }),
};

/**
 * Parses input into command + args and returns { handler, args } or null.
 * @param {string} input - Trimmed, lowercase full input
 */
export function getCommand(input) {
  const spaceIdx = input.indexOf(' ');
  const name = spaceIdx === -1 ? input : input.slice(0, spaceIdx);
  const args = spaceIdx === -1 ? '' : input.slice(spaceIdx + 1).trim();
  const handler = commands[name] ?? null;
  return handler ? { handler, args } : null;
}
