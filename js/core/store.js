/**
 * One predictable application state with explicit commits.
 *
 * `commit` mutates the state and notifies subscribers (the renderer).
 * `quiet` mutates without notifying — used for inputs that already own their
 * DOM (text fields), so typing never triggers a re-render mid-keystroke.
 */

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function notify() {
    for (const listener of [...listeners]) listener(state);
  }

  return {
    get state() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    commit(mutate) {
      mutate(state);
      notify();
    },

    quiet(mutate) {
      mutate(state);
    },

    replace(nextState) {
      state = nextState;
      notify();
    },
  };
}
