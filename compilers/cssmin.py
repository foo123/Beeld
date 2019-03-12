###
#!/usr/bin/env python
#
# CSSmin.py for Notepad++ Python Scripting plugin
# https://github.com/ethanpil/npp-cssmin
# This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
#
# Credits:
#  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
#
#  Modified standalone version for Python 2.x, 3.x
#  v. 1.0.0
#  @Nikos M.
#
###

#try:
#myList[index]
#except IndexError or NameError for single variable:
#...whatever...
#Gary Herron
#
#
# imports
import os, sys, re, math
try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0
# http://www.php2python.com/wiki/function.base64-encode/
try:
    import base64
    _hasBase64_ = 1
except ImportError:
    _hasBase64_ = 0

class CSSMin:
    
    VERSION = "1.0.0"


def map(f, a):
    return [f(x) for x in a]

def asstring(a):
    return [str(x) for x in a]
    
def compute_vendor_values():
    return re.compile(r'(^|\s|:|,)(\s*)(' + ('|').join( map( re.escape, list( CSSMin.Config['Vendor']['values'].keys() ) ) ) + ')($|;|\s|,)', re.M|re.I|re.S)
def compute_vendor_explicits():
    return re.compile(r'(^|;|\{)(\s*)((' + ('|').join( map( re.escape, list( CSSMin.Config['Vendor']['explicit'].keys() ) ) ) + ')\s*:([^;\}]*))($|;|\})', re.M|re.I|re.S)
def compute_vendor_properties():
    return re.compile(r'(^|;|\{)(\s*)((' + ('|').join( map( re.escape, list( CSSMin.Config['Vendor']['properties'].keys() ) ) ) + ')\s*:([^;\}]*))($|;|\})', re.M|re.I|re.S)
def compute_vendor_atrules():
    return re.compile(r'(^|;|\{|\})(\s*)(@(' + ('|').join( map( re.escape, list( CSSMin.Config['Vendor']['atrules'].keys() ) ) ) + ')\s+([0-9a-zA-Z_\-]+)\s*\{)', re.M|re.I|re.S)

#
# CSSMin configurations
WEBKIT = 1
MOZ = 2
MS = 4
O = 8
Config = {
    
    #
    # Regexes for parsing
    'Regex': {
        
        'compute_vendor_values' : compute_vendor_values,
        'compute_vendor_explicits' : compute_vendor_explicits,
        'compute_vendor_properties' : compute_vendor_properties,
        'compute_vendor_atrules' : compute_vendor_atrules,

        'trimSpaceCommaRE' : re.compile(r'^[\s,]+'),
        'hsla' : re.compile(r'\b(hsla?)\s*\(([^\(\)]+)\)', re.M|re.I|re.S),
        'rgba' :  re.compile(r'\b(rgba?)\s*\(([^\(\)]+)\)', re.M|re.I|re.S),
        'pseudoclasscolon' :  re.compile(r"(^|\})(([^\{\:])+\:)+([^\{]*\{)"),
        'whitespace_start' :  re.compile(r"\s+([!{};:>+\(\)\],])"),
        '_and' :  re.compile(r"\band\(", re.I),
        'whitespace_end' :  re.compile(r"([!{}:;>+\(\[,])\s+"),
        'space' :  re.compile(r"\s+"),
        'semi' :  re.compile(r";+\}"),
        'semicolons' :  re.compile(r";;+"),
        'empty' :  re.compile(r"[^\}\{]+\{\}"),
        #  ms,s (durations) seem to cause animation issues
        'zero_units' :  re.compile(r"([\s:,\(])(0)0*(rad|grad|deg|turn|vh|vw|vmin|vmax|px|rem|em|%|in|cm|mm|pc|pt|ex)", re.I),
        'floating_points' :  re.compile(r"(:|\s|,|\()0+\.(\d+)"),
        'hex_color' : re.compile(r"([^\"'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])"),
        'url' :  re.compile(r'\burl\b\s*\(([^\)]+?)\)', re.I),
        'charset' :  re.compile(r'@charset [^;]+($|;)', re.M|re.I)
    },

    #
    # Vendor prefixes and polyfills configurations
    'Vendor' : {

        'WEBKIT' : WEBKIT, 'MOZ' : MOZ, 'MS' : MS, 'O' : O,
        
        'prefixes' : [ [WEBKIT, '-webkit-'], [MOZ, '-moz-'], [MS, '-ms-'], [O, '-o-'] ],
        
        'Regex' :  { 
            'polyfills': {
                'gradient': re.compile(r'(^|\s+|;)(background-image|background)\b\s*:\s*(linear-gradient)\b([^;\}]*)(;|\})', re.M|re.I|re.S)
            },
            'values': None, 
            'explicit': None, 
            'properties': None, 
            'atrules': None 
        },
        
        'polyfills' : {
            'linear-gradient' : [
                [
                    # Old browsers
                    '__PROPSPECIAL__:__COLORFIRST__;'
                ],
                [
                    # Chrome,Safari4+
                    '__PROP__:-webkit-gradient(linear, __DIR2__ __COLORSTOPS2__);',
                    # Chrome10+,Safari5.1+
                    '__PROP__:-webkit-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    # FF3.6+
                    '__PROP__:-moz-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    # IE10+
                    '__PROP__:-ms-linear-gradient(__DIR1__  __COLORSTOPS__);',
                ],
                [
                    # Opera 11.10+
                    '__PROP__:-o-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    # W3C
                    '__PROP__:linear-gradient(__DIR__  __COLORSTOPS__);'
                ]
            ]
        },
        
        'explicit': {
            'border-top-left-radius' : ['-webkit-border-top-left-radius', '-moz-border-radius-topleft']
            ,'border-bottom-left-radius' : ['-webkit-border-bottom-left-radius', '-moz-border-radius-bottomleft']
            ,'border-bottom-right-radius' : ['-webkit-border-bottom-right-radius', '-moz-border-radius-bottomright']
            ,'border-top-right-radius' : ['-webkit-border-top-right-radius', '-moz-border-radius-topright']
            ,'align-items' : ['-webkit-box-align', '-moz-box-align', '-ms-flex-align', '-webkit-align-items']
            ,'justify-content' : ['-webkit-box-pack', '-moz-box-pack', '-ms-flex-pack', '-webkit-justify-content']
        },
            
        'values': {
            'border-radius' : WEBKIT | MOZ | MS | O
            ,'box-shadow' : WEBKIT | MOZ | MS | O
            ,'transform' : WEBKIT | MOZ | MS | O
            ,'transform-function' : WEBKIT | MOZ | MS | O
            ,'transform-origin' : WEBKIT | MOZ | MS | O
            ,'transform-style' : WEBKIT | MOZ | MS | O
        },
        
        'properties': {
            'animation' : WEBKIT | MOZ | MS | O
            ,'animation-delay' : WEBKIT | MOZ | MS | O
            ,'animation-direction' : WEBKIT | MOZ | MS | O
            ,'animation-duration' : WEBKIT | MOZ | MS | O
            ,'animation-iteration-count' : WEBKIT | MOZ | MS | O
            ,'animation-name' : WEBKIT | MOZ | MS | O
            ,'animation-play-state' : WEBKIT | MOZ | MS | O
            ,'animation-timing-function' : WEBKIT | MOZ | MS | O
            ,'animation-fill-mode' : WEBKIT | MOZ | MS | O
            ,'backface-visibility' : WEBKIT | MOZ | MS | O
            ,'border-radius' : WEBKIT | MOZ | MS | O
            ,'box-shadow' : WEBKIT | MOZ | MS | O
            ,'box-sizing' : WEBKIT | MOZ | MS | O
            ,'columns' : WEBKIT | MOZ
            ,'column-rule' : WEBKIT | MOZ
            ,'column-rule-width' : WEBKIT | MOZ
            ,'column-rule-style' : WEBKIT | MOZ
            ,'column-rule-color' : WEBKIT | MOZ
            ,'column-count' : WEBKIT | MOZ
            ,'column-span' : WEBKIT
            ,'column-width' : WEBKIT | MOZ
            ,'column-gap' : WEBKIT | MOZ
            ,'column-fill' : WEBKIT | MOZ
            ,'column-break-inside' : WEBKIT | MOZ
            ,'perspective' : WEBKIT | MOZ | MS | O
            ,'perspective-origin' : WEBKIT | MOZ | MS | O
            ,'transform' : WEBKIT | MOZ | MS | O
            ,'transform-function' : WEBKIT | MOZ | MS | O
            ,'transform-origin' : WEBKIT | MOZ | MS | O
            ,'transform-style' : WEBKIT | MOZ | MS | O
            ,'transition' : WEBKIT | MOZ | MS | O
            ,'transition-delay' : WEBKIT | MOZ | MS | O
            ,'transition-duration' : WEBKIT | MOZ | MS | O
            ,'transition-property' : WEBKIT | MOZ | MS | O
            ,'transition-timing-function' : WEBKIT | MOZ | MS | O
        },

        'atrules': {
            'keyframes' : WEBKIT | MOZ | MS | O
        }
    }
}    

