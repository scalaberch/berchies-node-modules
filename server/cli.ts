import readline from "readline";

let _prompt;

/**
 * How to use:
 * const value = await prompt('question')
 *
 * @param _question
 * @returns
 */
const promptLegacy = (_question: string) => {
  return new Promise((resolve, reject) => {
    _prompt.question(_question, (_answer) => {
      _prompt.close();
      resolve(_answer);
    });
  });
};

const createPrompt = () => {
  let _prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return _prompt;
}