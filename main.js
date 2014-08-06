$(document).ready(function() {
  var editor = ace.edit("editor");
  var inputArea = $("#input-area");
  var outputArea = $("#output-area");
  var errorAlert = $("#error-alert");

  setupEditor();
  setupInputArea();
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

    // editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");

    editor.getSession().on('change', saveAndEval);
  }

  function restoreValues() {
    var input = localStorage.getItem("fumblerInput");
        code  = localStorage.getItem("fumblerCode");

    if (!input && !code) {
      fetchAndLoadExample();
    } else {
      inputArea.val(input);
      editor.setValue(code);
    }

    saveAndEval();
  }

  function evalCode() {
    // make the input accessible via global namespace,
    // so that the script can access it
    window.input = inputArea.val();
    var code = editor.getValue();
    try {
      if (!window.noAutoEval) {
        outputArea.val(eval(code));
      }
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

  function saveAndEval() {
    save();
    evalCode();
  }

  function setupInputArea() {
    inputArea.on("input", saveAndEval);
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

});