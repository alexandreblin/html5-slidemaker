var fontList = {
    'Arial':'Arial',
    'Arial Black':'Arial Black',
    'Book Antiqua' : 'Book Antiqua',
    'Comic Sans MS' : 'Comic Sans MS',
    'Courier New' :  'Courier New',
    'Georgia' : 'Georgia',
    'Helvetica':'Helvetica',
    'Impact':'Impact',
    'Tahoma':'Tahoma',
    'Times New Roman':'Times New Roman',
    'Trebuchet MS':'Trebuchet MS',
    'Verdana': 'Verdana'
};

var slideTemplate = {
	't1': {
		title:"Empty slide",
		code:"<article>\n\t<p>\n\t\t\n\t</p>\n</article>"
	},
	't2':{
		title:"Title and subtitle",
		code:"<article>\n\t<h1>\n\t\t\n\t</h1>\n\t<p>\n\t\t\n\t</p>\n</article>"
	},
	't3':{
		title:"Header and Text",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t\n\t</p>\n</article>"
	},
	't4':{
		title:"Static list",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t</ul>\n</article>"
	},
	't5':{
		title:"Building list",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul class=\"build\">\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t</ul>\n</article>"
	},
	't6':{
		title:"Table",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<table>\n\t\t<tr>\n\t\t\t<th>\n\t\t\t\t\n\t\t\t</th>\n\t\t\t<th>\n\t\t\t\t\n\t\t\t</th>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t</tr>\n\t</table>\n</article>"
	},
	't7':{
		title:"Segue slide",
		code:"<article>\n\t<h2>\n\t\t\n\t</h2>\n</article>"
	},
	't8':{
		title:"Image centered",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img class='centered' style='height: 500px' src=''>\n\t</p>\n</article>"
	},
	't9':{
		title:"Image and text",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img class='floatLeft'  style='height: 100px' src=''>\n\t</p>\n\t<p>\n\t\t\n\t</p>\n</article>"
	},
	't10':{
		title:"Image filling the slide",
		code:"\n\n<article class='fill'>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img src=''>\n\t</p>\n</article>"
	},
	't11':{
		title:"Code",
		code:"\n\n<article class='smaller'>\n\t<h3>\n\t\t\n\t</h3>\n\t<section class='scroll'>\n\t\t<pre  class='noMargin'>\n\t\t\t\n\t\t</pre>\n\t</section>\n</article>"
	},
	't12':{
		title:"Citation",
		code:"<article>\n\t<q>\n\t\t\n\t</q>\n\t<div class='author'>\n\t\t\n\t</div>\n</article>"
	},
	't13':{
		title:"Embed",
		code:"\n\n<article class='nobackground'>\n\t<h3>\n\t\t\n\t</h3>\n\t<iframe src=''></iframe>\n</article>"
	},
	't14':{
		title:"Link list",
		code:"<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul>\n\t\t<li>\n\t\t\t<a href=''></a>\n\t\t</li>\n\t\t<li>\n\t\t\t<a href=''></a>\n\t\t</li>\n\t</ul>\n</article>"
	}
};
