$(document).ready(function() {
  var codeEditor = ace.edit("code-editor"),
      htmlEditor = ace.edit("html-editor"),
      editors = [codeEditor, htmlEditor],
      inputArea = $("#input-area"),
      outputArea = $("#output-area"),
      errorAlert = $("#error-alert"),
      autoEvalCheckbox = $("#autoEvalCheckbox"),
      runBtn = $("#run-btn"),
      htmlContainer = $("#html-container"),
      languageSelect = $("#language-select"),
      newSessionBtn = $("new-session-btn");


  editors.forEach(setupEditor);
  setupInputArea();
  setUpRunButton();
  restoreValues();
  setupUI();



  function setupUI() {
    languageSelect.change(onLanguageChange);
    newSessionBtn.click(newSession);

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
          console.log("troggle");
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

    if (editor == codeEditor) {
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
    editor.getSession().on('change', onChange.bind(editor));
  }

  autoEvalCheckbox.on("change", onToggleAutoEval);

  function toggleAutoEval() {
    autoEvalCheckbox.prop("checked", !isAutoEvalEnabled());
    onToggleAutoEval();
  }

  function onToggleAutoEval() {
    var enabled = autoEvalCheckbox.prop("checked");
    localStorage.setItem("fumblerAutoEval", enabled);
    if (enabled)
      saveAndEval();
  }

  function isAutoEvalEnabled() {
    return autoEvalCheckbox.prop("checked");
  }

  function restoreValues() {
    var input = localStorage.getItem("fumblerInput"),
        code  = localStorage.getItem("fumblerCode");

    autoEvalCheckbox.prop("checked", JSON.parse(localStorage.getItem("fumblerAutoEval")));
    languageSelect.val(localStorage.getItem("fumblerLanguage") || "javascript");

    if (!input && !code) {
      fetchAndLoadExample();
    } else {
      inputArea.val(input);
      codeEditor.setValue(code);
      htmlEditor.setValue("<div>Your HTML code</div>")
    }


    _.invoke(editors, "clearSelection");

    saveAndEval();
  }

  function saveAndEval() {
    save();

    var code = codeEditor.getValue();
    if (languageSelect.val() == "coffee") {
      code = transpileCode(code);
      if (!code) return;
    }

    outputArea.val(evalCode(code));
  }

  function transpileCode(code) {
    try {
        return CoffeeScript.compile(code, {bare : true});
    } catch (e) {
      console.error("an error occured while compiling your code",  e)
      showError(e);
      return null;
    }
  }

  function evalCode(code) {
    try {
      // make input available to code
      var input = inputArea.val();
      var output = eval(code);
      hideError();
      return output;
    } catch (e) {
      console.error("an error occured while executing your code",  e)
      showError(e);
    }
  }

  function save() {
    localStorage.setItem("fumblerCode", codeEditor.getValue());
    localStorage.setItem("fumblerInput", inputArea.val());
  }

  function onChange() {
    save();
    if (this == codeEditor) {
      if (isAutoEvalEnabled())
        saveAndEval();
    } else {
      renderHTML();
    }
  }

  function setupInputArea() {
    inputArea.on("input", onChange);
  }

  function showError(err) {
    errorAlert.text("JavaScript exception: " + err);
    errorAlert.show();
  }

  function hideError() {
    errorAlert.hide();
  }

  function loadExample(example) {
    languageSelect.val(example.language);
    inputArea.val(example.input);
    codeEditor.setValue(example.code);
    htmlEditor.setValue(example.html);

  }

  function fetchAndLoadExample() {
    jQuery.get("examples/html-to-coffee-react.json", loadExample, "json");
  }

  function setUpRunButton() {
    runBtn.click(saveAndEval);
    runBtn.tooltip({ title : "Ctrl-Enter" });

    autoEvalCheckbox.parent().tooltip({ title : "Esc" })
  }


  function renderHTML() {
    var htmlCode = htmlEditor.getValue();
    htmlContainer.html(htmlCode);
  }

  function onLanguageChange() {
    var language = languageSelect.val();
    localStorage.setItem("fumblerLanguage", language);
    codeEditor.getSession().setMode("ace/mode/" + language);

    saveAndEval();
  }


  function exportSession() {
    var session = {
      "input" : inputArea.val(),
      "code" : codeEditor.getValue(),
      "language" : languageSelect.val(),
      "html" : htmlEditor.getValue()
    };

    // TODO: escape the session for printing ...
    return session;
  }


  function newSession() {
    // TODO: get session name
  }



  window.exportSession = exportSession;




});