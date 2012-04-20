#!/usr/bin/env python

import lxml.html as html
import argparse
import os
import sys

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', nargs='?', default=None)
    parser.add_argument('--title', '-t', help="the slideshow's title", default="Presentation")

    args = parser.parse_args()
    
    if not args.input:
        doc = html.document_fromstring(sys.stdin.read())
    else:
        doc = html.parse(args.input)
    
    templateName = 'html5slides'
    
    mainTemplate = open(os.path.join(os.path.dirname(__file__), 'templates', templateName, 'main.html')).read()
    slideTemplate = open(os.path.join(os.path.dirname(__file__), 'templates', templateName, 'slide.html')).read()
    
    mainTemplate = mainTemplate.replace('<!-- {{TITLE}} -->', args.title)
    
    allSlides = ''
    
    for slide in doc.xpath('/html/body/article'):
        slideHTML = ''
        for element in slide.xpath('*'):
            slideHTML += html.tostring(element)
        
        allSlides += slideTemplate.replace('<!-- {{CONTENT}} -->', slideHTML)
    
    print mainTemplate.replace('<!-- {{SLIDES}} -->', allSlides)
    