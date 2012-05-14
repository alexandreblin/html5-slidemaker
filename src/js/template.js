/**
 * Created by JetBrains WebStorm.
 * User: таня
 * Date: 10.05.12
 * Time: 12:19
 * To change this template use File | Settings | File Templates.
 */
var slideTemplate = {
    't1': {
        title:"Empty slide",
        code:"\n\n<article>\n\t<p>\n\t\t\n\t</p>\n</article>"
    },
    't2':{
        title:"Title and subtitle",
        code:"\n\n<article>\n\t<h1>\n\t\t\n\t</h1>\n\t<p>\n\t\t\n\t</p>\n</article>"
    },
    't3':{
        title:"Header and Text",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t\n\t</p>\n</article>"
    },
    't4':{
        title:"Static list",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t</ul>\n</article>"
    },
    't5':{
        title:"Building list",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul class=\"build\">\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t\t<li>\n\t\t\t\n\t\t</li>\n\t</ul>\n</article>"
    },
    't6':{
        title:"Table",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<table>\n\t\t<tr>\n\t\t\t<th>\n\t\t\t\t\n\t\t\t</th>\n\t\t\t<th>\n\t\t\t\t\n\t\t\t</th>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t\t<td>\n\t\t\t\t\n\t\t\t</td>\n\t\t</tr>\n\t</table>\n</article>"
    },
    't7':{
        title:"Segue slide",
        code:"\n\n<article>\n\t<h2>\n\t\t\n\t</h2>\n</article>"
    },
    't8':{
        title:"Image centered",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img class='centered' style='height: 500px' src=''>\n\t</p>\n</article>"
    },
    't9':{
        title:"Image and text",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img class='floatLeft'  style='height: 100px' src=''>\n\t</p>\n\t<p>\n\t\t\n\t</p>\n</article>"
    },
    't10':{
        title:"Image filling the slide",
        code:"\n\n<article class='fill'>\n\t<h3>\n\t\t\n\t</h3>\n\t<p>\n\t\t<img src='images/flower.jpg'>\n\t</p>\n</article>"
    },
    't11':{
        title:"Code",
        code:"\n\n<article class='smaller'>\n\t<h3>\n\t\t\n\t</h3>\n\t<section class='scroll'>\n\t\t<pre  class='noMargin'>\n\t\t\t\n\t\t</pre>\n\t</section>\n</article>"
    },
    't12':{
        title:"Citation",
        code:"\n\n<article>\n\t<q>\n\t\t\n\t</q>\n\t<div class='author'>\n\t\t\n\t</div>\n</article>"
    },
    't13':{
        title:"Embed",
        code:"\n\n<article class='nobackground'>\n\t<h3>\n\t\t\n\t</h3>\n\t<iframe src=''></iframe>\n</article>"
    },
    't14':{
        title:"Link list",
        code:"\n\n<article>\n\t<h3>\n\t\t\n\t</h3>\n\t<ul>\n\t\t<li>\n\t\t\t<a href=''></a>\n\t\t</li>\n\t\t<li>\n\t\t\t<a href=''></a>\n\t\t</li>\n\t</ul>\n</article>"
    }
};

