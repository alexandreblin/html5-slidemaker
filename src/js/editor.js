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
	now.ready(function() {
		var delay;
		var previewFrame = $('#preview > iframe')[0];
		var splitSize = readCookie('splitsize');
		var saveButton = $("#save");
		var filesComboId = "#files";
		var delFileButton = $("#removeFile");

		var selectedSlide;

		$(window).bind('hashchange', function() {
			selectedSlide = parseInt(window.location.hash.replace('#', '')) - 1;
			if (!selectedSlide || selectedSlide < 0) { selectedSlide = 0; }
		});
		
		if (!splitSize) {
			splitSize = $(document).width() / 2;
		}

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
				selectedSlide = getSlideInfoOnCursor();
				if(selectedSlide != -1 && previewFrame.contentWindow.curSlide != selectedSlide) {
					previewFrame.contentWindow.gotoSlide(selectedSlide);
				}
			}
		});

		function setSplitAt(value) {
			value = Math.max(50, Math.min(value, $(document).width() - 50));

			var leftSize = value;
			var rightSize = $(document).width() - value;

			$("#code").css({right: rightSize + 2});
			$("#preview").css({left: leftSize + 2});
			$("#splitter").css({left: leftSize - 2});

			editor.refresh();

			splitSize = value;
		}
		
		function fillFilesCombobox(){
			for (var cle in localStorage){
				$(filesComboId).append("<option value='"+cle+"'>"+cle+"</option>");
			}
		}
		
		$(filesComboId).change(function() {
			if (localStorage) {
				editor.setValue(localStorage[$(this).val()]);
			} else {
				alert("'localStorage' not supported by your navigator!");
			}
		});
		
		saveButton.click(function() {
			var name = "";
			while(name == ""){
				name = prompt("Enter the name of the presentation");
			}
			if(name==null) return;
			
			if (localStorage) {
				localStorage[name] = editor.getValue();
				$(filesComboId).append("<option value='"+name+"'>"+name+"</option>")
			} else {
				alert("Functionality not supported by your navigator!");
			}
		});
		
		delFileButton.click(function(){
			if (localStorage) {
				var cle = $(filesComboId+" option:selected");
				if(cle.val() != ""){
					localStorage.removeItem(cle.text());
					$(filesComboId+" option:selected").remove()
				}
			} else {
				alert("Functionality not supported by your navigator!");
			}
		});

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

		function getSlideInfoOnCursor() {
			var text = editor.getValue();

			var tags = [];

			var pos = text.indexOf('<article');
			while (pos != -1) {
				tags[pos] = true;
				pos = text.indexOf('<article', pos+1);
			}

			pos = text.indexOf('</article>');
			while (pos != -1) {
				tags[pos] = false;
				pos = text.indexOf('</article>', pos+1);
			}
			var iLevel = 0;
			var iCurrentSlide = -1;
			var cursorInf = editor.getCursor();
			for (var i in tags) {
				var infoChar = editor.posFromIndex(i);
				if(infoChar.line < cursorInf.line || (infoChar.line == cursorInf.line && infoChar.ch <= cursorInf.ch)) {
					if (tags[i] == true) {
						iLevel++;
						if (iLevel == 1) {
							// we just got a first level <article>
							iCurrentSlide++;
						}
					}
					else {
						iLevel--;
					}
				} else {
					break;
				}
			}
			return iCurrentSlide;
		}
		function getSlideInfo(iSlide) {
			var text = editor.getValue();

			var szTag = "article";
			var tags = [];

			var pos = text.indexOf('<'+ szTag);
			while (pos != -1) {
				tags[pos] = true;
				pos = text.indexOf('<'+ szTag, pos+1);
			}

			pos = text.indexOf('</'+ szTag+'>');
			while (pos != -1) {
				tags[pos] = false;
				pos = text.indexOf('</'+ szTag+'>', pos+1);
			}
			var iLevel = 0;
			var iCurrentSlide = -1;
			var result = {from: null, to:null};
			for (var i in tags) {
				if (tags[i] == true) {
					iLevel++;
                    if (iLevel == 1) {
						// we just got a first level <article>
						iCurrentSlide++;
						if(iCurrentSlide == iSlide) {
							result.from = editor.posFromIndex(i);
						}
					}
				}
				else {
                    iLevel--;
					if(iLevel == 0 && iCurrentSlide == iSlide) {

                        var newVal = szTag.length + 3 + parseInt(i);
                        result.to = editor.posFromIndex(newVal);
						break;
					}
				}
			}
			return result;
		}

        function changeCurrentColor(cm, ch){
            var pos = cm.getCursor();
            var tok = cm.getTokenAt(pos);
            var state = tok.state;
            console.log(state);
            /*var type = state.htmlState ? state.htmlState.type : state.type;

            if (state.htmlState.context.tagName == 'pre') {
                if (ch == '<') {
                    cm.replaceSelection('&lt;');
                }else if (ch == '>') {
                    cm.replaceSelection('&gt;');
                }
                pos = {line: pos.line, ch: pos.ch + 4};
                cm.setCursor(pos);
                return;
            } else{
                throw CodeMirror.Pass;
            }*/
        }

		$("#toolbar > *[data-tool]").click(function() {
			var tool = $(this).data("tool");
			var newSelection = editor.getSelection();
			var endTagLength = null;

			if (tool == "img") {
				var src = prompt("Enter the URL of the image");

				if (!src) return;

				newSelection = '<img src="' + src + '" />';
				endTagLength = 0;
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
				endTagLength = 0;
				
			}else if(tool == "strike" || tool == "underline"){
				newSelection = "<span class=\""+tool+"\">"+newSelection+"</span>";
				endTagLength = 5;
				
			}else if(tool == "add"){
				var iRow = editor.getCursor().line;

				while(iRow < editor.lineCount()){
					var info = editor.lineInfo(iRow);
					if(info.text.indexOf("</article>") != -1){
						break;
					}
				iRow++;
				}

			  //if current slide is last one
			  if(iRow+1 == editor.lineCount())
				{
					editor.replaceRange("\n",  {line: iRow+1, ch: 0}, {line: iRow+1, ch: 0});
				}

			  editor.replaceRange("\n<article>\n  <p>\n    \n  </p>\n</article>\n",  {line: iRow+1, ch: 0}, {line: iRow+1, ch: 0});
			  editor.focus();
			  editor.setCursor({line:iRow+4, ch: 4});
			  
			}else if(tool == "delete"){
				if(confirm("Are you sure you want to delete the current slide?")){
					var rowStart = editor.getCursor().line;
					var rowEnd = editor.getCursor().line;

					while(rowStart > 0){
						var info = editor.lineInfo(rowStart);
						if(info.text.indexOf("<article>") != -1){
							break;
						}
						rowStart--;
					}

					while(rowEnd < editor.lineCount()){
						var info = editor.lineInfo(rowEnd);
						if(info.text.indexOf("</article>") != -1){
							break;
						}
						rowEnd++;
					}
						rowEnd++;

						if(editor.lineInfo(rowEnd)!=null && editor.lineInfo(rowEnd).text.length == 0){
							rowEnd++;
						}

					editor.replaceRange("",{line: rowStart, ch:0}, {line: rowEnd, ch: 0});
				}
			}
			else {
				newSelection = "<"+tool+">"+newSelection+"</"+tool+">";
				endTagLength = tool.length+3;
			}

			var hadSomethingSelected = editor.somethingSelected();

			editor.replaceSelection(newSelection);

			if(endTagLength != null && !hadSomethingSelected){
				var pos = editor.getCursor();
				pos = {line: pos.line, ch: pos.ch - endTagLength};
				editor.setCursor(pos);
			}
			
			editor.focus();
		});

		$('#colorpicker').ColorPicker({
			color: '#000000',
			onChange: function (hsb, hex, rgb) {
				//$('#colorSelector div').css('backgroundColor', '#' + hex);
				var newSelection = String(editor.getSelection());
				var tag = "<span";
				if(newSelection.substring(0, tag.length).toLowerCase() == tag){
					var code = newSelection.substring(newSelection.indexOf("#")+1,newSelection.indexOf("#")+7);
					newSelection = newSelection.replace(code, hex);
				}else{
					newSelection = "<span style='color:#"+hex+";'>"+newSelection+"</span>";
				}
				editor.replaceSelection(newSelection);
				$('#colorpicker').css({'background-color': '#' + hex});
			}
		});

		function updatePreview() {
			now.transform(editor.getValue(), function(previewHTML) {
				if (previewHTML == null) {
					alert('Error while parsing input');
					return;
				}
				
				var content = previewFrame.contentDocument || previewFrame.contentWindow.document;

				// putting HTML into iframe
				content.open();

				// we need to inject some JS before putting it into the iframe to make the slideshow start at the slide we're currently editing
				// and to make it so that when we navigate slides in the iframe, the browser's location hash changes too
				var js = '<script> \
				curSlide = ' + selectedSlide + '; \
				var oldUpdateHash = updateHash; \
				updateHash = function() { oldUpdateHash(); window.top.location.hash = curSlide + 1; } \
				</script>';

				if ($.browser.mozilla) {
					// updateHash is broken in firefox when put in an iframe with no src
					js = js.replace('oldUpdateHash();', '');
				}
				
				previewHTML = previewHTML.replace('</head>', js + '</head>');

				content.write(previewHTML);

				content.close();
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

		$(window).trigger('hashchange');
		setSplitAt(splitSize);
		fillFilesCombobox();
		updatePreview();
	});
});
}());
