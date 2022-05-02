"use strict";

module.exports = {

    beeld_plugin_inc: function(beelder) {
        var ESCAPED_RE = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
            esc_re = function(s) {return s.replace(ESCAPED_RE, "\\$&");}
        ;
        var action_inc = function action_inc(evt) {
            var params = evt.data,
                data = params.data,
                current = params.current,
                inc = current.action_cfg,
                defined, src, slen, out,
                m, p, s, e, el, param,
                start, end, offset, rex;
            if (inc)
            {
                p = String(inc['prefix'] || '');
                s = String(inc['suffix'] || '');
                defined = String(inc['define'] || '').split(',').map(function(i) {return i.trim();});
                rex = new RegExp('^' + esc_re(p) + '#(ifn?def)\\(([^\\(\\)]+)\\)' + esc_re(s), 'gm');
                e = p + '#endif' + s;
                el = e.length;
                src = data.src;
                slen = src.length;
                out = '';
                // extract conditional include blocks
                rex.lastIndex = offset = 0;
                while (m = rex.exec(src))
                {
                    out += src.slice(offset, m.index);
                    start = m.index + m[0].length;
                    end = src.indexOf(e, start);
                    offset = -1 === end ? slen : end+el;
                    if (-1 === end) end = slen;
                    rex.lastIndex = offset;
                    param = m[2].trim();
                    if (
                        ('ifndef' === m[1] && -1 === defined.indexOf(param)) ||
                        ('ifdef' === m[1] && -1 !== defined.indexOf(param))
                    ) out += src.slice(start, end);
                }
                if (offset < slen) out += src.slice(offset, slen);
                data.src = out;
            }
            evt.next();
        };

        beelder.addAction('inc', action_inc);
    }
};
