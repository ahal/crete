/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is tp.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Halberstadt <halbersa@gmail.com>
 *   Alice Nodelman <anodelman@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// the io service
const gIOS = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
const windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

var winWidth = 1024;
var winHeight = 768;

var noisy = false;
var browserWindows = [];
var pagesLoaded = 0;
var totalPages = 0;
var cycles = 2;
var cycleCount = 0;

function creteInit(args) {
  debugLine("in creteInit()");
  try {
    var manifestURI = args.manifest;
    if (args.noisy) noisy = true;
    
    debugLine("Manifest: " + manifestURI + "\nNoisy: " + noisy);

    var fileURI = gIOS.newURI(manifestURI, null, null);
    debugLine("fileURI: " + fileURI);
    
    var obj = loadManifest(fileURI);
    if (obj.commands.length == 0) {
      dumpLine("crete: no commands to run, quitting");
      return;
    }

    runTest(obj.commands);
  } catch(e) {
    dumpLine(e);
  }
}

function Driver() {
  this.window = windowMediator.getMostRecentWindow("navigator:browser");
}

Driver.prototype.openTab = function (url) {
  debugLine("in Driver.createTab()");
  var browser = this.window.getBrowser();
  return browser.addTab(url);
}

Driver.prototype.openWindow = function (args) {

}

function runTest(commands) {
  debugLine("in runTest()");
  var driver = new Driver();
  
  for (var i = 0; i < commands.length; ++i) {
    debugLine("op: " + commands[i].op);
    switch (commands[i].op) {
      case "openTab":
        driver.openTab(commands[i].url);
        break;
      case "openWindow":
        driver.openWindow();
        break;
      default:
    }
  }
}

function loadManifest(manifestUri) {
  const fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
  const cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
  
  var uriFile = manifestUri.QueryInterface(Ci.nsIFileURL);
  fstream.init(uriFile.file, -1, 0, 0);
  cstream.init(fstream, "UTF-8", 0, 0);
  
  var data = "";
  let (str = {}) {
    let read = 0;
    do {
      read = cstream.readString(0xffffffff, str);
      data += str.value;
    } while (read != 0);
  }
  cstream.close();  // Also closes fstream

  debugLine(data);
  return JSON.parse(data);
}




function loadWindowsAndTabs() {
  debugLine("in loadWindowsAndTabs()");
  function makeCreteLoadTabsFunc(browserNo) {
    return (function () {
      loadTabs(browserNo);
    });
  }
  function makeBrowserLoadFunc(browserNo) {
    return (function () {
      debugLine("eventListener for browserWindow " + browserNo);
      browserWindows[browserNo].removeEventListener('load', arguments.callee, true);

      // do this half a second after load, because we need to be
      // able to resize the window and not have it get clobbered
      // by the persisted values
      setTimeout(function () {
                   browserWindows[browserNo].resizeTo(winWidth, winHeight);
                   browserWindows[browserNo].moveTo(0, 0);
                   browserWindows[browserNo].focus();
  
                   setTimeout(makeCreteLoadTabsFunc(browserNo), 100);
                 }, 500);
    });
  }
  var wwatch = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);
  var blank = Cc["@mozilla.org/supports-string;1"]
    .createInstance(Ci.nsISupportsString);
  blank.data = "about:blank";

  //open all the windows described in the manifest
  var len=manifest.length;
  for(var i=0; i<len; i++) {
    browserWindows[i] = wwatch.openWindow
      (null, "chrome://browser/content/", "_blank", null, blank);

    browserWindows[i].addEventListener('load', makeBrowserLoadFunc(i), true);
  }
}

function loadTabs(browserNo) {
   debugLine("in loadTabs() for browserWindow: " + browserNo);
   var tabUrls = manifest[browserNo].map(function(p) { return p.spec.toString(); });
   len = tabUrls.length;
   for(var i = 0; i<len; i++) {
     newTab = browserWindows[browserNo].gBrowser.addTab(tabUrls[i]);
     browserWindows[browserNo].gBrowser.selectedTab = newTab;
     newTabBrowser = browserWindows[browserNo].gBrowser.getBrowserForTab(newTab);
     newTabBrowser.addEventListener("load", markAsLoaded, true);

   }
}

function markAsLoaded() {
  pagesLoaded++;
  if (pagesLoaded == totalPages) {
    pagesLoaded = 0;
    testChunk();
  }
}

function debugLine(str) {
  if (noisy) {
    dump(str + "\n");
  }
}
function dumpLine(str) {
  dump(str + "\n");
}