CSSMin.Config = Config
Config['Vendor']['Regex']['values'] = compute_vendor_values()
Config['Vendor']['Regex']['explicit'] = compute_vendor_explicits()
Config['Vendor']['Regex']['properties'] = compute_vendor_properties()
Config['Vendor']['Regex']['atrules'] = compute_vendor_atrules()


#
# utils    
def clamp(v, m, M):
    return max(min(v, M), m)


def trim(s=""):
    return s.strip()
    

def str_replace(r1, r2, s=None):
    if s is None:
        for k in r1:
            #r2 = r2.replace(k, r1[k])
            r2 = str( r1[k] ).join( r2.split( str( k ) ) )
        return r2
    else:
        #return s.replace(r1, r2)
        return str( r2 ).join( s.split( str( r1 ) ) )
    return r1

    
def base64_encode(filename):
    s = ''
    #Python 3.x:
    #if _hasBase64_: return base64.b64encode(str(s, self.enc))
    #if _hasBase64_: return base64.encodestring(s)
    if _hasBase64_: 
        with open(filename, "rb") as f:
            s = base64.b64encode(f.read())
    #Python 2.x:
    #else: return str(s, self.enc).encode('base64')
    else: 
        with open(filename, "rb") as f:
            s = f.read().encode('base64')
    return s

def openFile(file, op, enc=None):
    if enc: f = open(file, op, encoding=enc)
    else: f = open(file, op)
    return f

def readFile(file, enc=None):
    buffer = ''
    maxSize = 10000000
    with openFile(file, "r", enc) as f:
        buffer = f.read()
    return buffer

def writeFile(file, text, enc=None):
    with openFile(file, "w", enc) as f:
        f.write(text)

def joinPath(*args): 
    argslen = len(args)
    DS = os.sep
    
    if 0==argslen: return "."
    
    path = DS.join(args)
    plen = len(path)
    
    if 0==plen: return "."
    
    isAbsolute    = path[0]
    trailingSlash = path[plen - 1]

    # http://stackoverflow.com/questions/3845423/remove-empty-strings-from-a-list-of-strings
    peices = [x for x in re.split(r'[\/\\]', path) if x]
    
    new_path = []
    up = 0
    i = len(peices)-1
    while i>=0:
        last = peices[i]
        if last == "..":
            up = up+1
        elif last != ".":
            if up>0:  up = up-1
            else:  new_path.append(peices[i])
        i = i-1
    
    path = DS.join(new_path[::-1])
    plen = len(path)
    
    if 0==plen and 0==len(isAbsolute):
        path = "."

    if 0!=plen and trailingSlash == DS:
        path += DS

    if isAbsolute == DS:
        return DS + path
    else:
        return path

FILERE = re.compile(r'^[a-z0-9_]')
def isRelativePath(file):
    if file.startswith('http://') or file.startswith('https://') or file.startswith('/') or file.startswith('\\'):
        return False
    elif file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\') or re.search(FILERE, file[0]):
        return True
        
    # unknown
    return False

class String:
    pass

    
CSSMin.String = String
    
C2P = 100/255
P2C = 2.55

def col2per(c, suffix=None):
    global C2P
    if suffix:
        return str(c*C2P)+str(suffix)
    else:
        return c*C2P
        
def per2col(c):
    global P2C
    return c*P2C

# color format conversions
def rgb2hex(r, g, b, asPercent=False):
    global P2C
    if asPercent:
        r = clamp(round(r*P2C), 0, 255)
        g = clamp(round(g*P2C), 0, 255)
        b = clamp(round(b*P2C), 0, 255)
    
    #r = "%0.2X" % r
    #g = "%0.2X" % g
    #b = "%0.2X" % b
    #hex = '#' + r + g + b
    hex = '#%0.2X%0.2X%0.2X' % (r, g, b)
    
    return hex

def rgb2hexIE(r, g, b, a, asPercent=False):
    global P2C
    if asPercent:
        r = clamp(round(r*P2C), 0, 255)
        g = clamp(round(g*P2C), 0, 255)
        b = clamp(round(b*P2C), 0, 255)
        a = clamp(round(a*P2C), 0, 255)
    
    #r = "%0.2X" % r
    #g = "%0.2X" % g
    #b = "%0.2X" % b
    #a = "%0.2X" % a
    #hex = '#' + a + r + g + b
    hex = '#%0.2X%0.2X%0.2X%0.2X' % (a, r, g, b)
    
    return hex

def hex2rgb(hex):
    
    if not hex or 3 > len(hex):
        return list([0, 0, 0])
    
    if 6 > len(hex):
        return [
            clamp( int(hex[0]+hex[0], 16), 0, 255 ), 
            clamp( int(hex[1]+hex[1], 16), 0, 255 ), 
            clamp( int(hex[2]+hex[2], 16), 0, 255 )
        ]
    
    else:
        return [
            clamp( int(hex[0]+hex[1], 16), 0, 255 ), 
            clamp( int(hex[2]+hex[3], 16), 0, 255 ), 
            clamp( int(hex[4]+hex[5], 16), 0, 255 )
        ]
    
    #if asPercent:
    #    rgb = [
    #        str(rgb[0]*per)+'%', 
    #        str(rgb[1]*per)+'%', 
    #        str(rgb[2]*per)+'%'
    #    ]
    #else:
    #    rgb = [
    #        str(rgb[0]), 
    #        str(rgb[1]), 
    #        str(rgb[2])
    #    ]


def hue2rgb(p, q, t):
    if t < 0: t += 1
    if t > 1: t -= 1
    if t < 1/6: return p + (q - p) * 6 * t
    if t < 1/2: return q
    if t < 2/3: return p + (q - p) * (2/3 - t) * 6
    return p

def hsl2rgb(h, s, l):
    # convert to [0, 1] range
    h = ((h + 360)%360)/360
    s *= 0.01
    l *= 0.01
    
    if 0 == s:
        # achromatic
        r = 1
        g = 1
        b = 1
    else:

        if l < 0.5:
            q = l * (1 + s)
        else:
            q = l + s - l * s
        p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1/3)

    return [
        clamp( round(r * 255), 0, 255 ), 
        clamp( round(g * 255), 0, 255 ),  
        clamp( round(b * 255), 0, 255 )
    ]

def rgb2hsl(r, g, b, asPercent=False):
    fact = 1/255
    
    if asPercent:
        r *= 0.01
        g *= 0.01
        b *= 0.01
    else:
        r *= fact
        g *= fact
        b *= fact
        
    M = max(r, g, b)
    m = min(r, g, b)
    l = 0.5*(M + m)

    if M == m:
        h = s = 0 # achromatic
    else:
        d = M - m
        if l > 0.5:
            s = d / (2 - max - min)
        else:
            s = d / (max + min)
        
        if M == r:
            ff = 0
            if g < b: ff = 6
            h = (g - b) / d + ff
        
        elif M == g:
            h = (b - r) / d + 2
        
        else:
            h = (r - g) / d + 4
        
        h /= 6
    
    return [
        round( h*360 ) % 360, 
        clamp(s*100, 0, 100), 
        clamp(l*100, 0, 100)
    ]


