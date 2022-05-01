"use strict";

module.exports = {

    beeld_plugin_doc: function(beelder) {
        var Beeld = beelder.getClass(),
            HAS = Object.prototype.hasOwnProperty,
            write_async = Beeld.Utils.write_async,
            get_real_path = Beeld.Utils.get_real_path,
            regex = Beeld.Utils.regex,
            xpresion = Beeld.Utils.xpresion,
            evaluate = Beeld.Utils.evaluate
        ;
        var action_doc = function action_doc(evt) {
            var params = evt.data,
                options = params.options,
                data = params.data,
                current = params.current,
                doc = current.action_cfg;
            if (doc && HAS.call(doc,'output'))
            {
                doc['output'] = xpresion(doc['output'], evt); // parse xpresion if any
                var docFile = get_real_path(evaluate(doc['output'], {}), options.basePath),
                    docs = [], startDoc = doc['startdoc'], endDoc = doc['enddoc'],
                    isRegex = 0, _trim = null, _trimlen = 0,
                    blocks, i, l, tmp, j, l2, sep
                ;

                sep = HAS.call(doc,'separator') ? doc['separator'] : "\n\n";

                if (HAS.call(doc,'trim'))
                {
                    _trim = regex(doc.trim, evt);
                    if (false === _trim)
                    {
                        _trim = doc.trim;
                        _trimlen = _trim.length;
                        isRegex = 0;
                    }
                    else
                    {
                        isRegex = 1;
                    }
                }

                // extract doc blocks
                blocks = data.src.split(startDoc);
                l = blocks.length;
                for (i=0; i<l; ++i)
                {
                    tmp = blocks[i].split(endDoc);
                    if (tmp.length > 1) docs.push(tmp[0]);
                }
                blocks = null;

                // trim start of each doc block line
                if (_trim)
                {
                    l = docs.length;
                    for (i=0; i<l; ++i)
                    {
                        tmp = docs[i].split("\n");
                        l2 = tmp.length;
                        for (j=0; j<l2; ++j)
                        {
                            if (tmp[j].length)
                            {
                                if (isRegex)
                                {
                                    tmp[j] = tmp[j].replace(_trim, '');
                                }
                                else if (_trim === tmp[j].substr(0, _trimlen))
                                {
                                    tmp[j] = tmp[j].substr(_trimlen);
                                }
                            }
                        }
                        docs[i] = tmp.join("\n");
                    }
                }
                write_async(docFile, docs.join(sep), options.encoding);
            }
            evt.next();
        };

        beelder.addAction('doc', action_doc);
    }
};
