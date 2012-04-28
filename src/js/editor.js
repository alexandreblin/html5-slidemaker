$(document).ready(function(){
	/*$(document).mousemove(function(event) {
		var splitVal = event.pageX / $(document).width();

		$("#code").css({right: ((1-splitVal)*100)+"%"});
		$("#preview").css({left: (splitVal*100)+"%"});
	});*/

	now.ready(function() {
		var delay;
		var myCodeMirror = CodeMirror.fromTextArea(document.getElementById("editor"), {
			mode: 'text/html',
			lineNumbers: true,
			lineWrapping: true,
			onChange: function() {
				clearTimeout(delay);
				delay = setTimeout(updatePreview, 300);
			}
		});

		function updatePreview() {
			now.transform(myCodeMirror.getValue(), function(val) {
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