class Color:
    """CSS Color Class and utils"""
    
    # static
    clamp = clamp
    col2per = col2per
    per2col = per2col
    rgb2hex = rgb2hex
    hex2rgb = hex2rgb
    hsl2rgb = hsl2rgb
    rgb2hsl = rgb2hsl
    
    Keywords = {
        # extended
        'transparent'          : [  0,0,0        ,0]
        ,'aliceblue'           : [  240,248,255  ,1]
        ,'antiquewhite'        : [  250,235,215  ,1]
        ,'aqua'                : [  0,255,255    ,1]
        ,'aquamarine'          : [  127,255,212  ,1]
        ,'azure'               : [  240,255,255  ,1]
        ,'beige'               : [  245,245,220  ,1]
        ,'bisque'              : [  255,228,196  ,1]
        ,'black'               : [  0,0,0    ,    1]
        ,'blanchedalmond'      : [  255,235,205  ,1]
        ,'blue'                : [  0,0,255  ,    1]
        ,'blueviolet'          : [  138,43,226   ,1]
        ,'brown'               : [  165,42,42    ,1]
        ,'burlywood'           : [  222,184,135  ,1]
        ,'cadetblue'           : [  95,158,160   ,1]
        ,'chartreuse'          : [  127,255,0    ,1]
        ,'chocolate'           : [  210,105,30   ,1]
        ,'coral'               : [  255,127,80   ,1]
        ,'cornflowerblue'      : [  100,149,237  ,1]
        ,'cornsilk'            : [  255,248,220  ,1]
        ,'crimson'             : [  220,20,60    ,1]
        ,'cyan'                : [  0,255,255    ,1]
        ,'darkblue'            : [  0,0,139  ,    1]
        ,'darkcyan'            : [  0,139,139    ,1]
        ,'darkgoldenrod'       : [  184,134,11   ,1]
        ,'darkgray'            : [  169,169,169  ,1]
        ,'darkgreen'           : [  0,100,0  ,    1]
        ,'darkgrey'            : [  169,169,169  ,1]
        ,'darkkhaki'           : [  189,183,107  ,1]
        ,'darkmagenta'         : [  139,0,139    ,1]
        ,'darkolivegreen'      : [  85,107,47    ,1]
        ,'darkorange'          : [  255,140,0    ,1]
        ,'darkorchid'          : [  153,50,204   ,1]
        ,'darkred'             : [  139,0,0  ,    1]
        ,'darksalmon'          : [  233,150,122  ,1]
        ,'darkseagreen'        : [  143,188,143  ,1]
        ,'darkslateblue'       : [  72,61,139    ,1]
        ,'darkslategray'       : [  47,79,79 ,    1]
        ,'darkslategrey'       : [  47,79,79 ,    1]
        ,'darkturquoise'       : [  0,206,209    ,1]
        ,'darkviolet'          : [  148,0,211    ,1]
        ,'deeppink'            : [  255,20,147   ,1]
        ,'deepskyblue'         : [  0,191,255    ,1]
        ,'dimgray'             : [  105,105,105  ,1]
        ,'dimgrey'             : [  105,105,105  ,1]
        ,'dodgerblue'          : [  30,144,255   ,1]
        ,'firebrick'           : [  178,34,34    ,1]
        ,'floralwhite'         : [  255,250,240  ,1]
        ,'forestgreen'         : [  34,139,34    ,1]
        ,'fuchsia'             : [  255,0,255    ,1]
        ,'gainsboro'           : [  220,220,220  ,1]
        ,'ghostwhite'          : [  248,248,255  ,1]
        ,'gold'                : [  255,215,0    ,1]
        ,'goldenrod'           : [  218,165,32   ,1]
        ,'gray'                : [  128,128,128  ,1]
        ,'green'               : [  0,128,0  ,    1]
        ,'greenyellow'         : [  173,255,47   ,1]
        ,'grey'                : [  128,128,128  ,1]
        ,'honeydew'            : [  240,255,240  ,1]
        ,'hotpink'             : [  255,105,180  ,1]
        ,'indianred'           : [  205,92,92    ,1]
        ,'indigo'              : [  75,0,130 ,    1]
        ,'ivory'               : [  255,255,240  ,1]
        ,'khaki'               : [  240,230,140  ,1]
        ,'lavender'            : [  230,230,250  ,1]
        ,'lavenderblush'       : [  255,240,245  ,1]
        ,'lawngreen'           : [  124,252,0    ,1]
        ,'lemonchiffon'        : [  255,250,205  ,1]
        ,'lightblue'           : [  173,216,230  ,1]
        ,'lightcoral'          : [  240,128,128  ,1]
        ,'lightcyan'           : [  224,255,255  ,1]
        ,'lightgoldenrodyellow': [  250,250,210  ,1]
        ,'lightgray'           : [  211,211,211  ,1]
        ,'lightgreen'          : [  144,238,144  ,1]
        ,'lightgrey'           : [  211,211,211  ,1]
        ,'lightpink'           : [  255,182,193  ,1]
        ,'lightsalmon'         : [  255,160,122  ,1]
        ,'lightseagreen'       : [  32,178,170   ,1]
        ,'lightskyblue'        : [  135,206,250  ,1]
        ,'lightslategray'      : [  119,136,153  ,1]
        ,'lightslategrey'      : [  119,136,153  ,1]
        ,'lightsteelblue'      : [  176,196,222  ,1]
        ,'lightyellow'         : [  255,255,224  ,1]
        ,'lime'                : [  0,255,0  ,    1]
        ,'limegreen'           : [  50,205,50    ,1]
        ,'linen'               : [  250,240,230  ,1]
        ,'magenta'             : [  255,0,255    ,1]
        ,'maroon'              : [  128,0,0  ,    1]
        ,'mediumaquamarine'    : [  102,205,170  ,1]
        ,'mediumblue'          : [  0,0,205  ,    1]
        ,'mediumorchid'        : [  186,85,211   ,1]
        ,'mediumpurple'        : [  147,112,219  ,1]
        ,'mediumseagreen'      : [  60,179,113   ,1]
        ,'mediumslateblue'     : [  123,104,238  ,1]
        ,'mediumspringgreen'   : [  0,250,154    ,1]
        ,'mediumturquoise'     : [  72,209,204   ,1]
        ,'mediumvioletred'     : [  199,21,133   ,1]
        ,'midnightblue'        : [  25,25,112    ,1]
        ,'mintcream'           : [  245,255,250  ,1]
        ,'mistyrose'           : [  255,228,225  ,1]
        ,'moccasin'            : [  255,228,181  ,1]
        ,'navajowhite'         : [  255,222,173  ,1]
        ,'navy'                : [  0,0,128  ,    1]
        ,'oldlace'             : [  253,245,230  ,1]
        ,'olive'               : [  128,128,0    ,1]
        ,'olivedrab'           : [  107,142,35   ,1]
        ,'orange'              : [  255,165,0    ,1]
        ,'orangered'           : [  255,69,0 ,    1]
        ,'orchid'              : [  218,112,214  ,1]
        ,'palegoldenrod'       : [  238,232,170  ,1]
        ,'palegreen'           : [  152,251,152  ,1]
        ,'paleturquoise'       : [  175,238,238  ,1]
        ,'palevioletred'       : [  219,112,147  ,1]
        ,'papayawhip'          : [  255,239,213  ,1]
        ,'peachpuff'           : [  255,218,185  ,1]
        ,'peru'                : [  205,133,63   ,1]
        ,'pink'                : [  255,192,203  ,1]
        ,'plum'                : [  221,160,221  ,1]
        ,'powderblue'          : [  176,224,230  ,1]
        ,'purple'              : [  128,0,128    ,1]
        ,'red'                 : [  255,0,0  ,    1]
        ,'rosybrown'           : [  188,143,143  ,1]
        ,'royalblue'           : [  65,105,225   ,1]
        ,'saddlebrown'         : [  139,69,19    ,1]
        ,'salmon'              : [  250,128,114  ,1]
        ,'sandybrown'          : [  244,164,96   ,1]
        ,'seagreen'            : [  46,139,87    ,1]
        ,'seashell'            : [  255,245,238  ,1]
        ,'sienna'              : [  160,82,45    ,1]
        ,'silver'              : [  192,192,192  ,1]
        ,'skyblue'             : [  135,206,235  ,1]
        ,'slateblue'           : [  106,90,205   ,1]
        ,'slategray'           : [  112,128,144  ,1]
        ,'slategrey'           : [  112,128,144  ,1]
        ,'snow'                : [  255,250,250  ,1]
        ,'springgreen'         : [  0,255,127    ,1]
        ,'steelblue'           : [  70,130,180   ,1]
        ,'tan'                 : [  210,180,140  ,1]
        ,'teal'                : [  0,128,128    ,1]
        ,'thistle'             : [  216,191,216  ,1]
        ,'tomato'              : [  255,99,71    ,1]
        ,'turquoise'           : [  64,224,208   ,1]
        ,'violet'              : [  238,130,238  ,1]
        ,'wheat'               : [  245,222,179  ,1]
        ,'white'               : [  255,255,255  ,1]
        ,'whitesmoke'          : [  245,245,245  ,1]
        ,'yellow'              : [  255,255,0    ,1]
        ,'yellowgreen'         : [  154,205,50   ,1]    
    }
    
    C2P = C2P
    P2C = P2C
    hexieRE = re.compile(r'^#([0-9a-fA-F]{8})\b')
    hexRE = re.compile(r'^#([0-9a-fA-F]{3,6})\b')
    rgbRE = re.compile(r'^\b(rgba?)\b\s*\(([^\(\)]*)\)', re.I)
    hslRE = re.compile(r'^\b(hsla?)\b\s*\(([^\(\)]*)\)', re.I)
    keywordRE = None
    colorstopRE = re.compile(r'^\s+(\d+(\.\d+)?%?)')
    
    def parse(s1, withColorStops=False):
        s = str(s1[:])
        start = 0
        l = len(s)
        s = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', s)
        start = l - len(s)
        
        m = Color.hslRE.search(s)
        if m:
            # hsl(a)
            c =  Color().fromHSL([m.group(1), m.group(2)], 'parsed')
            l = m.end()
            l2 = 0
            if withColorStops:
                s2 = s[l:]
                m2 = Color.colorstopRE.search(s)
                if m2:
                    c.colorStop( m2.group(1) )
                    l2 = len(m2.group(0))
            
            return [c, start + m.start(), start + l+l2]
        
        m = Color.rgbRE.search(s)
        if m:
            # rgb(a)
            c = Color().fromRGB([m.group(1), m.group(2)], 'parsed')
            l = m.end()
            l2 = 0
            if withColorStops:
                s2 = s[l:]
                m2 = Color.colorstopRE.search(s)
                if m2:
                    c.colorStop( m2.group(1) )
                    l2 = len(m2.group(0))
            
            return [c, start + m.start(), start + l+l2]
        
        m = Color.hexRE.search(s)
        if m:
            # hex
            c = Color().fromHEX([m.group(1)], 'parsed')
            l = m.end()
            l2 = 0
            if withColorStops:
                s2 = s[l:]
                m2 = Color.colorstopRE.search(s)
                if m2:
                    c.colorStop( m2.group(1) )
                    l2 = len(m2.group(0))
            
            return [c, start + m.start(), start + l+l2]
        
        m = Color.keywordRE.search(s)
        if m:
            # keyword
            c = Color().fromKeyword([m.group(1)], 'parsed')
            l = m.end()
            l2 = 0
            if withColorStops:
                s2 = s[l:]
                m2 = Color.colorstopRE.search(s)
                if m2:
                    c.colorStop( m2.group(1) )
                    l2 = len(m2.group(0))
            
            return [c, start + m.start(), start + l+l2]
        
        return None
    
    def __init__(self, color=None, cstop=None):
        self.col = None
        self.cstop = None
        self.kword = None
        self.reset()
        if color: self.set(color, cstop)
    
    def reset(self):
        self.col = [0, 0, 0, 1]
        self.cstop = ''
        self.kword = None
        return self
    
    def set(self, color=None, cstop=None):
        if color:
            self.col[0] = clamp(color[0], 0, 255)
            self.col[1] = clamp(color[1], 0, 255)
            self.col[2] = clamp(color[2], 0, 255)
            if len(color) >= 4:
                self.col[3] = clamp(color[3], 0, 1)
            else:
                self.col[3] = 1
                
            if cstop:
                self.cstop = cstop
            
            self.kword = None    
            
        return self
    
    def colorStop(self, cstop=None):
        if cstop: self.cstop = cstop
        return self
    
    def isTransparent(self):
        if 1 > self.col[3]: return True
        return False
        
    def isKeyword(self):
        if self.kword: return True
        return False
        
    def fromKeyword(self, kword, asCSSString=None):
        parsed = False
        
        if not kword: return self
        
        if asCSSString:
        
            if 'parsed' == asCSSString:
            
                parsed = True
                k = kword[0].lower()
            
            else: 
                kword = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', kword)
                m = Color.keywordRE.search(kword)
                if m:
                
                    parsed = True
                    k = m.group(1).lower()
                
            
            if not parsed: return self
            
            self.col = Color.Keywords[k][:]
            self.kword = k
        
        else:
        
            kword = kword.lower()
            if kword in Color.Keywords:
            
                self.col = Color.Keywords[kword][:]
                self.kword = kword
            
        
        return self
        
    def fromHEX(self, hex, asCSSString=None):
        parsed = False
        
        if not hex: return self
        
        if asCSSString:
            if 'parsed' == asCSSString:
                parsed = True
                h = hex[0]
                
            else:
                hex = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', hex)
                m = Color.hexRE.search(hex)
                if m:
                    parsed = True
                    h = m.group(1)
            
            if not parsed: return self
            
            self.kword = None
            
            col = hex2rgb( h )
            self.col[0] = col[0]
            self.col[1] = col[1]
            self.col[2] = col[2]
            self.col[3] = 1
        
        else:
            self.kword = None
            
            self.col[0] = clamp(int(hex[0], 16), 0, 255)
            self.col[1] = clamp(int(hex[1], 16), 0, 255)
            self.col[2] = clamp(int(hex[2], 16), 0, 255)
            self.col[3] = 1
        
        return self
    
    def fromRGB(self, rgb, asCSSString=None):
        parsed = False
        
        if not rgb: return self
        
        if asCSSString:
            if 'parsed' == asCSSString:
                parsed = True
                isRGBA = 'rgba' == rgb[0].lower()
                col = map( trim, rgb[1].split(',') )
            
            else: 
                rgb = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', rgb)
                m = Color.rgbRE.search(rgb)
                if m:
                    parsed = True
                    isRGBA = 'rgba' == m.group(1).lower()
                    col = map( trim, m.group(2).split(',') )
            
            if not parsed: return self
            
            self.kword = None
            
            r = col[0]
            g = col[1]
            b = col[2]
            if isRGBA and len(col)>=4:  a = col[3]
            else: a = '1'
            
            if '%'== r[-1]: r = float(r[:-1])*2.55
            else: r = float(r)
            if '%'== g[-1]: g = float(g[:-1])*2.55
            else: g = float(g)
            if '%'== b[-1]: b = float(b[:-1])*2.55
            else: b = float(b)
            a = float(a)

            self.col[0] = clamp(round(r), 0, 255)
            self.col[1] = clamp(round(g), 0, 255)
            self.col[2] = clamp(round(b), 0, 255)
            self.col[3] = clamp(a, 0, 1)
        
        else:
            self.kword = None
            
            self.col[0] = clamp(round(rgb[0]), 0, 255)
            self.col[1] = clamp(round(rgb[1]), 0, 255)
            self.col[2] = clamp(round(rgb[2]), 0, 255)
            if len(col)>=4: self.col[3] = clamp(rgb[3], 0, 1)
            else:  self.col[3] = 1

        return self
    
    def fromHSL(self, hsl, asCSSString=None):
        parsed = False
        
        if not hsl: return self
        
        if asCSSString:
            if 'parsed' == asCSSString:
                parsed = True
                isHSLA = 'hsla' == hsl[0].lower()
                col = map( trim, hsl[1].split(',') )
            
            else: 
                hsl = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', hsl)
                m = Color.hslRE.search(hsl)
                if m:
                    parsed = True
                    isHSLA = 'hsla' == m.group(1).lower()
                    col = map( trim, m.group(2).split(',') )
            
            if not parsed: return self
        
            self.kword = None
            
            h = col[0]
            s = col[1]
            l = col[2]
            if isHSLA and len(col)>=4:  a = col[3]
            else: a = '1'
            
            h = float(h)
            if '%'== s[-1]: s = float(s[:-1])
            else: s = float(s)*C2P
            if '%'== l[-1]: l = float(l[:-1])
            else: l = float(l)*C2P
            a = float(a)
            
            rgb = hsl2rgb(h, s, l)

            self.col[0] = rgb[0]
            self.col[1] = rgb[1]
            self.col[2] = rgb[2]
            self.col[3] = clamp(a, 0, 1)
        
        else:
        
            self.kword = None
            
            rgb = hsl2rgb(hsl[0], hsl[1], hsl[2])
            self.col[0] = rgb[0]
            self.col[1] = rgb[1]
            self.col[2] = rgb[2]
            if len(hsl)>=4: self.col[3] = clamp(hsl[3], 0, 1)
            else:  self.col[3] = 1
        
        return self
    
    def toKeyword(self, asCSSString=None, withTransparency=False):
        if self.kword:
            return self.kword
        else:
            return self.toHEX(1)
        
    def toHEX(self, asCSSString=None, withTransparency=False):
        if withTransparency:
            return rgb2hexIE( self.col[0], self.col[1], self.col[2], clamp(round(255*self.col[3]), 0, 255) )
        else:
            return rgb2hex( self.col[0], self.col[1], self.col[2] )
    
    def toRGB(self, asCSSString=None, noTransparency=False):
        if asCSSString:
        
            if noTransparency or 1 == self.col[3]:
                return 'rgb(' + (',').join( asstring(self.col[0:3]) ) + ')'
            else:
                return 'rgba(' + (',').join( asstring(self.col) ) + ')'
        
        else:
        
            if noTransparency:
                return self.col[0:2]
            else:
                return self.col[:]
        
    
    def toHSL(self, asCSSString=None, noTransparency=False):
        hsl = rgb2hsl(self.col[0], self.col[1], self.col[2])
        if asCSSString:
        
            if noTransparency or 1 == self.col[3]:
                return 'hsl(' + (',').join( asstring([hsl[0], str(hsl[1])+'%', str(hsl[2])+'%']) ) + ')'
            else:
                return 'hsla(' + (',').join( asstring([hsl[0], str(hsl[1])+'%', str(hsl[2])+'%', self.col[3]]) ) + ')'
        
        else:
        
            if noTransparency:
                return hsl
            else:
                return hsl.append( self.col[3] )
        
    
    def toColorStop(self, compatType=0):
        cstop = self.cstop
        if compatType:
        
            if cstop and len(cstop):
                cstop = str(cstop) + ','
            else: cstop = ''
            
            if 1 > self.col[3]:
                return 'color-stop(' + cstop + '' + self.toRGB(1) + ')'
            else:
                return 'color-stop(' + cstop + '' + self.toHEX(1) + ')'
        
        else:
        
            if cstop and len(cstop):
                cstop = ' ' + str(cstop)
            else: cstop = ''
            
            if 1 > self.col[3]:
                return self.toRGB(1) + cstop
            else:
                return self.toHEX(1) + cstop
        
    
    def toString(self,  format="hex"):
        format = format.lower()
        if 'rgb' == format or 'rgba' == format:
        
            return self.toRGB(1, 'rgb' == format)
        
        elif 'hsl' == format or 'hsla' == format:
        
            return self.toHSL(1, 'hsl' == format)
        
        elif 'keyword' == format:
        
            return self.toKeyword(1)
        
        return self.toHEX(1, 'hexie' == format)
    

