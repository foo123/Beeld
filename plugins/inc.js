"use strict";

module.exports = {

    beeld_plugin_inc: function(beelder) {
        var Beeld = beelder.getClass(),
            rex = /\/\*#ifdef\(([^\(\)]+)\)\*\//gm
        ;
        var action_inc = function action_inc(evt) {
            var params = evt.data,
                data = params.data,
                current = params.current,
                inc = current.action_cfg,
                included, src, len, out, m,
                param, start, end, offset;
            if (inc && inc.length)
            {
                included = String(inc).split(',').map(function(i){return i.trim();});
                // extract conditional include blocks
                src = data.src;
                len = src.length;
                out = '';
                rex.lastIndex = offset = 0;
                while (m=rex.exec(src))
                {
                    out += src.slice(offset, m.index);
                    start = m.index + m[0].length;
                    end = src.indexOf('/*#endif*/', start);
                    offset = -1 !== end ? end+10 : len;
                    if (-1 === end) end = len;
                    rex.lastIndex = offset;
                    param = m[1].trim();
                    if (-1 !== included.indexOf(param)) out += src.slice(start, end);
                }
                if (offset < len) out += src.slice(offset, len);
                data.src = out;
            }
            evt.next();
        };

        beelder.addAction('inc', action_inc);
    }
};
