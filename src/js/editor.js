(function() {
function createCookie(name,value,days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        expires = "; expires="+date.toGMTString();
    }
    else expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

$(document).ready(function(){
	var splitSize = readCookie('splitsize');
	
	if (!splitSize) {
		splitSize = $(document).width() / 2;
	}

	function setSplitAt(value) {
		value = Math.max(50, Math.min(value, $(document).width() - 50));

		var leftSize = value;
		var rightSize = $(document).width() - value;

		$("#code").css({right: rightSize + 2});
		$("#preview").css({left: leftSize + 2});
		$("#splitter").css({left: leftSize - 2});

		splitSize = value;
	}

	var dragHandler = function(e) {
		setSplitAt(e.pageX);
	};

	var releaseHandler = function() {
		$(document).unbind('mousemove', dragHandler);
		$(document).bind('mouseup', releaseHandler);

		$('#dragSurface').remove();

		createCookie('splitsize', splitSize, 365);
	};

	$('#splitter').mousedown(function() {
		$(document).bind('mousemove', dragHandler);
		$(document).bind('mouseup', releaseHandler);

		$('body').append($('<div id="dragSurface"></div>'));

		return false;
	});

	setSplitAt(splitSize);

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

		$("#dcolor").change(function() {		
			var newSelection = String(editor.getSelection());
			var tag = "<font";
			if(newSelection.substring(0, tag.length).toLowerCase() == tag){
				var code = newSelection.substring(newSelection.indexOf("#")+1,newSelection.indexOf("#")+7);
				newSelection = newSelection.replace(code,this.color);
			}else{
				newSelection = "<font color='#"+this.color+"'>"+newSelection+"</font>";
			}
			editor.replaceSelection(newSelection);			
		});
		
		function updatePreview() {
			now.transform(editor.getValue(), function(val) {
				if (val == null) {
					alert('Error while parsing input');
					return;
				}

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
}());