Color.keywordRE = re.compile(r'^\b(' + ('|').join( map( re.escape, list( Color.Keywords.keys() ) ) ) + ')\b', re.I)

CSSMin.Color = Color

class Angle:
    """CSS Angle Class and utils"""
    
    DEG2RAD = math.pi / 180
    GRAD2RAD= math.pi / 200
    TURN2RAD = 2*math.pi
    RAD2DEG = 180 / math.pi
    RAD2GRAD = 200 / math.pi
    RAD2TURN = 0.5 / math.pi
    compatOffset = 0.5*math.pi
    angleRE = re.compile(r'^(-?\d+(\.\d+)?)(deg|rad|grad|turn)\b', re.I)
    
    def parse(s1=""):
        s = str(s1[:])
        start = 0
        l = len(s)
        s = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', s)
        start = l - len(s)
        
        m = Angle.angleRE.search(s)
        if m:
        
            a = Angle(m[1], m[3])
            return [a, start + m.start(), start + m.end()]
        
        return None
    
    def __init__(self, a=0, unit='rad', legacy=None):
        self.a = 0
        self.set(a, unit, legacy)
    
    def set(self, a=0, unit='rad', legacy=None):
        
        if unit: unit = str(unit).lower()
        if a: a = float(a)
        else: a = 0
        
        if 'deg' == unit:
            a *= Angle.DEG2RAD
        elif 'grad' == unit:
            a *= Angle.GRAD2RAD
        elif 'turn' == unit:
            a *= Angle.TURN2RAD
        
        self.a = a
        
        return self
    
    
    def toString(self, unit='rad', legacy=None ):
        if unit:
            unit = str(unit).lower()
        else: unit = 'rad'
        
        a = self.a
        
        if legacy:
        
            # w3c 0 angle is NORTH, "left-handed"
            # legacy 0 angle is EAST, "right-handed"
            # https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
            a = Angle.compatOffset - a
        
        if  'deg' == unit:
            return str(round(a*Angle.RAD2DEG))+'deg'
        elif 'grad' == unit:
            return str((a*Angle.RAD2GRAD))+'grad'
        elif 'turn' == unit:
            return str((a*Angle.RAD2TURN))+'turn'
        return str(a)+'rad'
    
    
    
