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
			//closeTagEnabled: false, // Set this option to disable tag closing behavior without having to remove the key bindings.
			lineNumbers: true,
			lineWrapping: true,
			extraKeys: {
				"'>'": function(cm) {try{ cm.closeTag(cm, '>'); }catch(err){ if(err== CodeMirror.Pass) autoEncodePre(cm, '>');}},
				"'/'": function(cm) { cm.closeTag(cm, '/'); },
				"'<'": function(cm) { autoEncodePre(cm, '<');}
			},
			onChange: function() {
				clearTimeout(delay);
				delay = setTimeout(updatePreview, 300);
			},
            onCursorActivity: function() {
                var iCount = countTagToCursor("<article>");
                if(iCount != -1 && $('#preview iframe')[0].contentWindow.curSlide != iCount) {
                    $('#preview iframe')[0].contentWindow.gotoSlide(iCount);
                }
            }
		});
        function countTagToCursor(szValue) {
            var iCount = -1;
            for(var iRow = 0; iRow <= editor.getCursor().line; ++iRow) {
                info = editor.lineInfo(iRow);
                if(info.text.indexOf(szValue) != -1){
                    iCount += 1;
                }
            }
            return iCount;
        }

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
            else if(tool == "strikethrough" || tool == "underline"){
                newSelection = "<em class=\""+tool+"\">"+newSelection+"</em>";
            }
			else if (editor.somethingSelected()) {
				newSelection = "<"+tool+">"+newSelection+"</"+tool+">";
			}

			editor.replaceSelection(newSelection);
		});

		$("#dcolor").change(function() {		
			var newSelection = String(editor.getSelection());
			var tag = "<span";
			if(newSelection.substring(0, tag.length).toLowerCase() == tag){
				var code = newSelection.substring(newSelection.indexOf("#")+1,newSelection.indexOf("#")+7);
				newSelection = newSelection.replace(code,this.color);
			}else{
				newSelection = "<span style='color:#"+this.color+";'>"+newSelection+"</span>";
			}
			editor.replaceSelection(newSelection);			
		});

        function isFirefox() {
            var agt= navigator.userAgent.toLowerCase();
            if (agt.indexOf("firefox") == -1) {
                return false;
            }
            return true;
        }
        function setCurrentSlide(contentWindow, num) {
           if(!isFirefox()) {
                contentWindow.location.hash = num;
           }
        }

		
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
                setCurrentSlide(doc.contentWindow, countTagToCursor("<article>")+1);

                win.close();
			});
		}
		
		function autoEncodePre(cm, ch){
			var pos = cm.getCursor();
			var tok = cm.getTokenAt(pos);
			var state = tok.state;
			
			var type = state.htmlState ? state.htmlState.type : state.type;

			if (state.htmlState.context.tagName == 'pre') {
				if (ch == '<') {
					cm.replaceSelection('&lt;');
				}else if (ch == '>') {
					cm.replaceSelection('&gt;');
				}
				pos = {line: pos.line, ch: pos.ch + 4};
				cm.setCursor(pos);
				return;			
			}else{
				throw CodeMirror.Pass;
			}
		}
		
        updatePreview();
	});
});
}());
