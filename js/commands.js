/**
 * Configurable commands for the terminal.
 *
 * Each command is a function that returns:
 *   - { clear: true }        — clear the screen and show only the prompt
 *   - { lines: string[] }     — append these lines, then a new prompt
 *
 * Command names are matched case-insensitively (use lowercase in the config).
 */

export const unknownCommandMessage = 'Bad command or file name';

const catFn = () => ({
  lines: [
    '  ,_     _',
    '  |\\_,-~/',
    '  / _  _ |    ,--.',
    ' (  @  @ )   / ,-\'',
    '  \\  _T_/-._( (',
    '  /         `. \\',
    ' |         _  \\ |',
    '  \\ \\ ,  /      |',
    '  || |-_\\__   /',
    '  ((_/`(____,-\'',
  ],
});

export const commands = {
  cls: () => ({ clear: true }),
  clear: () => ({ clear: true }),
  exit: () => ({
    lines: [
      '  Nice try. You\'re not going anywhere.'
    ],
  }),

  // Example: add more commands by returning output lines
  ver: () => ({ lines: ['Colossyan DOS Version 0.1'] }),
  help: () => ({ lines: ['Commands: cls, exit, ver, help, cat, dir, neo, hal'] }),
  cat: catFn,
  'cat.exe': catFn,
  dir: () => ({
    lines: [
      '  Directory of C:\\',
      '  .',
      '  ..',
      '  cat.exe',
    ],
  }),

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
 * Returns the handler for a given command name, or null if not defined.
 * @param {string} name - Trimmed, lowercase command name
 * @returns {((() => { clear?: boolean; lines?: string[] }) | null)}
 */
export function getCommand(name) {
  return commands[name] ?? null;
}
