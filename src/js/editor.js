$(document).ready(function(){
	/*$(document).mousemove(function(event) {
		var splitVal = event.pageX / $(document).width();

		$("#code").css({right: ((1-splitVal)*100)+"%"});
		$("#preview").css({left: (splitVal*100)+"%"});
	});*/

	now.ready(function() {
		var delay;
		var editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
			mode: 'text/html',
			lineNumbers: true,
			lineWrapping: true,
			onChange: function() {
				clearTimeout(delay);
				delay = setTimeout(updatePreview, 300);
			}
		});

		$(".toolbar").click(function() {
			var tool = $(this).attr("title");

			var newSelection = editor.getSelection();

			if (tool == "img") {
				var src = prompt("Enter the URL of the image");

				if (!src) return;

				newSelection = '<img src="' + src + '" />';
			}
			else if (tool == "a") {
				var href = prompt("Enter the URL of the link");

				if (!href) return;

				var text;

				if (editor.somethingSelected()) {
					text = editor.getSelection();
				}
				else {
					text = prompt("Enter the text of the link");
				}
					
				if (!text) text = href;

				newSelection = '<a href="' + href + '">' + text + '</a>';
			}
			else if (editor.somethingSelected()) {
				newSelection = "<"+tool+">"+newSelection+"</"+tool+">";
			}

			editor.replaceSelection(newSelection);
		});

		function updatePreview() {
			now.transform(editor.getValue(), function(val) {
				var doc = $('#preview iframe')[0];
				var win = doc.contentDocument || doc.contentWindow.document;

				// putting HTML into iframe
				win.open();
				win.write(val);
				win.close();
			});
		}

		updatePreview();
	});
});