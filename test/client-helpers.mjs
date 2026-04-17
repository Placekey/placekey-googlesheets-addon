import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import vm from "vm";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Extract and evaluate client-side pure functions from mapColumns.html.
 * DOM-dependent functions require a jsdom/happy-dom environment.
 */
export function loadClientFunctions(domGlobals = {}) {
  const html = readFileSync(join(__dirname, "..", "mapColumns.html"), "utf8");

  // Extract the main <script> block (the last one, which has our functions)
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const mainScript = scripts[scripts.length - 1][1];

  const context = vm.createContext({
    Number,
    Object,
    Array,
    String,
    JSON,
    console,
    Math,
    Date,
    Error,
    Set,
    Map,
    parseInt,
    parseFloat,
    isNaN,
    undefined,
    crypto: { randomUUID: () => "test-uuid" },
    window: {},
    // Minimal stubs so the script doesn't crash on load
    // (DOMContentLoaded listener and google.script.run calls execute eagerly)
    document: {
      addEventListener: () => {},
      getElementById: () => ({ style: {}, disabled: false, innerHTML: "", textContent: "", value: "" }),
      getElementsByClassName: () => [],
      createElement: (tag) => {
        if (domGlobals.document) return domGlobals.document.createElement(tag);
        return { appendChild: () => {}, innerHTML: "" };
      },
      createTextNode: (text) => {
        if (domGlobals.document) return domGlobals.document.createTextNode(text);
        return text;
      },
    },
    google: {
      script: {
        run: new Proxy(
          {},
          {
            get() {
              return new Proxy(
                {},
                {
                  get() {
                    return () => {};
                  },
                },
              );
            },
          },
        ),
      },
    },
    ...domGlobals,
  });

  vm.runInContext(mainScript, context);
  return context;
}
