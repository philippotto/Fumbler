$(document).ready(function() {
  var editor = ace.edit("editor"),
      inputArea = $("#input-area"),
      outputArea = $("#output-area"),
      errorAlert = $("#error-alert"),
      autoEvalCheckbox = $("#autoEvalCheckbox"),
      runBtn = $("#run-btn");

  setupEditor();
  setupInputArea();
  setUpRunButton();
  restoreValues();


  function setupEditor() {
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

    // editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().on('change', onChange);
  }

  autoEvalCheckbox.on("change", onToggleAutoEval);

  function toggleAutoEval() {
    autoEvalCheckbox.prop("checked", !isAutoEvalEnabled());
    onToggleAutoEval();
  }

  function onToggleAutoEval() {
    var enabled = autoEvalCheckbox.prop("checked");
    localStorage.setItem("fumblerAutoEval", enabled);
  }

  function isAutoEvalEnabled() {
    return autoEvalCheckbox.prop("checked");
  }

  function restoreValues() {
    var input = localStorage.getItem("fumblerInput"),
        code  = localStorage.getItem("fumblerCode");

    autoEvalCheckbox.prop("checked", JSON.parse(localStorage.getItem("fumblerAutoEval")));

    if (!input && !code) {
      fetchAndLoadExample();
    } else {
      inputArea.val(input);
      editor.setValue(code);
    }

    saveAndEval();
  }

  function saveAndEval() {
    save();

    // make the input accessible via global namespace,
    // so that the script can access it
    window.input = inputArea.val();
    var code = editor.getValue();
    try {
      outputArea.val(eval(code));
      hideError();
    } catch (e) {
      console.error("an error occured while executing your code",  e)
      showError(e);
    }
  }

  function save() {
    localStorage.setItem("fumblerCode", editor.getValue());
    localStorage.setItem("fumblerInput", inputArea.val());
  }

  function onChange() {
    save();
    if (isAutoEvalEnabled())
      saveAndEval();
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
    inputArea.val(example.input);
    editor.setValue(example.code);
  }

  function fetchAndLoadExample() {
    jQuery.get("examples/html-to-coffee-react.json", loadExample, "json");
  }

  function setUpRunButton() {
    runBtn.click(saveAndEval);
    runBtn.tooltip({ title : "Ctrl-Enter" });

    autoEvalCheckbox.parent().tooltip({ title : "Esc" })
  }

});