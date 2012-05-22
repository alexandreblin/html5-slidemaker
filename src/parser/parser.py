#!/usr/bin/env python
# -*- coding: utf-8 -*-

import lxml.html as html
import argparse
import os
import sys
import array

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', nargs='?', default=None)
    parser.add_argument('--title', '-t', help="the slideshow's title", default="Presentation")

    args = parser.parse_args()
	
    if not args.input:
		str = sys.stdin.read()
		if len(str.strip()) == 0:
		    sys.exit(0)
		if str.startswith("\""):
			a1 = array.array("c", str)
			a1[0] = " "
			a1[str.rindex("\"")] = " "
			str = a1.tostring()
			
		doc = html.document_fromstring(str.decode('utf8'))
    else:
        doc = html.document_fromstring(open(args.input, 'r').read().decode('utf8'))
    
    templateName = 'html5slides'
    
    mainTemplate = open(os.path.join(os.path.dirname(__file__), 'templates', templateName, 'main.html')).read()
    
    mainTemplate = mainTemplate.replace('<!-- {{TITLE}} -->', args.title)
    
    allSlides = ''
    
    for slide in doc.xpath('/html/body/article'):
        allSlides += html.tostring(slide)
    
    print mainTemplate.replace('<!-- {{SLIDES}} -->', allSlides)
    