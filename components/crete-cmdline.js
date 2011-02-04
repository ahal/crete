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
 * The Original Code is DOM Inspector.
 *
 * The Initial Developer of the Original Code is
 * Christopher A. Aillon <christopher@aillon.com>.
 * Portions created by the Initial Developer are Copyright (C) 2003
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Christopher A. Aillon <christopher@aillon.com>
 *   L. David Baron, Mozilla Corporation <dbaron@dbaron.org> (modified for reftest)
 *   Vladimir Vukicevic, Mozilla Corporation <dbaron@dbaron.org> (modified for tp)
 *   Alice Nodelman, Mozilla Corporation <anodelman@mozilla.com> (modified for crete)
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

const CRETE_CONTRACTID  = "@mozilla.org/commandlinehandler/general-startup;1?type=crete";
const CRETE_CID         = Components.ID('{190f1399-4412-47da-b1af-ca4a31de8eab}');
const CRETE_CATEGORY    = "m-crete";
const CRETE_DESCRIPTION = "Crete Lightweight Firefox Automation";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
const appShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
const windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);

Components.utils["import"]("resource://gre/modules/XPCOMUtils.jsm");

// Command Line Handler
function CommandLineHandler() {
    this.wrappedJSObject = this;
};

CommandLineHandler.prototype = {
  classID: CRETE_CID,
  classDescription: CRETE_DESCRIPTION,
  contractID: CRETE_CONTRACTID,
  
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsISupports,
      Ci.nsICommandLineHandler
  ]),

  _xpcom_categories: [{
      category: "command-line-handler",
      entry: CRETE_CATEGORY,
  }],
  
  crete: null,

  /* nsICommandLineHandler */
  handle : function (cmdLine) {
    window = appShellService.hiddenDOMWindow;
    
    try {
      this.manifest = cmdLine.handleFlagWithParam("crete", false);
      if (cmdLine.handleFlag("crete-noisy", false)) {
        this.noisy = true;
      }
    }
    catch (e) {
      dump("incorrect parameter passed to crete on the command line.");
      return;
    }

    dump("manifest: " + this.manifest + "\n");
    dump("noisy: " + this.noisy + "\n");

    /*if (this.manifest) {
      //window.open("chrome://crete/content/crete.xul", "crete", "chrome,width=600,height=300");
      cmdLine.preventDefault = true;
    
      // get our data through xpconnect
      args.wrappedJSObject = args;

      var wwatch = windowWatcher;
      var win = wwatch.openWindow(null, "chrome://crete/content/crete.xul", "_blank", "chrome,dialog=no,all", args);
    }*/
  },

  helpInfo : "  -crete <file>        Run crete test described in given manifest\n" +
             "  -crete-noisy         Dump debug messages to console during test run\n",
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([CommandLineHandler]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([CommandLineHandler]);
