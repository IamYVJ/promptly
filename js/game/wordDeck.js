/**
 * Word deck: shuffle a category, hand out prompts, reshuffle when exhausted.
 *
 * Every prompt in the pool is used once before any repeats, and a reshuffle
 * never puts the word we just showed at the front of the new queue.
 */

export function createWordDeck(words, { random = Math.random } = {}) {
  const pool = [
    ...new Set(
      (words ?? []).filter((word) => typeof word === "string" && word.trim().length > 0).map((word) => word.trim())
    ),
  ];

  let queue = [];
  let lastWord = null;
  let usedCount = 0;

  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function refill() {
    queue = shuffle(pool);
    // next() takes from the end of the queue.
    const lastIndex = queue.length - 1;
    if (queue.length > 1 && queue[lastIndex] === lastWord) {
      [queue[lastIndex], queue[0]] = [queue[0], queue[lastIndex]];
    }
  }

  return {
    next() {
      if (pool.length === 0) return null;
      if (queue.length === 0) refill();

      const word = queue.pop();
      lastWord = word;
      usedCount += 1;
      return word;
    },

    reset() {
      queue = [];
      lastWord = null;
      usedCount = 0;
    },

    get size() {
      return pool.length;
    },

    get usedCount() {
      return usedCount;
    },
  };
}
