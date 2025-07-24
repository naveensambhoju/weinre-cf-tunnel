// weinre-patch.js
const Module = require("module");
const path = require("path");

const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  const loadedModule = originalLoad(request, parent, isMain);

  if (request.includes("weinre/lib/utils")) {
    const utils = loadedModule;

    const originalFunc = utils.callSiteToString;
    if (originalFunc) {
      utils.callSiteToString = function (callSite) {
        let func;
        try {
          func = callSite.getFunction();
        } catch (e) {}

        let funcName =
          (func && (func.displayName || func.name)) ||
          callSite.getFunctionName();
        const fileName = callSite.getFileName();
        const lineNumber = callSite.getLineNumber();
        const columnNumber = callSite.getColumnNumber();

        return `${funcName} (${fileName}:${lineNumber}:${columnNumber})`;
      };
    }
  }

  return loadedModule;
};
