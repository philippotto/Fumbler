$(document).ready(function() {

  var SessionHandler = (function() {
    function SessionHandler() {}

    SessionHandler.prototype.settings = function(attr, value) {
      if (arguments.length > 1) {
        this.db.settings[attr] = value;
        this.save();
      } else {
        return this.db.settings[attr];
      }
    };

    SessionHandler.prototype.createSession = function(aSession) {
      var newSession;
      if (aSession) {
        newSession = aSession;
      } else {
        newSession = {
          id : this.getHighestID() + 1,
          name : "Untitled",
          code : "Your code", html : "Your html", css : "", input : "Your input", language : "javascript"
        };
      }

      this.db.sessions[newSession.id] = newSession;
      this.visitSession(newSession.id);
      this.save();
    };

    SessionHandler.prototype.visitSession = function(sessionID) {
      this.db.currentSessionID = sessionID;
      this.save();
    }

    SessionHandler.prototype.getHighestID = function() {
      if (_.size(this.db.sessions) == 0)
        return 0;
      return _.max(this.db.sessions, "id");
    }

    SessionHandler.prototype.deleteCurrentSession = function() {
      delete this.db.sessions[this.db.currentSessionID];
      this.save();
    }

    SessionHandler.prototype.getCurrentSession = function() {
      return this.db.sessions[this.db.currentSessionID];
    }

    SessionHandler.prototype.saveCurrentSession = function() {
      var s = this.getCurrentSession();

      s.code = ui.codeEditor.getValue();
      s.html = ui.htmlEditor.getValue();
      s.input = ui.inputArea.val();
      s.language = ui.languageSelect.val();
      this.save();
    }

    SessionHandler.prototype.save = function() {
      localStorage.setItem("fumblerDB", JSON.stringify(this.db));
    }

    SessionHandler.prototype.load = function() {
      this.db = JSON.parse(localStorage.getItem("fumblerDB"));

      if (this.db)
        return jQuery.Deferred().resolve();

      this.db = {
        currentSessionID : 0,
        sessions : {},
        settings : {
          autoEval : true
        }
      };

      var promise = new jQuery.Deferred();
      var _this = this;
      jQuery.get("examples/html-to-coffee-react.json", "json").then(function success(example) {
        _this.createSession(example);
        promise.resolve();
      }, function fail() {
        _this.createSession();
        promise.resolve();
      });

      return promise;
    }

    SessionHandler.prototype.exportSession = function() {
      // TODO: escape the session for printing ...
      return this.getCurrentSession();
    }

    return SessionHandler;
  })();


  var ui = {
    codeEditor : ace.edit("code-editor"),
    htmlEditor : ace.edit("html-editor"),
    inputArea : $("#input-area"),
    outputArea : $("#output-area"),
    errorAlert : $("#error-alert"),
    autoEvalCheckbox : $("#autoEvalCheckbox"),
    runBtn : $("#run-btn"),
    htmlContainer : $("#html-container"),
    languageSelect : $("#language-select"),
    closeWelcomeBtn : $("#close-welcome-btn"),
    newSessionBtn : $("#new-session-btn"),
    addScriptBtn : $("#add-script-btn"),
    addScriptInput : $("#add-script-input")
  };
  ui.editors = [ui.codeEditor, ui.htmlEditor];

  var sessionHandler = new SessionHandler();

  sessionHandler.load().then(function() {
    ui.editors.forEach(setupEditor);
    setUpRunButton();
    restoreValues();
    setupUI();
    addChangeListener();
  });



  function setupUI() {
    // ui.newSessionBtn.click(newSession);

    ui.addScriptBtn.click(function() {
      var url = ui.addScriptInput.val();
      // TODO
      // ensure that requirejs/amd modules are loaded properly?
      $.getScript(url);
    })


    if (localStorage.getItem("fumblerWelcomeWasClosed")) {
      ui.closeWelcomeBtn.parent().hide();
    }

    ui.closeWelcomeBtn.click(function() {
      localStorage.setItem("fumblerWelcomeWasClosed", true);
    });

    // TODO: find a better place?
    onLanguageChange();
  }


  function setupEditor(editor) {
    editor.commands.addCommand({
        name: "uncollapse",
        bindKey: {
            win: "Ctrl-Alt-0"
        },
        exec: function(editor, line) {
            return false;
        },
        readOnly: true
    });

    editor.commands.addCommand({
        name: "toggleAutoEval",
        bindKey: {
            win: "Esc"
        },
        exec: function(editor, line) {
          toggleAutoEval();
          return false;
        },
        readOnly: true
    });

    editor.commands.addCommand({
        name: "runCode",
        bindKey: {
            win: "CTRL-Enter"
        },
        exec: function(editor, line) {
          saveAndEval();
          return false;
        },
        readOnly: true
    });

    if (editor == ui.codeEditor) {
      editor.commands.addCommand({
        name: "runSelectedCode",
        bindKey: {
            win: "CTRL-e"
        },
        exec: function(editor, line) {
          code = editor.getSelectedText() || line;
          var result = evalCode(code);
          // TODO: clearSelection and move the cursor to the end of the old selection
          editor.insert("" + result);
          return false;
        },
        readOnly: true
      });
    }

    // editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/html");
  }

  function addChangeListener() {
    ui.inputArea.on("input", onChange);
    ui.editors.map(function(editor) {
      editor.getSession().on('change', onChange.bind(editor));
    });
    ui.autoEvalCheckbox.change(onToggleAutoEval);
    ui.languageSelect.change(onLanguageChange);
  }


  function toggleAutoEval() {
    ui.autoEvalCheckbox.prop("checked", !sessionHandler.settings("autoEval"));
    onToggleAutoEval();
  }

  function onToggleAutoEval() {
    var enabled = ui.autoEvalCheckbox.prop("checked");
    sessionHandler.settings("autoEval", enabled);
    if (enabled)
      saveAndEval();
  }

  function restoreValues() {
    var currentSession = sessionHandler.getCurrentSession();

    ui.autoEvalCheckbox.prop("checked", sessionHandler.settings("autoEval"));
    ui.languageSelect.val(currentSession.language);

    ui.inputArea.val(currentSession.input);
    ui.codeEditor.setValue(currentSession.code);
    ui.htmlEditor.setValue(currentSession.html);

    _.invoke(ui.editors, "clearSelection");
    _.invoke(ui.editors, onChange);

    saveAndEval();
    renderHTML()
  }

  function saveAndEval() {
    sessionHandler.saveCurrentSession();

    var code = ui.codeEditor.getValue();
    if (ui.languageSelect.val() == "coffee") {
      code = transpileCode(code);
      if (!code) return;
    }

    var result = evalCode(code);
    var formattedResult = formatValue(result);

    ui.outputArea.val(formattedResult);
  }

  function formatValue(val) {
    if (_.isObject(val)) {
      // TODO: find a tree viewer like component to display objects
      try {
        return JSON.stringify(val);
      } catch (ex) {}
    }

    return val;
  }

  function transpileCode(code) {
    try {
      return CoffeeScript.compile(code, {bare : true});
    } catch (e) {
      console.warn("an error occured while compiling your code",  e)
      showError(e);
      return null;
    }
  }

  function evalCode(code) {
    try {
      // make input variable available to code
      var input = ui.inputArea.val();
      var output = eval(code);
      hideError();
      return output;
    } catch (e) {
      console.warn("an error occured while executing your code",  e)
      showError(e);
    }
  }


  function onChange() {
    sessionHandler.saveCurrentSession();
    if (this == ui.codeEditor) {
      if (sessionHandler.settings("autoEval"))
        saveAndEval();
    } else {
      renderHTML();
    }
  }

  function showError(err) {
    ui.errorAlert.text("JavaScript exception: " + err);
    ui.errorAlert.show();
  }

  function hideError() {
    ui.errorAlert.hide();
  }

  function setUpRunButton() {
    ui.runBtn.click(saveAndEval);
    ui.runBtn.tooltip({ title : "Ctrl-Enter" });

    ui.autoEvalCheckbox.parent().tooltip({ title : "Esc" })
  }


  function renderHTML() {
    var htmlCode = ui.htmlEditor.getValue();
    ui.htmlContainer.html(htmlCode);
  }

  function onLanguageChange() {
    var language = ui.languageSelect.val();
    localStorage.setItem("fumblerLanguage", language);
    ui.codeEditor.getSession().setMode("ace/mode/" + language);

    saveAndEval();
  }


});