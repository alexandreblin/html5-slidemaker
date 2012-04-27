$(document).ready(function(){

	$('button#transform').click(function() {
		var text = $('textarea#input').val().replace(/\n/g,"");
		
		now.transform(text,function(val) {
			var iframe = document.getElementById('output');
			iframe.contentWindow.document.open();
			iframe.contentWindow.document.write(val);
			iframe.contentWindow.document.close();
			//$('#output').append(val);
		});
		
	});
});