CSSMin.Angle = Angle

class Gradient:
    """CSS Gradient utils"""
    
    dirRE = re.compile(r'^(to\s+((top|bottom)\b)?(\s*)((left|right)\b)?)', re.I)
    
    def parseDirection(s):
        
        s = str(s[:])
        m = Angle.parse(s)
        if m:
            return m
        
        l = len(s)
        s = re.sub(CSSMin.Config['Regex']['trimSpaceCommaRE'], '', s)
        start = l - len(s)
        
        m = Gradient.dirRE.search(s)
        if m:
            return [[m.group(1), m.group(3), m.group(6)], start + m.start(), start + m.end()];
        
        return None

    def getDirection(dir=None, type=None):
        
        if not dir or not len(dir): return dir
        
        if isinstance(dir, Angle):
            if type:
                return dir.toString('deg', 1)
            else:
                return dir.toString('deg')
        
        if type:
        
            d1 = dir[1]
            d2 = dir[2]
            
            if 'top' == d1 and not d2:
                if 2 == type:
                    return 'left bottom, left top'
                else:
                    return 'bottom'
                    
            elif 'bottom' == d1 and not d2:
                if 2 == type:
                    return 'left top, left bottom'
                else:
                    return 'top'
                    
            elif 'left' == d2 and not d1:
                if 2 == type:
                    return 'right top, left top'
                else:
                    return 'right'
                    
            elif 'right' == d2 and not d1:
                if 2 == type:
                    return 'left top, right top'
                else:
                    return 'left'
                    
            elif 'top' == d1 and 'right' == d2:
                if 2 == type:
                    return 'left bottom, right top'
                else:
                    return 'bottom left'
                    
            elif 'bottom' == d1 and 'right' == d2:
                if 2 == type:
                    return 'left top, right bottom'
                else:
                    return 'top left'
                    
            elif 'bottom' == d1 and 'left' == d2:
                if 2 == type:
                    return 'right top, left bottom'
                else:
                    return 'top right'
                    
            elif 'top' == d1 and 'left' == d2:
                if 2 == type:
                    return 'right bottom, left top'
                else:
                    return 'bottom right'
                    
        
        return dir[0]

