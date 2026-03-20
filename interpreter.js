// ===============================
// TJC Interpreter v4 (FINAL CORE)
// Math Expressions + CLI + Browser
// ===============================

function runTJC(code) {

  // 🔥 1. Remove ''' comments '''
  code = code.replace(/'''[\s\S]*?'''/g, "");

  let tokens = code
    .replace(/\n/g, ";")
    .split(";")
    .map(t => t.trim())
    .filter(t => t.length > 0);

  let scopeStack = [{}];

  function getVar(name) {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (name in scopeStack[i]) return scopeStack[i][name];
    }
    return 0;
  }

  function setVar(name, value) {
    scopeStack[scopeStack.length - 1][name] = value;
  }

  // ===============================
  // 🔥 MATH EXPRESSION ENGINE
  // ===============================
  function evalExpr(expr) {
    expr = expr.trim();

    // Replace variables with values
    expr = expr.replace(/[a-zA-Z_]\w*/g, (name) => {
      return getVar(name);
    });

    try {
      return Function("return (" + expr + ")")();
    } catch {
      throw Error("Invalid expression: " + expr);
    }
  }

  let i = 0;

  // ===============================
  // 🔧 PARSE BLOCK INTO LINES
  // ===============================
  function collectBlock() {
    let lines = [];

    while (i < tokens.length) {
      let line = tokens[i];

      if (line === "#") {
        i++;
        return lines;
      }

      lines.push(line);
      i++;
    }

    return lines;
  }

  // ===============================
  // 🔧 EXECUTION ENGINE
  // ===============================
  function runBlock(lines, output) {
    let j = 0;

    while (j < lines.length) {
      let line = lines[j];

      // LOOP
      if (line.startsWith("loop")) {
        let match = line.match(/loop\s+(\w+)\s*\((.+),(.+)\):/);
        if (!match) throw Error("Invalid loop syntax: " + line);

        let varName = match[1];
        let start = evalExpr(match[2]);
        let end = evalExpr(match[3]);

        j++;

        let inner = [];
        let depth = 1;

        while (depth > 0 && j < lines.length) {
          if (lines[j] === "#") depth--;
          else if (lines[j].endsWith(":")) depth++;

          if (depth > 0) inner.push(lines[j]);
          j++;
        }

        for (let v = start; v <= end; v++) {
          scopeStack.push({});
          setVar(varName, v);

          runBlock(inner, output);

          scopeStack.pop();
        }

        continue;
      }

      // IF / ELIF / ELSE
      if (line.startsWith("if")) {
        let executed = false;

        while (true) {
          let condMatch = line.match(/(if|elif)\s+(.+):/);

          if (condMatch) {
            let cond = condMatch[2];

            j++;

            let inner = [];
            let depth = 1;

            while (depth > 0 && j < lines.length) {
              if (lines[j] === "#") depth--;
              else if (lines[j].endsWith(":")) depth++;

              if (depth > 0) inner.push(lines[j]);
              j++;
            }

            if (!executed && evalExpr(cond)) {
              executed = true;
              runBlock(inner, output);
            }

            line = lines[j];
            continue;
          }

          if (line && line.startsWith("else:")) {
            j++;

            let inner = [];
            let depth = 1;

            while (depth > 0 && j < lines.length) {
              if (lines[j] === "#") depth--;
              else if (lines[j].endsWith(":")) depth++;

              if (depth > 0) inner.push(lines[j]);
              j++;
            }

            if (!executed) {
              runBlock(inner, output);
            }
          }

          break;
        }

        continue;
      }

      interpretLine(line, output);
      j++;
    }
  }

  // ===============================
  // 🔧 LINE EXECUTION
  // ===============================
  function interpretLine(line, output) {

    if (line.startsWith("print")) {
      let expr = line.replace("print", "").trim();
      output.push(evalExpr(expr));
      return;
    }

    if (line.includes(",")) {
      line.split(",").forEach(p => {
        let [k, v] = p.split("=");
        setVar(k.trim(), evalExpr(v));
      });
      return;
    }

    if (line.includes("=")) {
      let [k, v] = line.split("=");
      setVar(k.trim(), evalExpr(v));
      return;
    }
  }

  // ===============================
  // 🚀 RUN
  // ===============================
  let lines = collectBlock();
  let output = [];

  runBlock(lines, output);

  return output;
}

// ===============================
// EXPORT
// ===============================
if (typeof module !== "undefined") {
  module.exports = { runTJC };
}

// ===============================
// CLI MODE
// ===============================
if (typeof require !== "undefined" && require.main === module) {
  const fs = require("fs");

  const file = process.argv[2];

  if (!file) {
    console.log("Usage: node interpreter.js file.tjc");
    process.exit(1);
  }

  const code = fs.readFileSync(file, "utf-8");

  try {
    const output = runTJC(code);
    console.log(output.join("\n"));
  } catch (e) {
    console.error("Error:", e.message);
  }
}
