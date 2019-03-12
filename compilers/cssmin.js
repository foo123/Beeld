/**
*#!/usr/bin/env node
* 
* CSSmin.py for Notepad++ Python Scripting plugin
* https://github.com/ethanpil/npp-cssmin
* This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
* 
* Credits:
*   Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
* 
* Modified version of npp-cssmin adapted for Node 0.8+
* v. 1.0.0
* @Nikos M.
* 
**/
!function (root, moduleName, moduleDefinition) {
//
// export the module

// node, CommonJS, etc..
if ( 'object' == typeof(module) && module.exports ) module.exports = moduleDefinition();

// AMD, etc..
else if ( 'function' == typeof(define) && define.amd ) define( moduleDefinition );

// browser, etc..
else root[ moduleName ] = moduleDefinition();
}(this, 'CSSMin', function( undef ) {
"use strict";
// the exported object
var CSSMin = { VERSION : "1.0.0" };

var // node modules
    isNode = ('undefined' !== typeof global) && ('[object global]' == {}.toString.call(global)) && ('function' === typeof require),
    fs, path, realpath, readFile, writeFile, exists, unLink, 
    dirname, pjoin, exit, 
    echo = console.log, echoStdErr = console.error,
    THISFILE = 'CSSMin', DS = '/', DSRX = /\/|\\/g, FILENAME = /^[a-z0-9_]/i
;

if ( isNode )
{
    fs = require('fs'); 
    path = require('path');
    realpath = fs.realpathSync; 
    readFile = function(file, enc) { return fs.readFileSync(file, {encoding: enc||'utf8'}); };
    writeFile = function(file, text, enc) { return fs.writeFileSync(file, text, {encoding: enc||'utf8'}); };
    exists = fs.existsSync; 
    unLink = fs.unlinkSync;
    dirname = path.dirname; 
    pjoin = path.join;
    THISFILE = path.basename(__filename);
    exit = process.exit;
    DS = path.sep || '/';
}

var // utils
    round = Math.round, floor = Math.floor, min = Math.min, max = Math.max, abs = Math.abs,
    
    clamp = function(v, m, M) { return max(min(v, M), m); },
    
    AP = Array.prototype, OP = Object.prototype, 
    HAS = OP.hasOwnProperty, concat = AP.concat, slice = AP.slice,
    
    extend = function(o1, o2) { 
        o1 = o1 || {}; 
        for (var p in o2)
        { 
            if ( HAS.call(o2,p) ) 
            { 
                o1[p] = o2[p]; 
            } 
        }; 
        return o1; 
    },
    
    esc = function(s) { return s.replace(/([.*+?^${}()|\[\]\/\\\-])/g, '\\$1'); },
    
    startsWith = function(s, p) { return (s && p == s.substr(0, p.length)); },
    
    trim_re = /^\s+|\s+$/gm,
    trim = function(s) { return s.replace(trim_re, ''); },
    
    trimd = function(s, delim) { 
        var r1, r2;
        if (delim)
        {
            r = new RegExp('^['+esc(delim+'')+']+'+'|'+'['+esc(delim+'')+']+$', 'gm');
        }
        else
        {
            r = trim_re;
        }
        return s.replace(r, '');
    },
    
    str_replace = function(r1, r2, s) {
        if ( 3 <= arguments.length )
        {
            return s.split( r1 ).join( r2 );
        }
        else if ( 2 == arguments.length )
        {
            for (var k in r1)
            {
                if ( !HAS.call(r1, k) ) continue;
                r2 = r2.split( k ).join( r1[k] );
            }
            return r2;
        }
        return r1;
    },
    
    // https://github.com/JosephMoniz/php-path
    joinPath = function() {
        var i, args = slice.call(arguments), argslen = args.length,
            path, plen, isAbsolute, trailingSlash, 
            peices, peiceslen, tmp,
            new_path, up, last
        ;
        
        if (!argslen)  return ".";
        
        path = args.join( DS );
        plen = path.length;
        
        if (!plen) return ".";
        
        isAbsolute    = path[0];
        trailingSlash = path[plen - 1];

        tmp = path.split(DSRX);
        peiceslen = tmp.length;
        peices = [];
        for (i=0; i<peiceslen; i++)
        {
            if (tmp[i].length) peices.push(tmp[i]);
        }
        
        new_path = [];
        up = 0;
        i = peices.length-1;
        while (i>=0)
        {
            last = peices[i];
            if (last == "..") 
            {
                up++;
            } 
            else if (last != ".")
            {
                if (up)  up--;
                else  new_path.push( peices[i] );
            }
            i--;
        }
        
        path = new_path.reverse().join( DS );
        
        if (!path.length && !isAbsolute.length) 
        {
            path = ".";
        }

        if (path.length && trailingSlash == DS /*"/"*/) 
        {
            path += DS /*"/"*/;
        }

        return (isAbsolute == DS /*"/"*/ ? DS /*"/"*/ : "") + path;
    },
    
    isRelativePath = function(file) {
        
        if (
            startsWith(file, 'http://') || 
            startsWith(file, 'https://') ||
            startsWith(file, '/') ||
            startsWith(file, '\\')
        )
            return false;
        else if (
            startsWith(file, './') || 
            startsWith(file, '../') || 
            startsWith(file, '.\\') || 
            startsWith(file, '..\\') ||
            FILENAME.test(file)
        )
            return true;
            
        // unknown
        return false;
    }
;

//
// CSSMin configurations
var WEBKIT = 1, MOZ = 2, MS = 4, O = 8;
CSSMin.Config = {
    
    //
    // Regexes for parsing
    Regex : {
        
        escape : esc,
        
        compute_vendor_values : function( ) { 
            return new RegExp('(^|\\s|:|,)(\\s*)(' + Object.keys(CSSMin.Config.Vendor['values']).map(esc).join('|') + ')($|;|\\s|,)', 'gmi'); 
        },
        compute_vendor_explicits : function( ) { 
            return new RegExp('(^|;|\\{)(\\s*)((' + Object.keys(CSSMin.Config.Vendor['explicit']).map(esc).join('|') + ')\\s*:([^;\\}]*))($|;|\\})', 'gmi'); 
        },
        compute_vendor_properties : function( ) { 
            return new RegExp('(^|;|\\{)(\\s*)((' + Object.keys(CSSMin.Config.Vendor['properties']).map(esc).join('|') + ')\\s*:([^;\\}]*))($|;|\\})', 'gmi'); 
        },
        compute_vendor_atrules : function( ) { 
            return new RegExp('(^|;|\\{|\\})(\\s*)(@(' + Object.keys(CSSMin.Config.Vendor['atrules']).map(esc).join('|') + ')\\s+([0-9a-zA-Z_\\-]+)\\s*\\{)', 'gmi'); 
        },

        'leadingSpaceOrCommas': /^[\s,]+/,
        'hsla': /\b(hsla?)\b\s*\(([^\(\)]+)\)/gmi,
        'rgba': /\b(rgba?)\b\s*\(([^\(\)]+)\)/gmi,
        'pseudoclasscolon': /(^|\})(([^\{\:])+\:)+([^\{]*\{)/gm,
        'whitespace_start': /\s+([!{};:>+\(\)\],])/gm,
        'and': /\band\(/gmi,
        'whitespace_end': /([!{}:;>+\(\[,])\s+/gm,
        'space': /\s+/gm,
        'semi': /;+\}/gm,
        'semicolons': /;;+/gm,
        'empty': /[^\}\{]+\{\}/gm,
        /* ch ?, ms, s (durations) seem to cause animation issues */
        'zero_units': /([\s:,\(])(0)0*(rad|grad|deg|turn|vh|vw|vmin|vmax|px|rem|em|%|in|cm|mm|pc|pt|ex)/gmi,
        'floating_points': /(:|\s|,|\()0+\.(\d+)/gm,
        'hex_color': /([^\"'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/gm,
        'url': /\burl\b\s*\(([^\)]+?)\)/gmi,
        'charset': /@charset [^;]+($|;)/gmi
    },
    
    //
    // Vendor prefixes and polyfills configurations
    Vendor: {
        
        'WEBKIT' : WEBKIT, 'MOZ' : MOZ, 'MS' : MS, 'O' : O,
        
        // vendor prefixes config
        'prefixes' : [ [WEBKIT, '-webkit-'], [MOZ, '-moz-'], [MS, '-ms-'],  [O, '-o-'] ],
        
        'Regex' : {
            'polyfills': {
                'gradient': /(^|\s+|;)(background-image|background)\b\s*:\s*(linear-gradient)\b([^;\}]*)(;|\})/gmi
            },
            'values': null, 
            'explicit': null, 
            'properties': null, 
            'atrules': null 
        },
        
        'polyfills' : {
            'linear-gradient' : [
                [
                    /* Old browsers */
                    '__PROPSPECIAL__:__COLORFIRST__;'
                ],
                [
                    /* Chrome,Safari4+ */
                    '__PROP__:-webkit-gradient(linear, __DIR2__ __COLORSTOPS2__);',
                    /* Chrome10+,Safari5.1+ */
                    '__PROP__:-webkit-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    /* FF3.6+ */
                    '__PROP__:-moz-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    /* IE10+ */
                    '__PROP__:-ms-linear-gradient(__DIR1__  __COLORSTOPS__);',
                ],
                [
                    /* Opera 11.10+ */
                    '__PROP__:-o-linear-gradient(__DIR1__  __COLORSTOPS__);'
                ],
                [
                    /* W3C */
                    '__PROP__:linear-gradient(__DIR__  __COLORSTOPS__);'
                ]
            ]/*,
            
            'radial-gradient' : [
                [
                    /* Old browsers * /
                    '__PROPSPECIAL__:__COLORFIRST__;'
                ],
                [
                    /* Chrome,Safari4+ * /
                    '__PROP__:-webkit-gradient(radial, __CENTER1__, __MODE2__, __COLORSTOPS__);',
                    /* Chrome10+,Safari5.1+ * /
                    '__PROP__:-webkit-radial-gradient(__CENTER1__, __MODE__,__COLORS__);'
                ],
                [
                    /* FF3.6+ * /
                    '__PROP__:-moz-radial-gradient(__CENTER1__, __MODE__,  __COLORS__);'
                ],
                [
                    /* IE10+ * /
                    '__PROP__:-ms-radial-gradient(__CENTER1__, __MODE__,  __COLORS__);',
                ],
                [
                    /* Opera 11.10+ * /
                    '__PROP__:-o-radial-gradient(__CENTER1__, __MODE__,  __COLORS__);'
                ],
                [
                    /* W3C * /
                    '__PROP__:radial-gradient(__CENTER__, __MODE__,  __COLORS__);'
                ]
            ]*/
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
            ,'user-select' : WEBKIT | MOZ | MS | O
        },

        'atrules': {
            'keyframes' : WEBKIT | MOZ | MS | O
        }
    }
};
CSSMin.Config.Vendor.Regex['values'] = CSSMin.Config.Regex.compute_vendor_values();
CSSMin.Config.Vendor.Regex['explicit'] = CSSMin.Config.Regex.compute_vendor_explicits();
CSSMin.Config.Vendor.Regex['properties'] = CSSMin.Config.Regex.compute_vendor_properties();
CSSMin.Config.Vendor.Regex['atrules'] = CSSMin.Config.Regex.compute_vendor_atrules();

//
// CSS String utils
CSSMin.String = {
    
    trim :  trim,
    trimd : trimd,
    
    // adapted from phpjs (https://github.com/kvz/phpjs)
    sprintf : function sprintf() {
        var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
        var a = arguments,
        i = 0,
        format = a[i++];

        // pad()
        var pad = function (str, len, chr, leftJustify) {
            if (!chr) {
                chr = ' ';
            }
            var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str;
        };

        // justify()
        var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
            var diff = minWidth - value.length;
            if (diff > 0) {
                if (leftJustify || !zeroPad) {
                    value = pad(value, minWidth, customPadChar, leftJustify);
                } else {
                    value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
                }
            }
            return value;
        };

        // formatBaseX()
        var formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
            // Note: casts negative numbers to positive ones
            var number = value >>> 0;
            prefix = prefix && number && {
            '2': '0b',
            '8': '0',
            '16': '0x'
            }[base] || '';
            value = prefix + pad(number.toString(base), precision || 0, '0', false);
            return justify(value, prefix, leftJustify, minWidth, zeroPad);
        };

        // formatString()
        var formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
            if (precision != null) {
                value = value.slice(0, precision);
            }
            return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
        };

        // doFormat()
        var doFormat = function (substring, valueIndex, flags, minWidth, _, precision, type) {
            var number;
            var prefix;
            var method;
            var textTransform;
            var value;

            if (substring == '%%') {
                return '%';
            }

            // parse flags
            var leftJustify = false,
            positivePrefix = '',
            zeroPad = false,
            prefixBaseX = false,
            customPadChar = ' ';
            var flagsl = flags.length;
            for (var j = 0; flags && j < flagsl; j++) {
                switch (flags.charAt(j)) {
                    case ' ':
                        positivePrefix = ' ';
                        break;
                    case '+':
                        positivePrefix = '+';
                        break;
                    case '-':
                        leftJustify = true;
                        break;
                    case "'":
                        customPadChar = flags.charAt(j + 1);
                        break;
                    case '0':
                        zeroPad = true;
                        break;
                    case '#':
                        prefixBaseX = true;
                        break;
                }
            }

            // parameters may be null, undefined, empty-string or real valued
            // we want to ignore null, undefined and empty-string values
            if (!minWidth) {
                minWidth = 0;
            } else if (minWidth == '*') {
                minWidth = +a[i++];
            } else if (minWidth.charAt(0) == '*') {
                minWidth = +a[minWidth.slice(1, -1)];
            } else {
                minWidth = +minWidth;
            }

            // Note: undocumented perl feature:
            if (minWidth < 0) {
                minWidth = -minWidth;
                leftJustify = true;
            }

            if (!isFinite(minWidth)) {
                throw new Error('sprintf: (minimum-)width must be finite');
            }

            if (!precision) {
                precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : undefined;
            } else if (precision == '*') {
                precision = +a[i++];
            } else if (precision.charAt(0) == '*') {
                precision = +a[precision.slice(1, -1)];
            } else {
                precision = +precision;
            }

            // grab value using valueIndex if required?
            value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

            switch (type) {
                case 's':
                    return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
                case 'c':
                    return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
                case 'b':
                    return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'o':
                    return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'x':
                    return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'X':
                    return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
                case 'u':
                    return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'i':
                case 'd':
                    number = +value || 0;
                    number = Math.round(number - number % 1); // Plain Math.round doesn't just truncate
                    prefix = number < 0 ? '-' : positivePrefix;
                    value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad);
                case 'e':
                case 'E':
                case 'f': // Should handle locales (as per setlocale)
                case 'F':
                case 'g':
                case 'G':
                    number = +value;
                    prefix = number < 0 ? '-' : positivePrefix;
                    method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                    textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                    value = prefix + Math.abs(number)[method](precision);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
                default:
                    return substring;
            }
        };
        return format.replace(regex, doFormat);
    },
    
    vsprintf : function vsprintf(format, args) { return this.sprintf.apply(this, [format].concat(args));  }
};

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
var Base64 = CSSMin.String.Base64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
    encode2 : function(input) {
        return new Buffer(input, 'binary').toString('base64');
    },
    
    // public method for encoding
    encode : function base64_encode(input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = Base64._utf8_encode(input);
 
        while (i < input.length) {
 
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
 
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
 
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
 
            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
        }
 
        return output;
    },
 
    // public method for decoding
    decode : function base64_decode(input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
        while (i < input.length) {
 
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
 
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
 
            output = output + String.fromCharCode(chr1);
 
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
 
        }
 
        output = Base64._utf8_decode(output);
 
        return output;
 
    },
 
    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
 
        }
 
        return utftext;
    },
 
    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
 
        while ( i < utftext.length ) {
 
            c = utftext.charCodeAt(i);
 
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
 
        }
 
        return string;
    }
};
var base64_encode = Base64.encode, base64_encode2 = Base64.encode2, base64_decode = Base64.decode,
    sprintf = CSSMin.String.sprintf, vsprintf = CSSMin.String.vsprintf
