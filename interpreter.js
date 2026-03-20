// ===============================
// TJC Interpreter (FINAL FIXED)
// ===============================

function runTJC(code) {

  // 🔥 Remove comments
  code = code.replace(/'''[\s\S]*?'''/g, "");

  // 🔥 Split into lines (IMPORTANT: not using ;)
  let lines = code
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let i = 0;
  let scopeStack = [{}];

  function getVar(name) {
    for (let j = scopeStack.length - 1; j >= 0; j--) {
      if (name in scopeStack[j]) return scopeStack[j][name];
    }
    return 0;
  }

  function setVar(name, value) {
    scopeStack[scopeStack.length - 1][name] = value;
  }

  // ===============================
  // 🔥 EXPRESSION ENGINE
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

  // ===============================
  // 🔧 EXECUTE BLOCK
  // ===============================
  function executeBlock() {
    let output = [];

    while (i < lines.length) {
      let line = lines[i];

      // 🔴 END BLOCK
      if (line === "#") {
        i++;
        return output;
      }

      // ================= LOOP =================
      if (line.startsWith("loop")) {
        let match = line.match(/loop\s+(\w+)\s*\((.+),(.+)\):/);
        if (!match) throw Error("Invalid loop: " + line);

        let varName = match[1];
        let start = evalExpr(match[2]);
        let end = evalExpr(match[3]);

        i++;
        let bodyStart = i;
        let body = executeBlock();

        for (let v = start; v <= end; v++) {
          scopeStack.push({});
          setVar(varName, v);

          // re-run body
          let tempI = 0;
          while (tempI < body.length) {
            interpretLine(body[tempI++], output);
          }

          scopeStack.pop();
        }

        continue;
      }

      // ================= IF =================
      if (line.startsWith("if")) {
        let executed = false;

        while (true) {
          let condMatch = line.match(/(if|elif)\s+(.+):/);

          if (condMatch) {
            let cond = condMatch[2];

            i++;
            let block = executeBlock();

            if (!executed && evalExpr(cond)) {
              executed = true;
              block.forEach(l => interpretLine(l, output));
            }

            line = lines[i];
            continue;
          }

          if (line && line.startsWith("else:")) {
            i++;
            let block = executeBlock();

            if (!executed) {
              block.forEach(l => interpretLine(l, output));
            }
          }

          break;
        }

        continue;
      }

      // ================= NORMAL LINE =================
      interpretLine(line, output);
      i++;
    }

    return output;
  }

  // ===============================
  // 🔧 EXECUTE SINGLE LINE
  // ===============================
  function interpretLine(line, output) {

    // PRINT
    if (line.startsWith("print")) {
      let expr = line.replace("print", "").trim();
      output.push(evalExpr(expr));
      return;
    }

    // MULTI ASSIGN
    if (line.includes(",")) {
      line.split(",").forEach(p => {
        let [k, v] = p.split("=");
        setVar(k.trim(), evalExpr(v));
      });
      return;
    }

    // SINGLE ASSIGN
    if (line.includes("=")) {
      let [k, v] = line.split("=");
      setVar(k.trim(), evalExpr(v));
      return;
    }
  }

  return executeBlock();
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
