import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import vm from "vm";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadCodeGS() {
  const code = readFileSync(join(__dirname, "..", "Code.gs"), "utf8");
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
    TypeError,
    RangeError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    undefined,
    Map,
    Set,
  });
  vm.runInContext(code, context);
  return context;
}
