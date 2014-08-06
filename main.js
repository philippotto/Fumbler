$(document).ready(function() {
  var editor = ace.edit("editor");
  var inputArea = $("#input-area");
  var outputArea = $("#output-area");

  setupEditor();
  setupInputArea();
  restoreValues();
  evalCode();

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

    editor.getSession().on('change', function() {
      saveCode();
      evalCode();
    });
  }

  function restoreValues() {
    inputArea.val(localStorage.getItem("fiddlerInput"));
    editor.setValue(localStorage.getItem("fiddlerCode"));
  }

  function evalCode() {
    window.input = inputArea.val();
    var code = editor.getValue();
    try {
      if (!window.noAutoEval)
        outputArea.val(eval(code));
    } catch (e) {
      console.error("an error occured while executing your code",  e)
    }
  }

  function saveCode() {
    var code = editor.getValue();
    localStorage.setItem("fiddlerCode", code);
  }

  function setupInputArea() {
    inputArea.on("input", function() {
      localStorage.setItem("fiddlerInput", inputArea.val());
      evalCode();
    });
  }

});