;

//
// CSS Color Class and utils
var Color = CSSMin.Color = function( color, cstop ) {
    this.reset();
    if ( color ) this.set( color, cstop );
};
//
// static
Color.Keywords = {
    // http://www.w3.org/wiki/CSS/Properties/color/keywords
    // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
    /* extended */
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
};          
Color.clamp = clamp;
var C2P = Color.C2P = 100/255;
var P2C = Color.P2C = 2.55;
// color format regexes
Color.hexieRE = /^#([0-9a-fA-F]{8})\b/;
Color.hexRE = /^#([0-9a-fA-F]{3,6})\b/;
Color.rgbRE = /^(rgba?)\b\s*\(([^\(\)]*)\)/i;
Color.hslRE = /^(hsla?)\b\s*\(([^\(\)]*)\)/i;
Color.keywordRE = new RegExp('^(' + Object.keys(Color.Keywords).map(esc).join('|') + ')\\b', 'i');
Color.colorstopRE = /^\s+(\d+(\.\d+)?%?)/;
// color format conversions
var col2per = Color.col2per = function(c, suffix) {
    return (c*C2P)+(suffix||'');
};
var per2col = Color.per2col = function(c) {
    return c*P2C;
};
var rgb2hex = Color.rgb2hex = function(r, g, b, condenced, asPercent) { 
    var hex;
    if ( asPercent )
    {
        r = clamp(round(r*P2C), 0, 255);
        g = clamp(round(g*P2C), 0, 255);
        b = clamp(round(b*P2C), 0, 255);
    }
    
    r = ( r < 16 ) ? '0'+r.toString(16) : r.toString(16);
    g = ( g < 16 ) ? '0'+g.toString(16) : g.toString(16);
    b = ( b < 16 ) ? '0'+b.toString(16) : b.toString(16);
    
    if ( condenced && (r[0]==r[1] && g[0]==g[1] && b[0]==b[1]) )
        hex = '#' + r[0] + g[0] + b[0];
    else
        hex = '#' + r + g + b;
    
    return hex;
};
var rgb2hexIE = Color.rgb2hexIE = function(r, g, b, a, asPercent) { 
    var hex;
    if ( asPercent )
    {
        r = clamp(round(r*P2C), 0, 255);
        g = clamp(round(g*P2C), 0, 255);
        b = clamp(round(b*P2C), 0, 255);
        a = clamp(round(a*P2C), 0, 255);
    }
    
    r = ( r < 16 ) ? '0'+r.toString(16) : r.toString(16);
    g = ( g < 16 ) ? '0'+g.toString(16) : g.toString(16);
    b = ( b < 16 ) ? '0'+b.toString(16) : b.toString(16);
    a = ( a < 16 ) ? '0'+a.toString(16) : a.toString(16);
    hex = '#' + a + r + g + b;
    
    return hex;
};
var hex2rgb = Color.hex2rgb = function(h/*, asPercent*/) {  
    if ( !h || 3 > h.length )
        return [0, 0, 0];
        
    if ( 6 > h.length )
        return [
            clamp( parseInt(h[0]+h[0], 16), 0, 255 ), 
            clamp( parseInt(h[1]+h[1], 16), 0, 255 ), 
            clamp( parseInt(h[2]+h[2], 16), 0, 255 )
        ];
    
    else
        return [
            clamp( parseInt(h[0]+h[1], 16), 0, 255 ), 
            clamp( parseInt(h[2]+h[3], 16), 0, 255 ), 
            clamp( parseInt(h[4]+h[5], 16), 0, 255 )
        ];
    
    /*if ( asPercent )
        rgb = [
            (rgb[0]*C2P)+'%', 
            (rgb[1]*C2P)+'%', 
            (rgb[2]*C2P)+'%'
        ];*/
};
// http://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 */
var hue2rgb = Color.hue2rgb = function(p, q, t) {
    if ( t < 0 ) t += 1;
    if ( t > 1 ) t -= 1;
    if ( t < 1/6 ) return p + (q - p) * 6 * t;
    if ( t < 1/2 ) return q;
    if ( t < 2/3 ) return p + (q - p) * (2/3 - t) * 6;
    return p;
};
var hsl2rgb = Color.hsl2rgb = function(h, s, l) {
    var r, g, b, p, q;

    // convert to [0, 1] range
    h = ((h + 360)%360)/360;
    s *= 0.01;
    l *= 0.01;
    
    if ( 0 == s )
    {
        // achromatic
        r = 1;
        g = 1;
        b = 1;
    }
    else
    {

        q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [
        clamp( round(r * 255), 0, 255 ), 
        clamp( round(g * 255), 0, 255 ),  
        clamp( round(b * 255), 0, 255 )
    ];
};
/**
* Converts an RGB color value to HSL. Conversion formula
* adapted from http://en.wikipedia.org/wiki/HSL_color_space.
* Assumes r, g, and b are contained in the set [0, 255] and
* returns h, s, and l in the set [0, 1].
*/
var rgb2hsl = Color.rgb2hsl = function(r, g, b, asPercent) {
    var fact = 1/255, m, M, h, s, l, d;
    
    if ( asPercent )
    {
        r *= 0.01;
        g *= 0.01;
        b *= 0.01;
    }
    else
    {
        r *= fact; 
        g *= fact; 
        b *= fact;
    }
    M = max(r, g, b); 
    m = min(r, g, b);
    l = 0.5*(M + m);

    if ( M == m )
    {
        h = s = 0; // achromatic
    }
    else
    {
        d = M - m;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        if ( M == r )
            h = (g - b) / d + (g < b ? 6 : 0);
        
        else if ( M == g )
            h = (b - r) / d + 2;
        
        else
            h = (r - g) / d + 4;
        
        h /= 6;
    }
    
    return [
        round( h*360 ) % 360, 
        clamp(s*100, 0, 100), 
        clamp(l*100, 0, 100)
    ];
};
Color.parse = function(s, withColorStops, parsed, onlyColor) {
    var m, m2, s2, end = 0, end2 = 0, c, hasOpacity;
    
    if ( 'hsl' == parsed || 
        ( !parsed && (m = s.match(Color.hslRE)) ) 
    )
    {
        // hsl(a)
        if ( 'hsl' == parsed )
        {
            hasOpacity = 'hsla' == s[0].toLowerCase();
            var col = s[1].split(',').map(trim);
        }
        else
        {
            end = m[0].length;
            end2 = 0;
            hasOpacity = 'hsla' == m[1].toLowerCase();
            var col = m[2].split(',').map(trim);
        }    
        
        var h = col[0] ? col[0] : '0';
        var s = col[1] ? col[1] : '0';
        var l = col[2] ? col[2] : '0';
        var a = hasOpacity && null!=col[3] ? col[3] : '1';
        
        h = parseFloat(h, 10);
        s = ('%'==s.slice(-1)) ? parseFloat(s, 10) : parseFloat(s, 10)*C2P;
        l = ('%'==l.slice(-1)) ? parseFloat(l, 10) : parseFloat(l, 10)*C2P;
        a = parseFloat(a, 10);
        
        c = new Color().fromHSL([h, s, l, a]);

        if ( withColorStops )
        {
            s2 = s.substr( end );
            if ( m2 = s2.match(Color.colorstopRE) )
            {
                c.colorStop( m2[1] );
                end2 = m2[0].length;
            }
        }
        return onlyColor ? c : [c, 0, end+end2];
    }
    if ( 'rgb' == parsed || 
        ( !parsed && (m = s.match(Color.rgbRE)) ) 
    )
    {
        // rgb(a)
        if ( 'rgb' == parsed )
        {
            hasOpacity = 'rgba' == s[0].toLowerCase();
            var col = s[1].split(',').map(trim);
        }
        else
        {
            end = m[0].length;
            end2 = 0;
            hasOpacity = 'rgba' == m[1].toLowerCase();
            var col = m[2].split(',').map(trim);
        }    
            
        var r = col[0] ? col[0] : '0';
        var g = col[1] ? col[1] : '0';
        var b = col[2] ? col[2] : '0';
        var a = hasOpacity && null!=col[3] ? col[3] : '1';
        
        r = ('%'==r.slice(-1)) ? parseFloat(r, 10)*2.55 : parseFloat(r, 10);
        g = ('%'==g.slice(-1)) ? parseFloat(g, 10)*2.55 : parseFloat(g, 10);
        b = ('%'==b.slice(-1)) ? parseFloat(b, 10)*2.55 : parseFloat(b, 10);
        a = parseFloat(a, 10);
        
        c = new Color().fromRGB([r, g, b, a]);

        if ( withColorStops )
        {
            s2 = s.substr( end );
            if ( m2 = s2.match(Color.colorstopRE) )
            {
                c.colorStop( m2[1] );
                end2 = m2[0].length;
            }
        }
        return onlyColor ? c : [c, 0, end+end2];
    }
    if ( 'hex' == parsed || 
        ( !parsed && (m = s.match(Color.hexRE)) ) 
    )
    {
        // hex
        if ( 'hex' == parsed )
        {
            var col = hex2rgb( s[0] );
        }
        else
        {
            end = m[0].length;
            end2 = 0;
            var col = hex2rgb( m[1] );
        }    
            
        var h1 = col[0] ? col[0] : 0x00;
        var h2 = col[1] ? col[1] : 0x00;
        var h3 = col[2] ? col[2] : 0x00;
        var a = null!=col[3] ? col[3] : 0xff;
        
        c = new Color().fromHEX([h1, h2, h3, a]);

        if ( withColorStops )
        {
            s2 = s.substr( end );
            if ( m2 = s2.match(Color.colorstopRE) )
            {
                c.colorStop( m2[1] );
                end2 = m2[0].length;
            }
        }
        return onlyColor ? c : [c, 0, end+end2];
    }
    if ( 'keyword' == parsed || 
        ( !parsed && (m = s.match(Color.keywordRE)) ) 
    )
    {
        // keyword
        if ( 'keyword' == parsed )
        {
            var col = s[0];
        }
        else
        {
            end = m[0].length;
            end2 = 0;
            var col = m[1];
        }    
            
        c = new Color().fromKeyword(col);

        if ( withColorStops )
        {
            s2 = s.substr( end );
            if ( m2 = s2.match(Color.colorstopRE) )
            {
                c.colorStop( m2[1] );
                end2 = m2[0].length;
            }
        }
        return onlyColor ? c : [c, 0, end+end2];
    }
    return null;
};
Color.get = function(s, withColorStops, parsed) {
    return Color.parse(s, withColorStops, parsed, 1);
};
//
// instance
Color.prototype = {
    
    constructor: Color,
    
    col: null,
    cstop: null,
    kword: null,
    
    clone: function() {
        var c = new Color();
        c.col = this.col.slice();
        c.cstop = this.cstop+'';
        c.kword = this.kword;
        return c;
    },
    
    reset: function() {
        this.col = [0, 0, 0, 1];
        this.cstop = '';
        this.kword = null;
        return this;
    },
    
    set: function(color, cstop) {
        if ( color )
        {
            if ( undef !== color[0] )
                this.col[0] = clamp(color[0], 0, 255);
            if ( undef !== color[1] )
                this.col[1] = clamp(color[1], 0, 255);
            if ( undef !== color[2] )
                this.col[2] = clamp(color[2], 0, 255);
            if ( undef !== color[3] )
                this.col[3] = clamp(color[3], 0, 1);
            else
                this.col[3] = 1;
                
            if (cstop)
                this.cstop = cstop;
                
            this.kword = null;
        }
        return this;
    },
    
    colorStop: function(cstop) {
        this.cstop = cstop;
        return this;
    },
    
    isTransparent: function() {
        return 1 > this.col[3];
    },
    
    isKeyword: function() {
        return this.kword ? true : false;
    },
    
    fromKeyword: function(kword) {
        
        kword = kword.toLowerCase();
        if ( Color.Keywords[kword] )
        {
            this.col = Color.Keywords[kword].slice();
            this.kword = kword;
        }
        return this;
    },
    
    fromHEX: function(hex) {
        
        this.col[0] = hex[0] ? clamp(parseInt(hex[0], 10), 0, 255) : 0;
        this.col[1] = hex[1] ? clamp(parseInt(hex[1], 10), 0, 255) : 0;
        this.col[2] = hex[2] ? clamp(parseInt(hex[2], 10), 0, 255) : 0;
        this.col[3] = undef!==hex[3] ? clamp(parseInt(hex[3], 10)/255, 0, 1) : 1;
        
        this.kword = null;
        
        return this;
    },
    
    fromRGB: function(rgb) {
        
        this.col[0] = rgb[0] ? clamp(round(rgb[0]), 0, 255) : 0;
        this.col[1] = rgb[1] ? clamp(round(rgb[1]), 0, 255) : 0;
        this.col[2] = rgb[2] ? clamp(round(rgb[2]), 0, 255) : 0;
        this.col[3] = undef!==rgb[3] ? clamp(rgb[3], 0, 1) : 1;
        
        this.kword = null;
        
        return this;
    },
    
    fromHSL: function(hsl) {
        var rgb = hsl2rgb(hsl[0]||0, hsl[1]||0, hsl[2]||0);
        
        this.col[0] = rgb[0];
        this.col[1] = rgb[1];
        this.col[2] = rgb[2];
        this.col[3] = undef!==hsl[3] ? clamp(hsl[3], 0, 1) : 1;
        
        this.kword = null;
        
        return this;
    },
    
    toKeyword: function(asString, withTransparency) {
        if ( this.kword )
            return this.kword;
        else
            return this.toHEX(1, 1, withTransparency);
    },
    
    toHEX: function(asString, condenced, withTransparency) {
        if ( withTransparency )
            return rgb2hexIE( this.col[0], this.col[1], this.col[2], clamp(round(255*this.col[3]), 0, 255) );
        else
            return rgb2hex( this.col[0], this.col[1], this.col[2], condenced );
    },
    
    toRGB: function(asString, noTransparency) {
        if ( asString )
        {
            if ( noTransparency || 1 == this.col[3] )
                return 'rgb(' + this.col.slice(0, 3).join(',') + ')';
            else
                return 'rgba(' + this.col.join(',') + ')';
        }
        else
        {
            if ( noTransparency )
                return this.col.slice(0, 3);
            else
                return this.col.slice();
        }
    },
    
    toHSL: function(asString, noTransparency) {
        var hsl = rgb2hsl(this.col[0], this.col[1], this.col[2]);
        if ( asString )
        {
            if ( noTransparency || 1 == this.col[3] )
                return 'hsl(' + [hsl[0], hsl[1]+'%', hsl[2]+'%'].join(',') + ')';
            else
                return 'hsla(' + [hsl[0], hsl[1]+'%', hsl[2]+'%', this.col[3]].join(',') + ')';
        }
        else
        {
            if ( noTransparency )
                return hsl;
            else
                return hsl.concat( this.col[3] );
        }
    },
    
    toColorStop: function(compatType) {
        var cstop = this.cstop;
        if ( compatType )
        {
            cstop = cstop.length ? (cstop+',') : '';
            if ( 1 > this.col[3] )
                return 'color-stop(' + cstop + this.toRGB(1) + ')';
            else
                return 'color-stop(' + cstop + this.toHEX(1,1) + ')';
        }
        else
        {
            cstop = cstop.length ? (' '+cstop) : '';
            if ( 1 > this.col[3] )
                return this.toRGB(1) + cstop;
            else
                return this.toHEX(1,1) + cstop;
        }
    },
    
    toString: function( format, condenced ) {
        format = format ? format.toLowerCase() : 'hex';
        if ( 'rgb' == format || 'rgba' == format )
        {
            return this.toRGB(1, 'rgb' == format);
        }
        else if ( 'hsl' == format || 'hsla' == format )
        {
            return this.toHSL(1, 'hsl' == format);
        }
        else if ( 'keyword' == format )
        {
            return this.toKeyword(1);
        }
        return this.toHEX(1, false!==condenced, 'hexie' == format);
    }
};

//
// CSS Angle
var Angle = CSSMin.Angle = function(a, unit, legacy) {
    this.a = 0;
    this.set(a, unit, legacy);
};
var DEG2RAD = Angle.DEG2RAD = Math.PI / 180;
var GRAD2RAD = Angle.GRAD2RAD = Math.PI / 200;
var TURN2RAD = Angle.TURN2RAD = 2*Math.PI;
var RAD2DEG = Angle.RAD2DEG = 180 / Math.PI;
var RAD2GRAD = Angle.RAD2GRAD = 200 / Math.PI;
var RAD2TURN = Angle.RAD2TURN = 0.5 / Math.PI;
Angle.compatOffset = 0.5*Math.PI;
Angle.angleRE = /^(-?\d+(\.\d+)?)(deg|rad|grad|turn)\b/i;
Angle.parse = function(s, onlyAngle) {
    var m, a;
    
    if ( m = s.match(Angle.angleRE) )
    {
        a = new Angle(parseFloat(m[1], 10), m[3]);
        return onlyAngle ? a : [a, 0, m[0].length];
    }
    return null;
};
Angle.prototype = {
    constructor: Angle,
    
    a: 0,
    
    set: function(a, unit, legacy) {
        unit = unit ? unit.toLowerCase() : null;
        
        if ( 'deg' == unit )
            a *= DEG2RAD;
        else if ( 'grad' == unit )
            a *= GRAD2RAD;
        else if ( 'turn' == unit )
            a *= TURN2RAD;
        
        this.a = a;
        
        return this;
    },
    
    toString: function( unit, legacy ) {
        unit = unit ? unit.toLowerCase() : 'rad';
        var a = this.a;
        
        if ( legacy )
        {
            // w3c 0 angle is NORTH, "left-handed"
            // legacy 0 angle is EAST, "right-handed"
            // https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
            a = Angle.compatOffset - a;
        }
        if ( 'deg' == unit )
            return round(a*RAD2DEG)+'deg';
        else if ( 'grad' == unit )
            return (a*RAD2GRAD)+'grad';
        else if ( 'turn' == unit )
            return (a*RAD2TURN)+'turn';
        return (a)+'rad';
    }
};

//
// CSS Gradient utils
var Gradient = CSSMin.Gradient = {
    
    dirRE : /^(to\s+((top|bottom)\b)?(\s*)((left|right)\b)?)/i,
    
    parseDirection : function(s) {
        var m;
        
        if ( m = Angle.parse(s) )
        {
            return m;
        }
        if ( m = s.match(Gradient.dirRE) )
        {
            return [[m[1], m[3], m[6]], 0, m[0].length];
        }
        
        return null;
    },
    /*
    parsePositions : function(s) {
        [ circle               || <length> ]                     [ at <position> ]? , | 
        /(\(\s*)(circle\b|\d+[a-z]{0,3})\s+(center\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})/i
        [ ellipse              || [<length> | <percentage> ]{2}] [ at <position> ]? , |
        /(\(\s*)(ellipse\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})\s+(center\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})/i
        [ [ circle | ellipse ] || <extent-keyword> ]             [ at <position> ]? , |
        /(\(\s*)(circle\b|ellipse\b|closest-corner\b|closest-side\b|farthest-corner\b|farthest-side\b)\s+(center\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})/i
                                                                   //at <position>
                                                                   
        /(\(\s*)(center\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})/i
        
        var m;
        if ( m = s.match(/(\(\s*)(circle\b|\d+[a-z]{0,3})\s+(center\b|\d+[a-z]{0,3}\s+\d+[a-z]{0,3})/i) )
        {
            return [m.index+m[1].length, m[2].length, m[2], m[5], m[9]];
        }
        return null;
    },
    */
    getDirection : function(dir, type) {
        var d1, d2;
        
        if ( !dir ) return dir;
        
        if ( dir instanceof Angle )
            return (type) ? dir.toString('deg', 1) : dir.toString('deg');
        
        if ( type )
        {
            d1 = dir[1];
            d2 = dir[2];
            
            if ( 'top' == d1 && !d2 )
                return ( 2 == type ) ? 'left bottom, left top' : 'bottom';
            else if ( 'bottom' == d1 && !d2 )
                return ( 2 == type ) ? 'left top, left bottom' : 'top';
            else if ( 'left' == d2 && !d1 )
                return ( 2 == type ) ? 'right top, left top' : 'right';
            else if ( 'right' == d2 && !d1 )
                return ( 2 == type ) ? 'left top, right top' : 'left';
            else if ( 'top' == d1 && 'right' == d2 )
                return ( 2 == type ) ? 'left bottom, right top' : 'bottom left';
            else if ( 'bottom' == d1 && 'right' == d2 )
                return ( 2 == type ) ? 'left top, right bottom' : 'top left';
            else if ( 'bottom' == d1 && 'left' == d2 )
                return ( 2 == type ) ? 'right top, left bottom' : 'top right';
            else if ( 'top' == d1 && 'left' == d2 )
                return ( 2 == type ) ? 'right bottom, left top' : 'bottom right';
        }
        return dir[0];
    }
};


/**
*
*    CSSMin main Processor Class
*
**/
var Processor = CSSMin.Processor = function() {
    this.enc = 'utf8'; 
    this.basepath = null; 
    this.input = false; 
    this.output = false; 
    
    this.convertHSLA2RGBA = false;
    this.convertRGB2HEX = false;
    
    this.embedImports = false; 
    this.embedImages = false; 
    this.embedFonts = false; 
    
    this.removeComments = false;
    this.vendorPrefixes = false;
    this.applyPolyfills = false;
    
    this.doMinify = true;
};
Processor.prototype = {
   
    constructor: Processor,
    
    enc: 'utf8',
    basepath: null,
    input: false,
    output: false,
    
    convertHSLA2RGBA: false,
    convertRGB2HEX: false,
    
    embedImports: false,
    embedImages: false,
    embedFonts: false,
    
    removeComments: false,
    vendorPrefixes: false,
    applyPolyfills: false,
    
    doMinify: true,
    
    realPath: function(file, bpath)  {
        bpath = bpath || this.basepath;
        if ( bpath ) return joinPath(bpath, file); 
        else return file;
    },
    
    //
    // adapted from node-commander package
    // https://github.com/visionmedia/commander.js/
    //
    parseArgs: function(args) {
        var 
            Flags = {}, Options = {},  Params = [],
            optionname = '',  argumentforoption = false,
            arg,   index,  i, len
        ;
        
        args = args || process.argv;
        // remove firt 2 args ('node' and 'this filename')
        args = args.slice(2);
        
        for (i = 0, len = args.length; i < len; ++i) 
        {
            arg = args[i];
            if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) 
            {
                arg.slice(1).split('').forEach(function(c){
                    Flags[c] = true;
                });
                argumentforoption = false;
            }
            /*/^--/.test(arg)*/
            else if (startsWith(arg, '--'))
            {
                index = arg.indexOf('=');
                if (~index)
                {
                    optionname = arg.slice(2, index);
                    Options[optionname] = arg.slice(index + 1);
                    argumentforoption = false;
                }
                else
                {
                    optionname = arg.slice(2);
                    Options[optionname] = true;
                    argumentforoption = true;
                }
            } 
            else 
            {
                if (argumentforoption)
                {
                    Options[optionname] = arg;
                }
                else
                {
                    Params.push(arg);
                }
                argumentforoption = false;
            }
        }
        
        return {flags: Flags, options: Options, params: Params};
    },

    parse: function()  {
        var args, parsedargs;
        
        parsedargs = this.parseArgs(process.argv);
        args = extend({
            'help' : false,
            'basepath' : false,
            'input' : false,
            'output' : false,
            'hsla2rgba' : false,
            'rgb2hex' : false,
            'embed-imports' : false,
            'embed-images' : false,
            'embed-fonts' : false,
            'remove-comments' : false,
            'vendor-prefixes' : false,
            'apply-polyfills' : false,
            'no-minify' : false
            }, parsedargs.options);
        
        // if help is set, or no dependencis file, echo help message and exit
        if (parsedargs.flags['h'] || args['help'] || !args['input'] || !args['input'].length)
        {
            echo ("usage: "+THISFILE+" [-h] [--no-minify] [--remove-comments] [--vendor-prefixes] [--apply-polyfills] [--hsla2rgba] [--rgb2hex] [--embed-images] [--embed-fonts] [--embed-imports] [--basepath=PATH] [--input=FILE] [--output=FILE]");
            echo ();
            echo ("Process and Minify CSS Files (v. "+CSSMin.VERSION+")");
            echo ();
            echo ("optional arguments:");
            echo ("  -h, --help              show this help message and exit");
            echo ("  --input=FILE            input file (REQUIRED)");
            echo ("  --output=FILE           output file (OPTIONAL)");
            echo ("  --vendor-prefixes       whether to add/fix vendor prefixes in css (default false)");
            echo ("  --apply-polyfills       whether to apply fallback polyfills (eg for gradients) in css (default false)");
            echo ("  --hsla2rgba             whether to convert hsl(a) colors to rgb(a) colors (default false)");
            echo ("  --rgb2hex               whether to convert rgb colors to hex colors (default false)");
            echo ("  --embed-images          whether to embed images in the css (default false)");
            echo ("  --embed-fonts           whether to embed fonts in the css (default false)");
            echo ("  --embed-imports         TODO, whether to embed css files added with @import (default false)");
            echo ("  --remove-comments       whether to remove css comments (default false)");
            echo ("  --no-minify             whether to bypass minification of the css (default false)");
            echo ("  --basepath=PATH         file base path (OPTIONAL)");
            echo ();
            
            exit(1);
        }
        
        if ( args['basepath'] )
            this.basepath = args['basepath'];
        else
            // get real-dir of input file
            this.basepath = dirname( realpath( args['input'] ) ).replace( /[/\\]+$/, "" ) + DS;
        
        this.input = args['input'];
        this.output = (args['output']) ? args['output'] : false;
        
        this.convertHSLA2RGBA = (args['hsla2rgba']) ? true : false;
        this.convertRGB2HEX = (args['rgb2hex']) ? true : false;
        this.embedImports = (args['embed-imports']) ? true : false;
        this.embedImages = (args['embed-images']) ? true : false;
        this.embedFonts = (args['embed-fonts']) ? true : false;
        this.removeComments = (args['remove-comments']) ? true : false;
        this.vendorPrefixes = (args['vendor-prefixes']) ? true : false;
        this.applyPolyfills = (args['apply-polyfills']) ? true : false;
        this.doMinify = (args['no-minify']) ? false : true;
    },

    convert_hsl2rgb: function(css) {
        var rx = CSSMin.Config.Regex.hsla, m, hsl, rgb;
        
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) 
        {
            hsl = Color.get( [ m[1], m[2] ], 0, 'hsl' );
            rgb = hsl.toString('rgba');
            //css = str_replace(m[0], rgb, css);
            css = css.slice(0, m.index) + rgb + css.slice(m.index+m[0].length);
            rx.lastIndex = m.index + rgb.length;
        }
        return css;
    },
    
    convert_rgb2hex: function(css, force) {
        var rx = CSSMin.Config.Regex.rgba, m, rgb, hex;
        
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) 
        {
            rgb = Color.get( [ m[1], m[2] ], 0, 'rgb' );
            if ( force || !rgb.isTransparent() )
            {
                hex = rgb.toString('hex');
                //css = str_replace(m[0], hex, css);
                css = css.slice(0, m.index) + hex + css.slice(m.index+m[0].length);
                rx.lastIndex = m.index + hex.length;
            }
        }
        
        return css;
    },
    
    remove_comments: function(css) {
        // """Remove all CSS comment blocks."""
        
        var iemac = false;
        var preserve = false;
        var comment_start = css.indexOf ("/*" ), comment_end;
        while (comment_start > -1)
        {
            // Preserve comments that look like `/*!...*/` or `/**...*/`.
            // Slicing is used to make sure we don"t get an IndexError.
            preserve = false; //(css[comment_start + 2] /*$comment_start + 3*/ == "!")||(css[comment_start + 2] /*$comment_start + 3*/ == "*");
            
            comment_end = css.indexOf( "*/", comment_start + 2 );
            if (comment_end<0)
            {
                if (!preserve)
                {
                    css = css.substr( 0, comment_start );
                    break;
                }
            }
            else if (comment_end >= (comment_start + 2))
            {
                if (css[comment_end - 1] == "\\")
                {
                    // This is an IE Mac-specific comment; leave this one and the
                    // following one alone.
                    comment_start = comment_end + 2;
                    iemac = true;
                }
                else if (iemac)
                {
                    comment_start = comment_end + 2;
                    iemac = false;
                }
                else if (!preserve)
                {
                    css = css.substr( 0, comment_start ) + css.substr( comment_end + 2 );
                }
                else
                {
                    comment_start = comment_end + 2;
                }
            }
            comment_start = css.indexOf( "/*", comment_start );
        }
        return css;
    },

    pseudoclasscolon: function(css) {
        
        /**
        """
        Prevents 'p :link' from becoming 'p:link'.
        
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
        translated back again later.
        """
        **/
        
        var rx = CSSMin.Config.Regex.pseudoclasscolon, m, rep;
        rx.lastIndex = 0;
        while ( m = rx.exec(css) )
        {
            rep = m[0].split( ":" ).join( "___PSEUDOCLASSCOLON___" );
            //css = str_replace(m[0], rep, css);
            css = css.slice(0, m.index) + rep + css.slice(m.index+m[0].length);
            rx.lastIndex = m.index + rep.length;
        }
        return css;
    },
        
    remove_unnecessary_whitespace: function(css)  {
        // """Remove unnecessary whitespace characters."""
        
        css = this.pseudoclasscolon( css );
        // Remove spaces from before things.
        css = css.replace(CSSMin.Config.Regex.whitespace_start, '$1');
        
        // Put the space back in for a few cases, such as `@media screen` and
        // `(-webkit-min-device-pixel-ratio:0)`.
        css = css.replace(CSSMin.Config.Regex.and, "and (");
        
        // Put the colons back.
        css = str_replace('___PSEUDOCLASSCOLON___', ':', css);
        
        // Remove spaces from after things.
        css = css.replace(CSSMin.Config.Regex.whitespace_end, '$1');
        
        return css;
    },

    remove_unnecessary_semicolons: function(css) {
        // """Remove unnecessary semicolons."""
        
        return css.replace(CSSMin.Config.Regex.semi, "}");
    },

    remove_empty_rules: function(css)  {
        // """Remove empty rules."""
        
        return css.replace(CSSMin.Config.Regex.empty, '');
    },
    
    condense_zero_units: function(css) {
        // """Replace `0(px, em, %, etc)` with `0`."""
        
        return css.replace(CSSMin.Config.Regex.zero_units, '$1$2');
    },

    condense_multidimensional_zeros: function(css) {
        // """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
        
        css = str_replace(":0 0 0 0;", ":0;", css);
        css = str_replace(":0 0 0;", ":0;", css);
        css = str_replace(":0 0;", ":0;", css);
        
        // Revert `background-position:0;` to the valid `background-position:0 0;`.
        css = str_replace("background-position:0;", "background-position:0 0;", css);
        
        return css;
    },

    condense_floating_points: function(css) {
        // """Replace `0.6` with `.6` where possible."""
        
        return css.replace(CSSMin.Config.Regex.floating_points, '$1.$2');
    },

    condense_hex_colors: function(css) {
        // """Shorten colors from #AABBCC to #ABC where possible."""
        
        var rx = CSSMin.Config.Regex.hex_color,  m, first, second, rep;
        rx.lastIndex = 0;
        while ( m = rx.exec(css) )
        {
            first = m[3] + m[5] + m[7];
            second = m[4] + m[6] + m[8];
            if ( first.toLowerCase() == second.toLowerCase() )
            {
                rep = m[1] + m[2] + '#' + first.toLowerCase();
                //css = str_replace(m[0], rep, css);
                css = css.slice(0, m.index) + rep + css.slice(m.index+m[0].length);
                rx.lastIndex = m.index + rep.length;
            }
        }
        return css;
    },

    condense_whitespace: function(css) {
        // """Condense multiple adjacent whitespace characters into one."""
        
        return css.replace(CSSMin.Config.Regex.space, " ");
    },

    condense_semicolons: function(css) {
        // """Condense multiple adjacent semicolon characters into one."""
        
        return css.replace(CSSMin.Config.Regex.semicolons, ";");
    },

    wrap_css_lines: function(css, line_length) {
        // """Wrap the lines of the given CSS to an approximate length."""
        
        var lines = [], line_start = 0, str_len = css.length, i, ch;
        for (i=0; i<str_len; i++)
        {
            ch = css[i];
            // It's safe to break after `}` characters.
            if ( '}' == ch && (i - line_start >= line_length) )
            {
                lines.push( css.substr(line_start, i + 1) );
                line_start = i + 1;
            }
        }
        if ( line_start < str_len ) lines.push( css.substr( line_start ) );
        
        return lines.join("\n");
    },
    
    extract_urls: function(css) {
        // handle (relative) image/font urls in CSS
        var rx = CSSMin.Config.Regex.url, urls = [], tmp = [], m;
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) tmp.push( m[1] );
        
        if ( tmp.length )
        {
            for (var i=0, l=tmp.length; i<l; i++)
            {
                m = trim( trimd( trim( tmp[i] ), '\'"') );
                
                if ( isRelativePath( m ) ) urls.push( m );
            }
        }
        return urls;
    },
    
    embed_images: function(css, urls) {
        var imgs = {'gif':1, 'png':1, 'jpg':1, 'jpeg':1},
            replace = {}, i, url, urlsLen = urls.length, ext, path, inline
        ;
        for (i=0; i<urlsLen; i++)
        {
            url = urls[i];
            if ( replace[url] ) continue;
            
            ext = url.split(".").pop().toLowerCase();
            
            if ( imgs[ext] )
            {
                path = this.realPath(url);
                // convert binary data to base64 encoding
                inline = base64_encode2( fs.readFileSync( path ) );
                
                // gif
                if ( 'gif' == ext )
                    inline = 'data:image/gif;base64,'+inline;
                
                // png
                else if ( 'png' == ext )
                    inline = 'data:image/png;base64,'+inline;
                
                // jpg/jpeg
                else
                    inline = 'data:image/jpeg;base64,'+inline;
                
                css = str_replace(url, inline, css);
                
                replace[url] = 1;
            }
        }
        return css;
    },

    embed_fonts: function(css, urls) {
        var fonts = {'svg':1, 'ttf':1, 'eot':1, 'woff':1},
            replace = {}, idpos, id, i, fonturl, url, urlsLen = urls.length, ext, path, inline
        ;
        for (i=0; i<urlsLen; i++)
        {
            url = urls[i];
            idpos = url.indexOf('#');
            id = (idpos>-1) ? url.substr(idpos) : '';
            fonturl = (idpos>-1) ? url.substr(0, idpos) : url;
            
            if ( replace[fonturl] ) continue;
            
            ext = fonturl.split(".").pop().toLowerCase();
            
            if ( fonts[ext] )
            {
                path = this.realPath(fonturl);
                // convert binary data to base64 encoding
                inline = base64_encode2( fs.readFileSync( path ) );
                
                // svg
                if ( 'svg' == ext )
                    inline = 'data:font/svg;charset=utf-8;base64,'+inline;
                
                // ttf
                else if ( 'ttf' == ext )
                    inline = 'data:font/ttf;charset=utf-8;base64,'+inline;
                
                // eot
                else if ( 'eot' == ext )
                    inline = 'data:font/eot;charset=utf-8;base64,'+inline;
                
                // woff
                else
                    inline = 'data:font/woff;charset=utf-8;base64,'+inline;
                
                css = str_replace(url, inline + id, css);
                
                replace[fonturl] = 1;
            }
        }
        return css;
    },

    embed_imports: function(css) {
        // todo
        return css;
    },
    
    remove_multiple_charset: function(css) {
        var rx = CSSMin.Config.Regex.charset, charset = null, times = 0, m;
        rx.lastIndex = 0;
        while ( m = rx.exec(css) )
        {
            times++;
            if ( 1 == times) charset = m[0];
            //css = str_replace(m[0], ' ', css);
            css = css.slice(0, m.index) + ' ' + css.slice(m.index+m[0].length);
            rx.lastIndex = m.index+1;
        }
        
        if (charset)
            css = charset + "\n" + css;
        
        return css;
    },
    
    vendor_prefix_values: function(val, prefix1, pre1) {
        var vendor = CSSMin.Config.Vendor, prefixes = vendor['prefixes'], prefix,
            values = vendor['values'], valprefixes,
            v, rx, rv = {}, m, i, id, rep
        ;
        i = 0;
        rx = CSSMin.Config.Vendor.Regex['values'];
        rx.lastIndex = 0;
        while ( m = rx.exec(val) )
        {
            v = m[3].toLowerCase();
            valprefixes = values[v];
            if ( prefix1 & valprefixes )
            {
                i++;
                prefix = prefixes[pre1][1];
                id = '__[[value_'+i+']]__';
                rep = m[1] + m[2] + id + m[4];
                //val = str_replace(m[0], rep + ' ', val);
                val = val.slice(0, m.index) + rep + ' ' + val.slice(m.index+m[0].length);
                rv[id] = prefix + m[3];
                rx.lastIndex = m.index + rep.length;
            }
        }
        return str_replace(rv, val);
    },
    
    vendor_prefix_explicit: function(css) {
        var vendor = CSSMin.Config.Vendor, prefixes = vendor['prefixes'], prefix,
            expl = vendor['explicit'], rx, m, p, i,
            explprefixes, prefixed, replacements = {}, id, rep,
            pre, prel = prefixes.length
        ;
        i = 0;
        rx = CSSMin.Config.Vendor.Regex['explicit'];
        rx.lastIndex = 0;
        while ( m = rx.exec(css) )
        {
            p = m[4].toLowerCase();
            explprefixes = expl[p];
            css = css.split( m[0] );
            prefixed = [];
            for (pre=0; pre<prel; pre++)
            {
                prefix = prefixes[pre][0];
                if ( prefix & explprefixes )
                    prefixed.push( m[2] + prefixes[pre][1] + ':' + m[5] + ';' );
            }
            prefixed.push( m[2] + p + ':' + m[5] + m[6] );
            i++;
            id = '__[[explicit_'+i+']]__';
            rep = m[1] + id;
            if ( '}'==m[6] )
                css = css.join( rep );
            else
                css = css.join( rep + ';');
            replacements[id] = prefixed.join("\n");
            rx.lastIndex = m.index + rep.length;
        }
        return [css, replacements];
    },
    
    vendor_prefix_properties: function(css, prefix1, pre1) {
        var vendor = CSSMin.Config.Vendor, prefixes = vendor['prefixes'], prefix,
            propprefixes, props = vendor['properties'], rx, m, p, i,
            prefixed, replacements = {}, id, rep,
            pre, prel = prefixes.length
        ;
        i = 0;
        rx = CSSMin.Config.Vendor.Regex['properties'];
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) 
        {
            p = m[4].toLowerCase();
            propprefixes = props[p];
            css = css.split( m[0] );
            prefixed = [];
            if ( prefix1 && (prefix1 & propprefixes) )
            {
                prefixed.push( m[2] + prefixes[pre1][1] + p + ':' + this.vendor_prefix_values(m[5], prefix1, pre1) + m[6] );
            }
            else
            {
                for (pre=0; pre<prel; pre++)
                {
                    prefix = prefixes[pre][0];
                    if ( prefix & propprefixes)
                    {
                        prefixed.push( m[2] + prefixes[pre][1] + p + ':' + this.vendor_prefix_values(m[5], prefix, pre) + ';' );
                    }
                }
                prefixed.push( m[2] + p + ':' + m[5] + m[6] );
            }
            i++;
            id = '__[[property_'+i+']]__';
            rep = m[1] + id;
            if ( '}'==m[6] )
                css = css.join( rep );
            else
                css = css.join( rep + ';');
            replacements[id] = prefixed.join("\n");
            rx.lastIndex = m.index + rep.length;
        }
        return [css, replacements];
    },
    
    vendor_prefix_atrules: function(css) {
        var vendor = CSSMin.Config.Vendor, prefixes = vendor['prefixes'], prefix,
            atruleprefixes, atrules = vendor['atrules'], 
            rx, m, p, i, prefixed, replacements = {},
            braces, start, start2,lent, ch, p2, id, rep, 
            at_rule, at_rule_name, at_rule_body, at_rule_body_p, at_rule_body_replace, res,
            has_properties = vendor['properties'] ? 1 : 0,
            pre, prel = prefixes.length
        ;
        i = 0;
        rx = CSSMin.Config.Vendor.Regex['atrules'];
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) 
        {
            p = m[4].toLowerCase();
            atruleprefixes = atrules[p];
            braces = 1; 
            start = m.index + m[1].length + m[2].length; 
            start2 = start + m[3].length; 
            lent = 0; 
            while ( braces )
            {
                ch = css[start2 + lent++];
                if ('{' == ch) braces++;
                else if ('}' == ch) braces--;
            }
            
            at_rule = css.substr(start, m[3].length+lent);
            at_rule_name = m[5];
            at_rule_body = css.substr(start+ m[3].length, lent-1);
            css = css.split( at_rule );
            prefixed = [];
            for (pre=0; pre<prel; pre++)
            {
                prefix = prefixes[pre][0];
                
                if ( prefix & atruleprefixes )
                {
                    at_rule_body_p = at_rule_body + '';
                    if ( has_properties )
                    {
                        res = this.vendor_prefix_properties(at_rule_body_p, prefix, pre);
                        at_rule_body_p = res[0];
                        at_rule_body_replace = res[1];
                        for (p2 in at_rule_body_replace)
                        {
                            at_rule_body_p = at_rule_body_p.split( p2 ).join( at_rule_body_replace[p2] );
                        }
                    }
                    prefixed.push( '@' + prefixes[pre][1] + p + ' ' + at_rule_name + ' {' + at_rule_body_p + ' }' );
                }
            }
            prefixed.push( '@' + p + ' ' + at_rule_name + ' {' + at_rule_body + ' }' );
            i++;
            id = '__[[at_rule_'+i+']]__';
            rep = id;
            css = css.join( rep + "\n");
            replacements[id] = prefixed.join("\n");
            rx.lastIndex = m.index + rep.length;
        }
        return [css, replacements];
    },
    
    vendor_prefixes: function(css) {
        var replace_atrules = null, replace_explicit = null,
            replace_properties = null, res, p,
            Vendor = CSSMin.Config.Vendor
        ;
        if ( Vendor['atrules'] )
        {
            res = this.vendor_prefix_atrules(css);
            css = res[0];
            replace_atrules = res[1];
        }
        if ( Vendor['explicit'] )
        {
            res = this.vendor_prefix_explicit(css);
            css = res[0];
            replace_explicit = res[1];
        }
        if ( Vendor['properties'] )
        {
            res = this.vendor_prefix_properties(css);
            css = res[0];
            replace_properties = res[1];
        }
        
        /*
            maybe other polyfills here..
        */
        
        if ( replace_atrules )
            css = str_replace(replace_atrules, css);

        if ( replace_explicit )
            css = str_replace(replace_explicit, css);
        
        if ( replace_properties )
            css = str_replace(replace_properties, css);
        
        if ( replace_atrules || replace_properties || replace_explicit )
            css = this.condense_semicolons(css);
        
        return css;
    },
    
    gradient_polyfills: function(css) {
        var rx = CSSMin.Config.Vendor.Regex['polyfills']['gradient'], 
            m, c, prefix, prop, grad, gradbody, dir, colors, col, polyfills,
            replacements = {}, rep, id, i = 0;
        polyfills = CSSMin.Config.Vendor['polyfills'];
        var leadingSpaceOrCommas = CSSMin.Config.Regex['leadingSpaceOrCommas'];
        
        rx.lastIndex = 0;
        while ( m = rx.exec(css) ) 
        {
            prefix = m[1];
            prop = m[2].toLowerCase();
            grad = m[3].toLowerCase();
            
            // todo
            if ( !polyfills[grad] ) continue;
            
            i++;
            
            gradbody = m[4].replace(/^(\(|\s+)/, '').toLowerCase();
            if ( dir = Gradient.parseDirection( gradbody ) )
            {
                //gradbody = gradbody.substr(0, dir[1]) + "__DIR__" + gradbody.substr(dir[2]);
                gradbody = gradbody.substr(dir[2]);
                dir = dir[0];
            }
            gradbody = gradbody.replace(leadingSpaceOrCommas, '');
            
            col = 0;
            colors = [];
            while ( c = Color.parse( gradbody, 1 ) )
            {
                ++col;
                //gradbody = gradbody.substr(0, c[1]) + "__COLOR"+col+"__" + gradbody.substr(c[2]);
                gradbody = gradbody.substr(c[2]);
                colors.push( c[0] );
                gradbody = gradbody.replace(leadingSpaceOrCommas, '');
            }
            id = '__[[grad_'+i+']]__';
            rep = m[1] + id + ('}'==m[5]?'}':'');
            replacements[id] = [m[0], prefix, prop, grad, gradbody, dir, colors];
            //css = str_replace(m[0], rep, css);
            css = css.slice(0, m.index) + rep + css.slice(m.index+m[0].length);
            rx.lastIndex = m.index + rep.length;
        }
        
        for (id in replacements)
        {
            if ( !HAS.call(replacements, id) ) continue;
            
            var repl = replacements[id], 
                prop = repl[2],
                propspecial = 'background-image' == prop ? 'background-color' : prop,
                grad = repl[3],
                dir = Gradient.getDirection(repl[5]),
                dir1 = Gradient.getDirection(repl[5], 1),
                dir2 = Gradient.getDirection(repl[5], 2),
                colorstops = repl[6].map( function(x){ return x.toColorStop(); } ).join(','),
                colorstops2 = repl[6].map( function(x){ return x.toColorStop(2); } ).join(','),
                colorfirst = repl[6][0].toString('hex'), 
                colorlast = repl[6][repl[6].length-1].toString('hex'),
                polyfill = polyfills[ grad ], 
                rep = []
            ;
            var r = {
                '__PROP__' : prop,
                '__PROPSPECIAL__' : propspecial,
                '__DIR__' : (dir ? (dir+',') : ''),
                '__DIR1__' : (dir1 ? (dir1+',') : ''),
                '__DIR2__' : (dir2 ? (dir2+',') : ''),
                '__COLORSTOPS__' : colorstops,
                '__COLORSTOPS2__' : colorstops2,
                '__COLORFIRST__' : colorfirst,
                '__COLORLAST__' : colorlast
            };
            for (i=0; i<polyfill.length; i++)
            {
                rep.push(polyfill[i].map(function(x){
                    return str_replace(r, x);
                }).join("\n"));
            }
            css = str_replace(id, rep.join("\n"), css);
        }
        return css;
    },

    apply_polyfills: function(css) {
        css = this.gradient_polyfills(css);
        return css;
    },
    
    minify: function(css, wrap, commentsRemoved)  {
        wrap = wrap || null;
        
        if ( !commentsRemoved )
            css = this.remove_comments(css);
        
        css = this.condense_whitespace(css);
        
        // A pseudo class for the Box Model Hack
        // (see http://tantek.com/CSS/Examples/boxmodelhack.html)
        css = str_replace('"\\"}\\""', "___PSEUDOCLASSBMH___", css);
        
        css = this.remove_unnecessary_whitespace(css);
        
        css = this.remove_unnecessary_semicolons(css);
        
        css = this.condense_zero_units(css);
        
        css = this.condense_multidimensional_zeros(css);
        
        css = this.condense_floating_points(css);
        
        css = this.condense_hex_colors(css);
        
        if ( null!==wrap ) css = this.wrap_css_lines(css, wrap);
        
        css = str_replace("___PSEUDOCLASSBMH___", '"\\"}\\""', css);
        
        css = trim( this.condense_semicolons(css) );
        
        return css;
    },
    
    process: function(css, wrap)  {
        var urls;
        
        if ( this.removeComments )
            css = this.remove_comments(css);
        
        // todo
        //if ( this.embedImports )
        //    css = this.embed_imports(css);
    
        css = this.remove_multiple_charset(css);
        
        if ( this.applyPolyfills )
            css = this.apply_polyfills(css);
        
        if ( this.convertHSLA2RGBA )
            css = this.convert_hsl2rgb(css);
        if ( this.convertRGB2HEX )
            css = this.convert_rgb2hex(css);
        
        if ( this.vendorPrefixes )
            css = this.vendor_prefixes(css);
        
        if ( this.doMinify )
        {
            console.log('cssmin minify is ON');
            css = this.minify(css, wrap || null, this.removeComments);
        }
        
        if ( this.embedImages || this.embedFonts )
            urls = this.extract_urls(css);
        if ( this.embedImages )
            css = this.embed_images(css, urls);
        if ( this.embedFonts )
            css = this.embed_fonts(css, urls);
        
        return css;
    }
};

// static
CSSMin.Main = function() {
    var cssmin, css, mincss;
    
    cssmin = new Processor();
    cssmin.parse( );
    if ( cssmin.input )
    {
        css = readFile( cssmin.input, cssmin.enc );
        mincss = cssmin.process( css );
        if ( cssmin.output ) writeFile( cssmin.output, mincss, cssmin.enc );
        else echo( mincss );
    }
};

// if called directly from command-line
if ( isNode && require.main === module ) 
    // run it
    CSSMin.Main();

// export it
return CSSMin;
});