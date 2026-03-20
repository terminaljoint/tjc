function runTJC(code) {

  // 🔥 1. REMOVE COMMENTS (''' ''')
  code = code.replace(/'''[\s\S]*?'''/g, "");

  // 🔥 2. TOKENIZE INTO STATEMENTS
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

  function evalExpr(expr) {
    expr = expr.trim();

    if (!isNaN(expr)) return Number(expr);

    if (expr.includes(">")) {
      let [a, b] = expr.split(">");
      return getVar(a.trim()) > Number(b.trim());
    }

    if (expr.includes("<")) {
      let [a, b] = expr.split("<");
      return getVar(a.trim()) < Number(b.trim());
    }

    if (expr.includes("==")) {
      let [a, b] = expr.split("==");
      return getVar(a.trim()) == Number(b.trim());
    }

    return getVar(expr);
  }

  let i = 0;

  function executeBlock() {
    let output = [];

    while (i < tokens.length) {
      let line = tokens[i];

      // 🔴 END BLOCK
      if (line === "#") {
        i++;
        return output;
      }

      // 🟢 LOOP
      if (line.startsWith("loop")) {
        let match = line.match(/loop\s+(\w+)\s*\((\d+),(\d+)\):/);
        let varName = match[1];
        let start = Number(match[2]);
        let end = Number(match[3]);

        i++;
        let bodyStart = i;

        let body = executeBlock();

        for (let v = start; v <= end; v++) {
          scopeStack.push({});
          setVar(varName, v);

          let tempI = 0;
          while (tempI < body.length) {
            interpretLine(body[tempI++], output);
          }

          scopeStack.pop();
        }

        continue;
      }

      // 🟡 IF
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

            line = tokens[i];
            continue;
          }

          if (line.startsWith("else:")) {
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

      interpretLine(line, output);
      i++;
    }

    return output;
  }

  function interpretLine(line, output) {

    // PRINT
    if (line.startsWith("print")) {
      let expr = line.replace("print", "").trim();
      output.push(evalExpr(expr));
      return;
    }

    // MULTI ASSIGN
    if (line.includes(",")) {
      let parts = line.split(",");
      parts.forEach(p => {
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