CSSMin.Gradient = Gradient

 
class Processor:
    """CSS Processor and Minifier"""
    
    def __init__(self):
        self.enc = 'utf8'
        self.input = False
        self.output = False
        self.basepath = None
        
        self.convertHSLA2RGBA = False
        self.convertRGB2HEX = False
        
        self.embedImports = False
        self.embedImages = False
        self.embedFonts = False
        
        self.removeComments = False
        self.vendorPrefixes = False
        self.applyPolyfills = False
        
        self.doMinify = True
   
    def realPath(self, file, bpath=None):
        if bpath is None: bpath = self.basepath
        if bpath:  return joinPath(bpath, file)
        else: return file
    
    def parse(self):
        if ap:
            parser = argparse.ArgumentParser(description="Process and Minify CSS Files (v. "+CSSMin.VERSION+")")
            parser.add_argument('--input', help="input file (REQUIRED)", metavar="FILE")
            parser.add_argument('--output', help="output file (OPTIONAL)", default=False)
            parser.add_argument('--vendor-prefixes', action="store_true", dest='vendorPrefixes', help="whether to add/fix vendor prefixes in css (default false)", default=False)
            parser.add_argument('--apply-polyfills', action="store_true", dest='applyPolyfills', help="whether to apply fallback polyfills (eg for gradients) in css (default false)", default=False)
            parser.add_argument('--hsla2rgba', action="store_true", dest='HSLA2RGBA', help="whether to convert hsl(a) colors to rgb(a) colors (default false)", default=False)
            parser.add_argument('--rgb2hex', action="store_true", dest='RGB2HEX', help="whether to convert rgb colors to hex colors (default false)", default=False)
            parser.add_argument('--embed-images', action="store_true", dest='embedImages', help="whether to embed images in the css (default false)", default=False)
            parser.add_argument('--embed-fonts', action="store_true", dest='embedFonts', help="whether to embed fonts in the css (default false)", default=False)
            parser.add_argument('--embed-imports', action="store_true", dest='embedImports', help="TODO, whether to embed css files added with @import (default false)", default=False)
            parser.add_argument('--remove-comments', action="store_true", dest='removeComments', help="whether to remove css comments (default false)", default=False)
            parser.add_argument('--no-minify', action="store_true", dest='noMinify', help="whether to bypass minification of the css (default false)", default=False)
            parser.add_argument('--basepath', help="file base path (OPTIONAL)", default=False)
            args = parser.parse_args()

        else:
            parser = optparse.OptionParser(description="Process and Minify CSS Files (v. "+CSSMin.VERSION+")")
            parser.add_option('--input', help="input file (REQUIRED)", metavar="FILE")
            parser.add_option('--output', dest='output', help="output file (OPTIONAL)", default=False)
            parser.add_option('--vendor-prefixes', action="store_true", dest='vendorPrefixes', help="whether to add/fix vendor prefixes in css (default false)", default=False)
            parser.add_option('--apply-polyfills', action="store_true", dest='applyPolyfills', help="whether to apply fallback polyfills (eg for gradients) in css (default false)", default=False)
            parser.add_option('--hsla2rgba', action="store_true", dest='HSLA2RGBA', help="whether to convert hsl(a) colors to rgb(a) colors (default false)", default=False)
            parser.add_option('--rgb2hex', action="store_true", dest='RGB2HEX', help="whether to convert rgb colors to hex colors (default false)", default=False)
            parser.add_option('--embed-images', action="store_true", dest='embedImages', help="whether to embed images in the css (default false)", default=False)
            parser.add_option('--embed-fonts', action="store_true", dest='embedFonts', help="whether to embed fonts in the css (default false)", default=False)
            parser.add_option('--embed-imports', action="store_true", dest='embedImports', help="TODO, whether to embed css files added with @import (default false)", default=False)
            parser.add_option('--remove-comments', action="store_true", dest='removeComments', help="whether to bypass minification of the css (default false)", default=False)
            parser.add_option('--no-minify', action="store_true", dest='noMinify', help="whether to remove css comments (default false)", default=False)
            parser.add_option('--basepath', help="file base path (OPTIONAL)", default=False)
            args, remainder = parser.parse_args()

        # If no arguments have been passed, show the help message and exit
        if len(sys.argv) == 1:
            parser.print_help()
            sys.exit(1)
        
        # Ensure variable is defined
        try:
            args.input
        except NameError:
            args.input = None

        # If no dependencies have been passed, show the help message and exit
        if None == args.input:
            parser.print_help()
            sys.exit(1)
        
        if args.basepath:
            self.basepath = args.basepath
        else:
            # get real-dir of input file
            self.basepath = os.path.dirname( os.path.realpath(args.input) )
        
        self.input = args.input
        self.output = args.output
        
        self.convertHSLA2RGBA = args.HSLA2RGBA
        self.convertRGB2HEX = args.RGB2HEX
        
        self.embedImports = args.embedImports
        self.embedImages = args.embedImages
        self.embedFonts = args.embedFonts
        
        self.removeComments = args.removeComments
        self.vendorPrefixes = args.vendorPrefixes
        self.applyPolyfills = args.applyPolyfills
        
        self.doMinify = not args.noMinify
        
    
    def convert_hsl2rgb(self, css):
        rx = CSSMin.Config['Regex']['hsla']
        hsl = Color()
        offset = 0
        m = rx.search(css, offset)
        while m:
            hsl.fromHSL( [ m.group(1), m.group(2) ], 'parsed' )
            rgb = hsl.toString('rgba')
            #css = str_replace(m.group(0), rgb, css)
            css = css[0:m.start()] + rgb + css[m.start()+len(m.group(0)):]
            offset = m.start() + len(rgb)
            m = rx.search(css, offset)
        
        return css
        
    def convert_rgb2hex(self, css, force=False):
        rx = CSSMin.Config['Regex']['rgba']
        rgb = Color()
        offset = 0
        m = rx.search(css, offset)
        while m:
            rgb.fromRGB( [ m.group(1), m.group(2) ], 'parsed' )
            if force or not rgb.isTransparent():
                hex = rgb.toString('hex')
                #css = str_replace(m.group(0), hex, css)
                css = css[0:m.start()] + hex + css[m.start()+len(m.group(0)):]
                offset = m.start() + len(hex)
            else:
                #bypass
                offset = m.end()
        
            m = rx.search(css, offset)
        
        return css
        
    def remove_comments(self, css):
        """Remove all CSS comment blocks."""
        
        iemac = False
        preserve = False
        comment_start = css.find("/*")
        while comment_start >= 0:
            # Preserve comments that look like `/*!...*/` or `/**...*/`.
            # Slicing is used to make sure we don"t get an IndexError.
            preserve = False #css[comment_start + 2:comment_start + 3] == "!" or css[comment_start + 2:comment_start + 3] == "*"
            
            comment_end = css.find("*/", comment_start + 2)
            if comment_end < 0:
                if not preserve:
                    css = css[:comment_start]
                    break
            elif comment_end >= (comment_start + 2):
                if css[comment_end - 1] == "\\":
                    # This is an IE Mac-specific comment; leave this one and the
                    # following one alone.
                    comment_start = comment_end + 2
                    iemac = True
                elif iemac:
                    comment_start = comment_end + 2
                    iemac = False
                elif not preserve:
                    css = css[:comment_start] + css[comment_end + 2:]
                else:
                    comment_start = comment_end + 2
            comment_start = css.find("/*", comment_start)
        
        return css

    def pseudoclasscolon(self, css):
        """
        Prevents 'p :link' from becoming 'p:link'.
        
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
        translated back again later.
        """
        
        rx = CSSMin.Config['Regex']['pseudoclasscolon']
        offset = 0
        m = rx.search(css, offset)
        while m:
            rep = str_replace(":", "___PSEUDOCLASSCOLON___", m.group(0))
            #css = str_replace(m.group(0), rep, css)
            css = css[0:m.start()] + rep + css[m.start()+len(m.group(0)):]
            offset = m.start() + len(rep)
            m = rx.search(css, offset)
        return css
    
    def remove_unnecessary_whitespace(self, css):
        """Remove unnecessary whitespace characters."""
        
        css = self.pseudoclasscolon(css)
        # Remove spaces from before things.
        css = re.sub(CSSMin.Config['Regex']['whitespace_start'], r"\1", css)
        
        # Put the space back in for a few cases, such as `@media screen` and
        # `(-webkit-min-device-pixel-ratio:0)`.
        css = re.sub(CSSMin.Config['Regex']['_and'], "and (", css)
        
        # Put the colons back.
        css = css.replace('___PSEUDOCLASSCOLON___', ':')
        
        # Remove spaces from after things.
        css = re.sub(CSSMin.Config['Regex']['whitespace_end'], r"\1", css)
        
        return css

    def remove_unnecessary_semicolons(self, css):
        """Remove unnecessary semicolons."""
        
        return re.sub(CSSMin.Config['Regex']['semi'], "}", css)

    def remove_empty_rules(self, css):
        """Remove empty rules."""
        
        return re.sub(CSSMin.Config['Regex']['empty'], "", css)

    def condense_zero_units(self, css):
        """Replace `0(px, em, %, etc)` with `0`."""
        
        return re.sub(CSSMin.Config['Regex']['zero_units'], r"\1\2", css)

    def condense_multidimensional_zeros(self, css):
        """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
        
        css = css.replace(":0 0 0 0;", ":0;")
        css = css.replace(":0 0 0;", ":0;")
        css = css.replace(":0 0;", ":0;")
        
        # Revert `background-position:0;` to the valid `background-position:0 0;`.
        css = css.replace("background-position:0;", "background-position:0 0;")
        
        return css

    def condense_floating_points(self, css):
        """Replace `0.6` with `.6` where possible."""
        
        return re.sub(CSSMin.Config['Regex']['floating_points'], r"\1.\2", css)

    def condense_hex_colors(self, css):
        """Shorten colors from #AABBCC to #ABC where possible."""
        
        rx = CSSMin.Config['Regex']['hex_color']
        offset = 0
        m = rx.search(css, offset)
        while m:
            first = m.group(3) + m.group(5) + m.group(7)
            second = m.group(4) + m.group(6) + m.group(8)
            if first.lower() == second.lower():
            
                rep = m.group(1) + m.group(2) + '#' + first.lower()
                #css = str_replace(m.group(0), rep, css)
                css = css[0:m.start()] + rep + css[m.start()+len(m.group(0)):]
                offset = m.start() + len(rep)
            else:
                offset = m.end()
            m = rx.search(css, offset)
        return css

    def condense_whitespace(self, css):
        """Condense multiple adjacent whitespace characters into one."""
        
        return re.sub(CSSMin.Config['Regex']['space'], " ", css)

    def condense_semicolons(self, css):
        """Condense multiple adjacent semicolon characters into one."""
        
        return re.sub(CSSMin.Config['Regex']['semicolons'], ";", css)

    def wrap_css_lines(self, css, line_length):
        """Wrap the lines of the given CSS to an approximate length."""
        
        lines = []
        line_start = 0
        for i, ch in enumerate(css):
            # It's safe to break after `}` characters.
            if '}' == ch  and (i - line_start >= line_length):
                lines.append(css[line_start:i + 1])
                line_start = i + 1
        
        if line_start < len(css): lines.append(css[line_start:])
        
        return "\n".join( lines )

    def extract_urls(self, css):
        # handle (relative) image/font urls in CSS
        urls = []
        rx = CSSMin.Config['Regex']['url']
        matches = re.findall(rx, css)
        if matches:
            
            for url in matches:
                url = url.strip().strip('"\'').strip()
                
                if isRelativePath(url): urls.append(url)
            
            
        return urls
    
    def embed_images(self, css, urls):
        imgs = ['gif', 'png', 'jpg', 'jpeg']
        replace = {}
        for url in urls:
            if url in replace: continue
            
            ext = url.split(".")[-1].lower()
            
            if ext in imgs:
                path = self.realPath(url)
                inline = base64_encode(path)
                
                # gif
                if 'gif' == ext:
                    inline = b'data:image/gif;base64,'+inline
                
                # png
                elif 'png' == ext:
                    inline = b'data:image/png;base64,'+inline
                
                # jpg/jpeg
                else:
                    inline = b'data:image/jpeg;base64,'+inline
                
                css = str_replace(url, inline.decode(self.enc), css)
                replace[url] = True
        
        return css
        
    def embed_fonts(self, css, urls):
        fonts = ['svg', 'ttf', 'eot', 'woff']
        replace = {}
        for url in urls:
            idpos = url.find('#')
            if idpos>=0:
                id = url[idpos:]
                fonturl = url[0:idpos-1]
            else:
                id = ''
                fonturl = url
            
            if fonturl in replace: continue
            
            ext = fonturl.split(".")[-1].lower()
            
            if ext in fonts:
                path = self.realPath(url)
                inline = base64_encode(path)
                
                # svg
                if 'svg' == ext:
                    inline = b'data:font/svg;charset=utf-8;base64,'+inline
                
                # ttf
                elif 'ttf' == ext:
                    inline = b'data:font/ttf;charset=utf-8;base64,'+inline
                
                # eot
                elif 'eot' == ext:
                    inline = b'data:font/eot;charset=utf-8;base64,'+inline
                
                # woff
                else:
                    inline = b'data:font/woff;charset=utf-8;base64,'+inline
                
                css = str_replace(url, inline.decode(self.enc) + id, css)
                replace[fonturl] = True
                
        return css
        
    def embed_imports(self, css):
        # todo
        return css
    
    def remove_multiple_charset(self, css):
        rx = CSSMin.Config['Regex']['charset']
        charset = None 
        times = 0
        offset = 0
        m = rx.search(css, offset)
        while  m:
            
            times += 1
            if 1 == times: charset = m.group()
            #css = str_replace(m.group(0), ' ', css)
            css = css[0:m.start()] + ' ' + css[m.start()+len(m.group(0)):]
            offset = m.start() + 1
            m = rx.search(css, offset)
        
        if charset:
            css = charset + "\n" + css
        
        return css

    def vendor_prefix_values(self, val, prefix1, pre1):
        values = CSSMin.Config['Vendor']['values']
        prefixes = CSSMin.Config['Vendor']['prefixes']
        rx = CSSMin.Config['Vendor']['Regex']['values']
        rv = {}
        i = 0
        offset = 0
        m = rx.search(val, offset)
        while m:
            v = m.group(3).lower()
            valprefixes = values[v]
            if prefix1 & valprefixes:
                i += 1
                prefix = prefixes[pre1][1]
                id = '__[[value_'+str(i)+']]__'
                rep = m.group(1) + m.group(2) + id + m.group(4)
                #val = str_replace(m.group(0), rep + ' ', val)
                val = val[0:m.start()] + rep + ' ' + val[m.start()+len(m.group(0)):]
                rv[id] = prefix + m.group(3)
                offset = m.start() + len(rep)
            else:
                offset = m.end()
            m = rx.search(val, offset)
                
        return str_replace(rv, val)
        
    def vendor_prefix_explicit(self, css):
        expl = CSSMin.Config['Vendor']['explicit']
        prefixes = CSSMin.Config['Vendor']['prefixes']
        rx = CSSMin.Config['Vendor']['Regex']['explicit']
        replacements = {}
        prel = range(len(prefixes))
        i = 0
        offset = 0
        m = rx.search(css, offset)
        while m:
            p = m.group(4).lower()
            explprefixes = expl[p]
            css = css.split( m.group(0) )
            prefixed = []
            for pre in prel:
                prefix = prefixes[pre][0]
                if prefix & explprefixes:
                    prefixed.append( m.group(2) + prefixes[pre][1] + ':' + m.group(5) + ';' )
            prefixed.append( m.group(2) + p + ':' + m.group(5) + m.group(6) )
            i += 1
            id = '__[[explicit_'+str(i)+']]__'
            rep = m.group(1) + id
            if '}'==m.group(6):
                css = ( rep ).join( css )
            else:
                css = ( rep + ';').join( css )
            replacements[id] = "\n".join( prefixed )
            offset = m.start() + len(rep)
            m = rx.search(css, offset)
                
        return [css, replacements]
        
    def vendor_prefix_properties(self, css, prefix1=None, pre1=None):
        props = CSSMin.Config['Vendor']['properties']
        prefixes = CSSMin.Config['Vendor']['prefixes']
        rx = CSSMin.Config['Vendor']['Regex']['properties']
        replacements = {}
        prel = range(len(prefixes))
        i = 0
        offset = 0
        m = rx.search(css, offset)
        while m:
            p = m.group(4).lower()
            propprefixes = props[p]
            css = css.split( m.group(0) )
            prefixed = []
            
            if prefix1 and (prefix1&propprefixes):
                prefixed.append( m.group(2) + prefixes[pre1][1] + p + ':' + self.vendor_prefix_values(m.group(5), prefix1, pre1) + m.group(6) )
            else:
                for pre in prel:
                    prefix = prefixes[pre][0]
                    if prefix&propprefixes:
                        prefixed.append( m.group(2) + prefixes[pre][1] + p + ':' + self.vendor_prefix_values(m.group(5), prefix, pre) + ';' )
                prefixed.append( m.group(2) + p + ':' + m.group(5) + m.group(6) )
            i += 1
            id = '__[[property_'+str(i)+']]__'
            rep = m.group(1) + id
            if '}'==m.group(6):
                css = ( rep ).join( css )
            else:
                css = ( rep + ';').join( css )
            replacements[id] = "\n".join( prefixed )
            offset = m.start() + len(rep)
            m = rx.search(css, offset)
                
        return [css, replacements]
        
    def vendor_prefix_atrules(self, css):
        atrules = CSSMin.Config['Vendor']['atrules']
        prefixes = CSSMin.Config['Vendor']['prefixes']
        has_properties = 'properties' in CSSMin.Config['Vendor']
        rx = CSSMin.Config['Vendor']['Regex']['atrules']
        replacements = {}
        prel = range(len(prefixes))
        
        i = 0
        offset = 0
        m = rx.search(css, offset)
        while m:
        
            p = m.group(4).lower()
            atruleprefixes = atrules[p]
            braces = 1 
            start = m.start() + len(m.group(1)) + len(m.group(2))
            start2 = start + len(m.group(3)) 
            lent = 0
            while braces:
            
                ch = css[start2 + lent]
                lent += 1
                if '{' == ch: braces += 1
                elif '}' == ch: braces -= 1
            
            at_rule = css[start : start+len(m.group(3))+lent]
            at_rule_name = m.group(5)
            at_rule_body = css[start+ len(m.group(3)) : start+ len(m.group(3))+lent-1]
            css = css.split( at_rule )
            prefixed = []
            for pre in prel:
            
                prefix = prefixes[pre][0]
                
                if prefix & atruleprefixes:
                    at_rule_body_p = at_rule_body + ''
                    if has_properties:
                    
                        res = self.vendor_prefix_properties(at_rule_body_p, prefix, pre)
                        at_rule_body_p = res[0];
                        at_rule_body_replace = res[1]
                        for pr in at_rule_body_replace:
                            at_rule_body_p = at_rule_body_replace[pr].join( at_rule_body_p.split( pr ) )
                            
                    prefixed.append( '@' + prefixes[pre][1] + p + ' ' + at_rule_name + ' {' + at_rule_body_p + ' }' )
            
            prefixed.append( '@' + p + ' ' + at_rule_name + ' {' + at_rule_body + ' }' )
            i += 1
            id = '__[[at_rule_'+str(i)+']]__'
            rep = id
            css = (rep + "\n").join(css)
            replacements[id] = "\n".join(prefixed)
            offset = m.start() + len(rep)
            m = rx.search(css, offset)
                
        return [css, replacements]
        
    def vendor_prefixes(self, css):
        
        replace_atrules = None 
        replace_explicit = None 
        replace_properties = None
        
        if 'atrules' in CSSMin.Config['Vendor']:
            res = self.vendor_prefix_atrules(css)
            css = res[0]
            replace_atrules = res[1]
        if 'explicit' in CSSMin.Config['Vendor']:
            res = self.vendor_prefix_explicit(css)
            css = res[0]
            replace_explicit = res[1]
        if 'properties' in CSSMin.Config['Vendor']:
            res = self.vendor_prefix_properties(css)
            css = res[0]
            replace_properties = res[1]
        
                    
        if replace_atrules:
            css = str_replace(replace_atrules, css)
        
        if replace_explicit:
            css = str_replace(replace_explicit, css)
        
        if replace_properties:
            css = str_replace(replace_properties, css)
        
        if replace_atrules or replace_properties or replace_explicit:
            css = self.condense_semicolons(css)
            
        return css
        
    def gradient_polyfills(self, css):
        polyfills = CSSMin.Config['Vendor']['polyfills']
        rx = CSSMin.Config['Vendor']['Regex']['polyfills']['gradient']
        replacements = {}
        i = 0
        offset = 0
        _tr = re.compile(r'^(\(|\s+)')
        
        m = rx.search(css, offset)
        while m:
            
            prefix = m.group(1)
            prop = m.group(2).lower()
            grad = m.group(3).lower()
            
            if grad in polyfills: 
                
                i += 1
                gradbody = re.sub(_tr, '', m.group(4)).lower()
                dir = Gradient.parseDirection( gradbody )
                if dir:
                
                    #gradbody = gradbody[:dir[1]] + "__DIR__" + gradbody[dir[2]:]
                    gradbody = gradbody[dir[2]:]
                    dir = dir[0]
                
                col = 0
                colors = []
                c = Color.parse( gradbody, 1 )
                while c:
                
                    col +=1 
                    #gradbody = gradbody[:c[1]] + "__COLOR"+str(col)+"__" + gradbody[c[2]:]
                    gradbody = gradbody[c[2]:]
                    colors.append( c[0] )
                    c = Color.parse( gradbody, 1 )
                
                id = '__[[grad_'+str(i)+']]__'
                if '}'==m.group(5): mend = '}'
                else: mend = ''
                rep = m.group(1) + id + mend
                replacements[id] = [m.group(0), prefix, prop, grad, gradbody, dir, colors]
                #css = str_replace(m.group(0), rep, css)
                css = css[0:m.start()] + rep + css[m.start()+len(m.group(0)):]
                offset = m.start() + len(rep)
            
            else:
                # todo
                offset = m.end()
            
            m = rx.search(css, offset)
    
        for id in replacements:
        
            repl = replacements[id]
            prop = repl[2]
            if 'background-image' == prop:
                propspecial = 'background-color'
            else:
                propspecial = prop
            grad = repl[3]
            dir = Gradient.getDirection(repl[5])
            dir1 = Gradient.getDirection(repl[5], 1)
            dir2 = Gradient.getDirection(repl[5], 2)
            colorstops = ','.join( map( lambda x: x.toColorStop(), repl[6] ) )
            colorstops2 = ','.join( map( lambda x: x.toColorStop(2), repl[6] ) )
            colorfirst = repl[6][0].toString('hex')
            colorlast = repl[6][-1].toString('hex')
            polyfill = polyfills[ grad ]
            rep = []
            
            if dir: dir += ','
            else: dir = ''
            if dir1: dir1 += ','
            else: dir1 = ''
            if dir2: dir2 += ','
            else: dir2 = ''
            
            r = {
                '__PROP__' : prop,
                '__PROPSPECIAL__' : propspecial,
                '__DIR__' : dir,
                '__DIR1__' : dir1,
                '__DIR2__' : dir2,
                '__COLORSTOPS__' : colorstops,
                '__COLORSTOPS2__' : colorstops2,
                '__COLORFIRST__' : colorfirst,
                '__COLORLAST__' : colorlast
            }
            
            for i in range(len(polyfill)):
                rep.append( "\n".join( map( lambda x: str_replace(r, x), polyfill[i] ) ) )
            
            css = str_replace(id, "\n".join(rep), css)
        
        return css

    def apply_polyfills(self, css):
        css = self.gradient_polyfills(css)
        return css
        
    def minify(self, css, wrap=None, commentsRemoved=False):
        
        if not commentsRemoved:
            css = self.remove_comments(css)
        
        css = self.condense_whitespace(css)
        
        # A pseudo class for the Box Model Hack
        # (see http://tantek.com/CSS/Examples/boxmodelhack.html)
        css = css.replace('"\\"}\\""', "___PSEUDOCLASSBMH___")
        
        css = self.remove_unnecessary_whitespace(css)
        
        css = self.remove_unnecessary_semicolons(css)
        
        css = self.condense_zero_units(css)
        
        css = self.condense_multidimensional_zeros(css)
        
        css = self.condense_floating_points(css)
        
        css = self.condense_hex_colors(css)
        
        if wrap is not None: css = self.wrap_css_lines(css, wrap)
        
        css = css.replace("___PSEUDOCLASSBMH___", '"\\"}\\""')
        
        css = self.condense_semicolons(css).strip()
        
        return css
        
    def process(self, css, wrap=None):
        
        if self.removeComments:
            css = self.remove_comments(css)
        
        #if self.embedImports:
        #    css = self.embed_imports(css)
        
        css = self.remove_multiple_charset(css)
            
        if self.applyPolyfills:
            css = self.apply_polyfills(css)
            
        if self.convertHSLA2RGBA:
            css = self.convert_hsl2rgb(css)
        if self.convertRGB2HEX:
            css = self.convert_rgb2hex(css)
            
        if self.vendorPrefixes:
            css = self.vendor_prefixes(css)
        
        if self.doMinify:
            css = self.minify(css, wrap, self.removeComments)
        
        if self.embedImages or self.embedFonts:
            urls = self.extract_urls(css)
        if self.embedImages:  
            css = self.embed_images(css, urls)
        if self.embedFonts:  
            css = self.embed_fonts(css, urls)
        
        return css
        
CSSMin.Processor = Processor

# static
def Main():
    cssmin = Processor()
    cssmin.parse( )
    if cssmin.input:
        css = readFile( cssmin.input, cssmin.enc )
        mincss = cssmin.process( css )
        if cssmin.output: writeFile( cssmin.output, mincss, cssmin.enc )
        else: print ( mincss )
    
CSSMin.Main = Main

# if used with 'import *'
__all__ = ['CSSMin']

# if called directly from command-line.
if __name__ == "__main__":  
    # run it
    CSSMin.Main()