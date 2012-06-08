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

	var initialized = false;

	//for back and next buttons
	if ($.browser.safari) {
		if ($("#formRefresh").attr("value") == '1') window.location.reload();
		$("#formRefresh").attr("value",'1');
	}

	function init() {
		// prevent doing the initialization more than once
		// (this function is called every time we (re)connect to nowjs)
		if (initialized) return;
		initialized = true;

		var delay;
		var previewFrame = $('#preview > iframe')[0];
		var splitSize = readCookie('splitsize');
		var filesComboId = "#files";
		var delFileButton = $("#removeFile");
		var totalSlides;
		var selectedSlide;
		var currentFont = 'Arial';

		var fileName = "";
		var isFileModified = true;
		var t;

		for(t in slideTemplate){
			$('#templates').append($('<li><a href="javascript:void(0)" data-tool="add" data-template="'+t+'">'+slideTemplate[t].title+'</a></li>'));
		}

		for(t in fontList){
			$('#fontlist').append($('<li><a href="javascript:void(0)" data-tool="font" data-font="'+t+'" style="font-family:'+t+'">'+fontList[t]+'</a></li>'));
		}

		for(t in themeList){
			$('#themeList').append($('<li><a href="javascript:void(0)" data-tool="theme" data-theme="'+t+'">'+t+'</a></li>'));

		}

		$('#currentFont').html(fontList[currentFont]);

		$("#fontlist a").click(function(){
			currentFont = $(this).data('font');
			$('#currentFont').html(fontList[currentFont]);
		});

		$("#createRoom").click(function(){
			if(slideshowID){
				now.createRoom(slideshowID, slideshowVersion, totalSlides, function(roomId){
					//alert('room URL : ' + '/' + roomId + '/showRoom');
					$(location).attr('href', '/' + roomId + '/showRoom#' + (selectedSlide+1));
				});
			}
		});

		var images;
		function refreshPictures() {
			now.availableImages(slideshowID, function (err, files) {
				images = files;

				if (files.length > 0) {
					$('#noImages').addClass('hide');
				}
				else {
					$('#noImages').removeClass('hide');
				}

				$('#uploadModal .thumbnails').empty();
				for (var i in images) {
					$('#uploadModal .thumbnails').append('<li><a href="javascript:void(0)" data-imgid="'+i+'" class="thumbnail"><span><img src="'+ images[i] +'" alt=""></a></span></li>')
				}

				$('#uploadModal .thumbnail span').nailthumb({replaceAnimation: null});

				$('#uploadModal .thumbnail').click(function() {
					editor.replaceSelection('<img src="' + images[$(this).data('imgid')] + '" alt="" />');
					$('#uploadModal').modal('hide');
				});
			});
		}

		$('#imgInsert').click(function() {
			if (!slideshowID) {
				alert('You have to save the slideshow before inserting pictures');

				return;
			}

			$('#uploadModal').modal();

			refreshPictures();
		});

		function uploadPicture(pics) {
			$('#uploadModal form .alert-warn').html('');
			var total = pics.length;
			var done = 0;
			var fileProgresses = [];
			for (var i = 0; i < total; ++i) {
				(function(i) {
					var pic = pics[i];

					if (pic.type.substr(0, 6) != 'image/') {
						$('#uploadModal form .alert-warn').append(pic.name + ' is not an image.<br />').show();

						return;
					}

					if (i == 0) {
						// little hack to set the progress bar to 0% without the CSS transition (so it goes directly back to 0)
						$('#uploadProgress > .bar').css({'-webkit-transition-duration': '0s'});
						$('#uploadProgress > .bar').css({width: '0%'});
						setTimeout(function() {
							$('#uploadProgress > .bar').css({'-webkit-transition-duration': ''});
						}, 0);

						// start animating the toolbar
						$('#uploadProgress').addClass('active');

						// hide any alerts from a previous upload
						$('#uploadModal form .alert').hide();
					}

					var fd = new FormData();
					
					fd.append('image', pic);
					
					var xhr = new XMLHttpRequest();

					xhr.addEventListener('load', function(e) {
						done++;

						// refresh pictures and stop animating the bar when the upload is done
						if (done == total) {
							refreshPictures();

		    				$('#uploadProgress > .bar').css({width: '100%'});
		    				$('#uploadProgress').removeClass('active');
		    			}
					}, false);
					
					xhr.upload.addEventListener("progress", function(e) {
						if (e.lengthComputable) {
		    				fileProgresses[i] = e.loaded / e.total;

		    				var totalProgress = 0;
		    				for (var j = 0; j < total; ++j) {
		    					totalProgress += (fileProgresses[j] || 0) / (total*1.0);
		    				}

		    				// set the progress bar according to which file is currently uploading and its progress
		    				$('#uploadProgress > .bar').css({width: (totalProgress*100) + '%'});
		    				console.log(totalProgress);
		  				}
					}, false);

					function uploadFailed(e) {
						$('#uploadModal form .alert-error').show();
					}

					xhr.addEventListener("error", uploadFailed, false);
					xhr.addEventListener("abort", uploadFailed, false);

					xhr.open('POST', '/upload/' + slideshowID);
					xhr.send(fd);
				})(i);
			}
		}

		$('#dropbox').bind('dragenter', function(e) {
			$(this).addClass('draghover');

			return false;
		});

		$('#dropbox').bind('dragover', function(e) {
			return false;
		});

		$('#dropbox').bind('dragleave', function(e) {
			$(this).removeClass('draghover');

			return false;
		});

		$('#dropbox').bind('drop', function(e) {
			$(this).removeClass('draghover');

			// jQuery wraps the originalEvent, so we try to detect that here...
			e = e.originalEvent || e;
			
			e.stopPropagation();
			e.preventDefault();

			// Using e.files with fallback because e.dataTransfer is immutable and can't be overridden in Polyfills (http://sandbox.knarly.com/js/dropfiles/).            
			var files = (e.files || e.dataTransfer.files);

			uploadPicture(files);

			return false;
		});

		$('#imageInput').change(function() {
			uploadPicture(document.getElementById('imageInput').files);
    		
    		return false;
		});

		//TODO change name function
		function updateShowFullscreenLink() {
			if (slideshowID) {
				$('#fullscreenGroup').removeClass('hide');
				$('#fullscreen').attr('href', '/' + slideshowID + '/' + slideshowVersion + '/show#' + (selectedSlide+1));
				$('#saveButton button').removeClass('disabled');
			}
		}

		$(window).bind('hashchange', function() {
			selectedSlide = parseInt(window.location.hash.replace('#slide', '')) - 1;
			if (!selectedSlide || selectedSlide < 0) { selectedSlide = 0; }

			if(totalSlides==0){
				$("#selectedSlide").html(0);
			}
			else{
				$("#selectedSlide").html(selectedSlide + 1);
			}

			if(selectedSlide == 0){
				$("button[data-tool=prev]").addClass("disabled");
			}
			else{
				$("button[data-tool=prev]").removeClass("disabled");
			}
			if(totalSlides && selectedSlide == totalSlides-1){
				$("button[data-tool=next]").addClass("disabled");
			}
			else{
				$("button[data-tool=next]").removeClass("disabled");
			}

			updateShowFullscreenLink();

			// scroll the editor to the right slide if we're not focused in the editor
			if (!editorHasFocus) {
				var slide = getSlideInfo(selectedSlide);
				if(slide) {
					var coord = editor.charCoords({line:slide.from.line, ch:slide.from.ch}, "local");
					editor.scrollTo(coord.x, coord.y);
				}
			}
		});

		$('#preview > iframe').load(function (){
			totalSlides = previewFrame.contentWindow.slideEls.length;
			$("#totalSlides").html(totalSlides);

			$(window).trigger('hashchange');
		});

		if (!splitSize) {
			splitSize = $(document).width() / 2;
		}

		var editorHasFocus = false;
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
				isFileModified = true;
			},
			onCursorActivity: function() {
				selectedSlide = getSlideInfoOnCursor();
				if(selectedSlide != -1 && previewFrame.contentWindow.curSlide != selectedSlide) {
					previewFrame.contentWindow.gotoSlide(selectedSlide);
				}
			},
			onFocus: function() {
				editorHasFocus = true;
			},
			onBlur: function() {
				editorHasFocus = false;
			}
		});

		function setSplitAt(value) {
			value = Math.max(50, Math.min(value, $(document).width() - 50));

			$("#code").css({left: 0, width: value - 2});
			$("#preview").css({left: value + 2});
			$("#splitter").css({left: value - 2});

			editor.refresh();

			splitSize = value;
		}

		$(window).resize(function() {
			// refresh the split size so it doesn't go off screen
			setSplitAt(splitSize);
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

		// Each index corresponds to an index tag, its value equals true for start tag and false for end tag.
		// A table of those indexes is returned.
		function getTagIndexes(szText, szTag, bWithAttr) {
			var startTag = bWithAttr ? '<' + szTag : '<' + szTag + '>';
			var endTag = '</' + szTag + '>';

			var tags = {};

			var sPos = szText.indexOf(startTag);
			var ePos = szText.indexOf(endTag);
			while (sPos != -1 || ePos != -1) {
				if(sPos != -1 && ePos != -1) {
					if(sPos < ePos){
						tags[sPos] = true;
						sPos = szText.indexOf(startTag, sPos+1);
					} else {
						tags[ePos] = false;
						ePos = szText.indexOf(endTag, ePos+1);
					}
				} else if(sPos != -1){
					tags[sPos] = true;
					sPos = szText.indexOf(startTag, sPos+1);
				} else {
					tags[ePos] = false;
					ePos = szText.indexOf(endTag, ePos+1);
				}
			}
			return tags;
		}


		// Return the current slide compared with to the cursor position.
		function getSlideInfoOnCursor() {
			var tags = getTagIndexes(editor.getValue(), "article", true);
			var iLevel = 0;
			var iCurrentSlide = -1;
			var cursorInf = editor.getCursor();

			for (var i in tags) {
				var infoChar = editor.posFromIndex(i);
				if(infoChar.line < cursorInf.line || (infoChar.line == cursorInf.line && infoChar.ch <= cursorInf.ch)) {
					if (tags[i] == true) {
						iLevel++;
						if (iLevel == 1) {
							iCurrentSlide++; // we just got a first level <article>
						}
					} else {
						iLevel--;
					}
				} else {
					break;
				}
			}
			return iCurrentSlide;
		}

		// Find the slide with the number passed in parameter and give its position. A {from, to} object will be returned.
		function getSlideInfo(iSlide) {
			var szTag = "article";
			var tags = getTagIndexes(editor.getValue(), szTag, true);
			var iLevel = 0;
			var iCurrentSlide = -1;
			var result = {from: null, to:null};
			for (var i in tags) {
				if (tags[i] == true) {
					iLevel++;
					if (iLevel == 1) {
						iCurrentSlide++; // we just got a first level <article>
						if(iCurrentSlide == iSlide) {
							result.from = editor.posFromIndex(parseInt(i));
						}
					}
				} else {
					iLevel--;
					if(iLevel == 0 && iCurrentSlide == iSlide) {

						var newVal = szTag.length + 3 + parseInt(i);
						result.to = editor.posFromIndex(newVal);
						break;
					}
				}
			}
			if(result.from == null || result.to == null) {
				return null;
			}
			return result;
		}

		//permit to add a style attribute with the value in parameter
		//It will replace the attribute in the right place if function finds the attribute
		function setStyleAttribute(attr, newValue) {
			cleanSelection();
			goSelectionTag(true);

			var vTagInfo = searchInformationOnTagSelection(null, attr);
			if(!vTagInfo){
				vTagInfo = getSelectionTag(true);
			}
			if(vTagInfo) {
				var vStyleInfo = getAttributeTag(vTagInfo.start, "style");
				if(vStyleInfo) {
					var szText = editor.getRange(vStyleInfo.from, vStyleInfo.to);
					if(szText && szText.length > 0) {
						var re1 = new RegExp('([;\'\"][ ]*'+ attr +'[ ]*:[ ]*)');
						var re2 = new RegExp(/(['"])/);
						var myMatch = re1.exec(szText);
						var replacedText;
						var vFrom = vStyleInfo.from;
						var vTo = {line: vFrom.line, ch: vFrom.ch + szText.length};
						if(myMatch) {
							var endText =  RegExp.rightContext;
							var pos1 = endText.indexOf(";", 1);
							if (pos1 != -1) {
								endText = endText.substr(pos1);
							} else {
								endText = endText.substr(endText.length - 1);
							}
							replacedText = RegExp.leftContext + RegExp.$1 + newValue + endText;
						} else {
							myMatch = re2.exec(szText);
							if(!myMatch) {
								return false;
							}
							replacedText = attr + ": "+ newValue + "; ";
							replacedText = RegExp.leftContext+ RegExp.$1 + replacedText + RegExp.rightContext;
						}
						editor.replaceRange(replacedText, vFrom, vTo);
						return true;
					}
				} else {
					var textInsert = " style='"+ attr + ": " + newValue +";'";
					var szTextTag = editor.getRange(vTagInfo.start.from, vTagInfo.start.to);
					var iPos2 = szTextTag.lastIndexOf("/>");
					var iDecal = (iPos2 == -1) ? 1 : 2;
					editor.replaceRange(textInsert, {line: vTagInfo.start.to.line, ch: vTagInfo.start.to.ch - iDecal});//We don't take the last
					return true;
				}
			}
			return false;
		}

		//can search tag name or a attribute of style attribute in all framing tags
		function searchInformationOnTagSelection(tagName, styleAttr) {
			cleanSelection();
			minimizeSelection();

			var vTagInfo = getSelectionTag(true);
			while(vTagInfo != null) {
				if(tagName && vTagInfo.name == tagName) {
					return vTagInfo;
				}
				if(styleAttr) {
					var vStyleInfo = getAttributeTag(vTagInfo.start, "style");
					if(vStyleInfo) {
						var szText = editor.getRange(vStyleInfo.from, vStyleInfo.to);
						if(szText && szText.length > 0) {
							var re1 = new RegExp('([;\'\"][ ]*'+ styleAttr +'[ ]*:[ ]*)');
							var myMatch = re1.exec(szText);
							if(myMatch) {
								return vTagInfo;
							}
						}
					}
				}
				editor.setSelection(vTagInfo.start.from, vTagInfo.end.to);
				vTagInfo = getSelectionTag(true);
			}

			minimizeSelection();

			return null;
		}

		// if the cursor is in the start or end tag (depends on bStart) called szTag, we give the tag position.
		// A {from, to} object will be returned.
		function cursorInTagInfo(szTag, bWithAttr, bStart) {
			var tag;
			if(bStart) {
				tag = bWithAttr ? '<' + szTag : '<' + szTag + '>';
			} else {
				tag = '</' + szTag + '>';
			}
			if(editor.somethingSelected()) {
				var selText = editor.getSelection();
				var pos3 = selText.lastIndexOf("<");
				if(pos3 != -1 && pos3 != 0) {
					return null;
				}
				var pos4 = selText.indexOf(">");
				if(pos4 != -1 && pos4 != selText.length -1) {
					return null;
				}
			}
			var startPos = editor.getCursor(true);
			var szLineStText = editor.getLine(startPos.line);
			var posDelete = szLineStText.indexOf(">");
			var lastPos = 0;
			while(posDelete != -1 && posDelete < startPos.ch) {
				lastPos = posDelete + 1;
				posDelete = szLineStText.indexOf(">", posDelete + 1);
			}
			var pos1 = szLineStText.indexOf(tag, lastPos);
			if(pos1 == -1 || pos1 > startPos.ch || (!editor.somethingSelected() && pos1 == startPos.ch)) {
				return null;
			}
			var pos2 = szLineStText.indexOf(">", lastPos);
			if(pos2 == -1 || pos2 < startPos.ch) {
				return null;
			}
			return {from:{line: startPos.line, ch: pos1}, to:{line: startPos.line, ch: pos2+1}};
		}

		// In parameter with give the name and the position of the start tag ( a {from, to} object )
		// and we will obtain the end tag position. A {from, to} object will be returned.
		// Information, for optimization search is only do in slide of the tag.
		function getInfoEndTag(szTag, object) {
			var szText = editor.getValue();
			var pos1 = editor.indexFromPos(object.from);
			var endArticle = "</article>";
			var pos2 = szText.indexOf(endArticle, pos1);
			if(pos2 == -1) {
				return null;
			}
			pos2 = pos2 + endArticle.length;
			szText = szText.substr(pos1, pos2-pos1);
			var tags = getTagIndexes(szText, szTag, true);
			var iLevel = 0;
			var result = {from: null, to:null};
			for (var i in tags) {
				if (tags[i] == true) {
					iLevel++;
				} else {
					iLevel--;
					if(iLevel == 0) {
						var newVal = pos1 + parseInt(i);
						result.from = editor.posFromIndex(newVal);
						newVal = szTag.length + 3 + newVal;
						result.to = editor.posFromIndex(newVal);
						return result;
					}
				}
			}
			return null;
		}

		// get some information of the outside or inside tag of the selection (depends on bOutside)
		function getSelectionTag(bOutside) {
			var startPos = editor.getCursor(true);
			var szLineStText = editor.getLine(startPos.line);
			var iDecal = 0;
			if(bOutside) {
				szLineStText = szLineStText.substr(0, startPos.ch);
			} else {
				szLineStText = szLineStText.substr(startPos.ch);
				iDecal = startPos.ch;
			}
			var re = new RegExp(/<([a-z0-9]+)([^>]*)>/gi);

			var arrMatch;
			var szNameTag;
			var szTag;
			var vFrom = null, vTo = null;
			while (arrMatch = re.exec(szLineStText)){
				szNameTag = RegExp.$1;
				szTag = "<" + szNameTag + RegExp.$2 + ">";
				vFrom = {line: startPos.line, ch: arrMatch.index + iDecal};
				vTo = {line: startPos.line, ch: iDecal+ arrMatch.index + szTag.length};
				if(!bOutside) {
					break;
				}
			}
			if(!vFrom || !vTo) {
				return null;
			}
			if(bOutside) {
				if(vTo.ch != startPos.ch) {
					return null;
				}
			} else {
				if(vFrom.ch != (startPos.ch)) {
					return null;
				}
			}
			var vStartTag = {from: vFrom, to: vTo};
			var vEndTag = getInfoEndTag(szNameTag, vStartTag);
			if(vEndTag) {
				return {name: szNameTag, start: vStartTag, end: vEndTag};
			}

			return null;
		}

		// Allow to go outside or inside the tag of the selection (depends on bOutside)
		function goSelectionTag(bOutside) {
			var vTagInfo = getSelectionTag(bOutside);
			if(vTagInfo) {
				if (bOutside) {
					editor.setSelection(vTagInfo.start.from, vTagInfo.end.to);
				} else {
					editor.setSelection(vTagInfo.start.to, vTagInfo.end.from);
				}
				return true;
			}
			return false;
		}

		//We are sure that we can't have infinite loop
		function minimizeSelection() {
			var vSel = editor.getSelection();
			var vTemp;
			while(goSelectionTag(false)) {
				vTemp = editor.getSelection();
				if(vSel == vTemp) {
					break;
				}
				vSel = vTemp;
			}
		}

		// Allow to clean the selection when it begins or finishes in a tag
		function cleanSelection() {
			if(!editor.somethingSelected()) {
				var startTag = cursorInTagInfo("", true, true);
				if(startTag) {
					editor.setSelection(startTag.to, startTag.to);
				}
				var endTag = cursorInTagInfo("", true, false);
				if(endTag) {
					editor.setSelection(endTag.to, endTag.to);
				}
				return;
			}
			var selText = editor.getSelection();
			var posStartCursor = editor.getCursor(true);
			var posEndCursor = editor.getCursor(false);
			var newVal;

			//when it begins in a tag
			var pos1 = selText.indexOf("<");
			var pos2 = selText.indexOf(">");
			if (pos2 != -1) {
				if(pos1 == -1 || pos2 < pos1) {
					newVal = 1 + parseInt(pos2) + editor.indexFromPos(posStartCursor);
					editor.setSelection(editor.posFromIndex(newVal), posEndCursor);
					posStartCursor = editor.getCursor(true);
					selText = editor.getSelection();
				}
			}
			//when it finishes in a tag
			var pos3 = selText.lastIndexOf("<");
			var pos4 = selText.lastIndexOf(">");
			if (pos3 != -1) {
				if(pos4 == -1 || pos4 < pos3) {
					newVal = parseInt(pos3) + editor.indexFromPos(posStartCursor);
					editor.setSelection(posStartCursor, editor.posFromIndex(newVal));
					posEndCursor = editor.getCursor(false);
					selText = editor.getSelection();
				}
			}

			var re = new RegExp(/<([a-z0-9]+)([ \/>])/);

			if(re.test(selText)) {
				var myMatch = re.exec(selText);
				var szTag = RegExp.$1;
				if(szTag != "br") {
					var tags = getTagIndexes(selText, szTag, true);
					var iLevel = 0;

					for (var i in tags) {
						if (tags[i] == true) {
							iLevel++;
						} else {
							iLevel--;
						}
					}
					if(iLevel > 0) {
						var pos5 = selText.indexOf(">");
						if (pos5 != -1) {
							if(pos5 > myMatch.index) {
								newVal = 1 + parseInt(pos5) + editor.indexFromPos(posStartCursor);
								editor.setSelection(editor.posFromIndex(newVal), posEndCursor);
							}
						}
					}
				}
			}
			var startTag = cursorInTagInfo("", true, true);
			if(startTag && posStartCursor.ch < startTag.to.ch) {
				editor.setSelection(startTag.to, startTag.to);
			}
			var endTag = cursorInTagInfo("", true, false);
			if(endTag) {
				editor.setSelection(endTag.to, endTag.to);
			}
		}

		// Try to find the passed attribute in the range of {from, to} object. A {from, to} object will be returned.
		function getAttributeTag(object, attr) {
			var szText = editor.getRange(object.from, object.to);
			if(szText && szText.length > 0) {
				if(szText.lastIndexOf('<') == 0 && szText.indexOf('>') == szText.length - 1) {
					var re = new RegExp('('+attr+'[ ]*=[ ]*)([\'\"])');
					var myMatch = re.exec(szText);
					if(myMatch) {
						var vQuote = RegExp.$2;
						var posNextEquals = szText.indexOf('=', myMatch.index + RegExp.$1.length);
						if(posNextEquals != -1 ) {
							szText = szText.substr(myMatch.index, posNextEquals-myMatch.index);
						} else {
							szText = szText.substr(myMatch.index);
						}
						var posLastQuote = szText.lastIndexOf(vQuote);
						if(posLastQuote == -1) {
							return null;
						}
						szText = szText.substr(0, posLastQuote + 1);
						var vFrom = {line: object.from.line, ch: object.from.ch+RegExp.leftContext.length};
						var vTo = {line: vFrom.line, ch: vFrom.ch + szText.length};
						return {from: vFrom, to: vTo};
					}
				}
			}
			return null;
		}

		$("#toolbar *[data-tool]").click(function() {
			if ($(this).hasClass('disabled')) {
				return;
			}

			var tool = $(this).data("tool");
			var newSelection = editor.getSelection();
			var endTagLength = null;
			var bGoInto = false;
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
				cleanSelection();

				if (editor.somethingSelected()) {
					text = editor.getSelection();
				}
				else {
					text = prompt("Enter the text of the link");
				}

				if (!text) text = href;

				newSelection = '<a href="' + href + '">' + text + '</a>';
				endTagLength = 0;
			}else if(tool == "add"){
				var slide = getSlideInfo(selectedSlide);
				var template = $(this).data('template') || 't1';
				var szWrap = "\n\n";//only \n characters in this string
				if(!slide) {
					slide = {from:{line: 0,ch: 0}, to:{line: 0,ch: 0}};
					szWrap = "";
				}
				editor.replaceRange(szWrap + slideTemplate[template].code,  {line: slide.to.line, ch: slide.to.ch}, {line: slide.to.line, ch: slide.to.ch});
				editor.focus();
				editor.setCursor({line:slide.to.line+2+szWrap.length, ch: 2});
				return;
			}else if(tool == "delete"){
				if(confirm("Are you sure you want to delete the current slide?"))
				{
					var previousSlide = getSlideInfo(selectedSlide - 1);
					var currentSlide = getSlideInfo(selectedSlide);
					var nextSlide = getSlideInfo(selectedSlide + 1);
					if(currentSlide) {
						var vFrom = previousSlide ? previousSlide.to : currentSlide.from;
						var vTo = nextSlide ? nextSlide.from : currentSlide.to;
						var szWrap = (previousSlide && nextSlide) ? "\n\n" : "";
						editor.replaceRange(szWrap, vFrom, vTo);
					}
				}
				return;
			}else if(tool == "font"){
				if(currentFont != null){
					var bAddFont= setStyleAttribute("font-family", currentFont);
					if(!bAddFont) {
						newSelection = "<span style='font-family:"+currentFont+";'>"+editor.getSelection()+"</span>";
						editor.replaceSelection(newSelection);
					}
					editor.focus();
				}
				return;
			}
			else if(tool == "slideSelector"){
				var slide = prompt("Go to slide number:");
				if(slide > 0) {
					selectedSlide = slide >= totalSlides ? totalSlides : slide;
					selectedSlide--;
					previewFrame.contentWindow.gotoSlide(selectedSlide);
				}
				return;
			}
			else if(tool == "iframe"){
				var src = prompt("Enter the URL of iframe content");
				cleanSelection();
				if (src) {
					newSelection = '<iframe src="' + src + '"></iframe>';
					var curs = editor.getCursor(newSelection);
					editor.replaceSelection(newSelection);
					editor.focus();
					editor.setCursor({line:curs.line, ch: curs.ch + 13});
				}
				return;
			}
			else if(tool == "theme") {
				currentTheme = $(this).data('theme');
				updatePreview();
				isFileModified = true;
				return;

			} else if (tool == "save" || tool == "clone" || tool == "download") {
				var id = slideshowID;
				if (tool == "clone") {
					// force a new ID if we clone the slideshow
					id = null;
				}
				else if (!isFileModified) {
					if (tool == "download") {
						window.location.href = '/' + slideshowID + '/' + slideshowVersion + '/slideshow.zip';
					}
					return; // don't save if there are no modifications
				}

				var options = {theme: currentTheme};

				now.save(id, editor.getValue(), options, function(id, version) {
					slideshowID = id;
					slideshowVersion = version;
					history.replaceState({}, '', '/' + slideshowID + '/' + slideshowVersion + window.location.hash);
					updateShowFullscreenLink();
					updatePreview();

					if (tool == 'download') {
						window.location.href = '/' + slideshowID + '/' + slideshowVersion + '/slideshow.zip';
					}

					isFileModified = false;
				});
				return;
			} else if(tool == "prev") {
				if(selectedSlide > 0){
					previewFrame.contentWindow.prevSlide();
				}
				return;
			}
			else if(tool == "next") {
				if(selectedSlide < totalSlides-1){
					previewFrame.contentWindow.nextSlide();
				}
				return;
			}
			else {
				var vTagInfo = searchInformationOnTagSelection(tool);
				if(vTagInfo) {
					newSelection = editor.getSelection();
					editor.setSelection(vTagInfo.start.from, vTagInfo.end.to);
				} else {
					newSelection = "<"+tool+">"+editor.getSelection()+"</"+tool+">";
					endTagLength = tool.length+3;
				}
				bGoInto = true;
			}
			editor.replaceSelection(newSelection);
			if(bGoInto) {
				minimizeSelection();
			}

			editor.focus();
		});

		var currentColor = '000000';
		function changeSelectionColor(color) {
			var bAddColor = setStyleAttribute("color", "#"+color);
			if(!bAddColor) {
				var newSelection = "<span style='color:#"+color+";'>"+editor.getSelection()+"</span>";
				editor.replaceSelection(newSelection);
			}
			$('#colorindicator').css({'background-color': '#' + color});
			currentColor = color;
		}

		$('#colorpickertool > .dropdown-toggle').ColorPicker({
			color: '#' + currentColor,
			onChange: function (hsb, hex, rgb) {
				changeSelectionColor(hex);
			}
		});

		$('#colorpickertool > button:first').click(function() {
			changeSelectionColor(currentColor);
		});
		
		function updatePreview() {
			now.transform(editor.getValue(), currentTheme, false, function(previewHTML) {
				var content = previewFrame.contentDocument || previewFrame.contentWindow.document;

				// putting HTML into iframe
				content.open();

				if (previewHTML == null) {
					content.write('<span style="color:red; font-family: sans-serif">Error while parsing input</span>');
				}
				else{
					// we need to inject some JS before putting it into the iframe to make the slideshow start at the slide we're currently editing
					// and to make it so that when we navigate slides in the iframe, the browser's location hash changes too
					var js = '<script> \
					    curSlide = ' + selectedSlide + '; \
					    var oldUpdateHash = updateHash; \
					    updateHash = function() { oldUpdateHash(); window.top.location.hash = "slide" + (curSlide + 1); } \
					    </script>';

					if ($.browser.mozilla) {
						// updateHash is broken in firefox when put in an iframe with no src
						js = js.replace('oldUpdateHash();', '');
					}

					previewHTML = previewHTML.replace('</head>', js + '</head>');
					previewHTML = previewHTML.replace('<script src="/nowjs/now.js"></script>', '');

					$(document).bind('initNow', function(e, param1) {
						param1(now);
					});

					content.write(previewHTML);
					//previewFrame.contentWindow.setNowJs(now);
				}
				content.close();
			});
		}

		function autoEncodePre(cm, ch){
			var pos = cm.getCursor();
			var tok = cm.getTokenAt(pos);
			var state = tok.state;

			var type = state.htmlState ? state.htmlState.type : state.type;

			if (state.htmlState.context && state.htmlState.context.tagName == 'pre') {
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
		updatePreview();
	}
	$(document).ready(function(){
		now.ready(function() {
			init();
		});
	});
}());
