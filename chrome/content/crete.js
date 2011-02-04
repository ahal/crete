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
var gIOS = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

var winWidth = 1024;
var winHeight = 768;

var noisy = false;
var browserWindows = [];
var manifest = [];
var pagesLoaded = 0;
var totalPages = 0;
var cycles = 2;
var cycleCount = 0;

function creteInit(args) {
  debugLine("in creteInit()");
  try {
    var manifestURI = args.manifest;
    if (args.noisy) noisy = true;
    
    dumpLine("Manifest: " + manifestURI + "\nNoisy: " + noisy +"\n");

    var fileURI = gIOS.newURI(manifestURI, null, null);
    manifest = loadManifest(fileURI)
    if (manifest.length == 0) {
      dumpLine("crete: no manifest to test, quitting");
    }
    // get our window out of the way
    window.resizeTo(100,10);

    runTests();
  } catch(e) {
    dumpLine(e);
  }

}

function runTests() {
  if (cycleCount < cycles) {
    if (browserWindows.length != 0) {
      //cleanup old windows
      var len=browserWindows.length;
      for(var i=0; i<len; i++) {
        browserWindows[i].close();
      }
    }
    cycleCount++;
    loadWindowsAndTabs();
  } else {
    goQuitApplication();
  }
}

function testChunk() {
  //all the windows tabs are loaded, now i can do some measurments
  //will eventually be described in a manfest file
  debugLine("testChunk()");
  runTests();
}

function loadWindowsAndTabs() {
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
   debugLine('loadTabs for browserWindow ' + browserNo);
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

function loadManifest(manifestUri) {
  var fstream = Cc["@mozilla.org/network/file-input-stream;1"]
    .createInstance(Ci.nsIFileInputStream);
  var uriFile = manifestUri.QueryInterface(Ci.nsIFileURL);

  fstream.init(uriFile.file, -1, 0, 0);
  var lstream = fstream.QueryInterface(Ci.nsILineInputStream);

  var d = [];

  var lineNo = 0;
  var line = {value:null};
  var more;
  var winNo = -1;
  do {
    lineNo++;
    more = lstream.readLine(line);
    var s = line.value;
    debugLine("loaded manifest line " + lineNo + " :" + s);

    // strip comments
    s = s.replace(/#.*/, '');
    // strip leading and trailing whitespace
    s = s.replace(/^\s*/, '').replace(/s\*$/, '');

    if (!s)
      continue;

    // split on whitespace, and figure out if we have any flags
    var items = s.split(/\s+/);
    if (items[0] == "WINDOW") { //new window starting
      winNo++;
      d[winNo] = []
      continue;
    }
    if (items.length != 1) {
        dumpLine("crete: Error on line " + lineNo + " in " + manifestUri.spec + ": whitespace must be %-escaped!");
        return null;
    }

    var url = gIOS.newURI(items[0], null, manifestUri);
    if (winNo < 0) { //assume we are in the first window
      winNo++;
      d[winNo] = [];
    }
    d[winNo].push(url);
    totalPages++;


  } while (more);

  return d;
}

function debugLine(str) {
  if (noisy) {
    dump(str + "\n");
  }
}
function dumpLine(str) {
  dump(str + "\n");
}

