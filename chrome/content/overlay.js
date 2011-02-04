var Cc = Components.classes;
var Ci = Components.interfaces;

var cmdLineHandler = Cc["@mozilla.org/commandlinehandler/general-startup;1?type=crete"].getService(Ci.nsICommandLineHandler);
  
function startCrete() {
  dump("in startCrete()\n");
  window.removeEventListener("load", startCrete, false);
  var cmd = cmdLineHandler.wrappedJSObject;
  creteInit(cmd);
}

// Register load listener for command line arguments handling.
window.addEventListener("load", startCrete, false);
