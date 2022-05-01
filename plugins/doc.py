import re

Beeld = None
def beeld_plugin_doc(beelder):
    global Beeld
    Beeld = beelder.getClass() #BeeldClass
    beelder.addAction('doc', beeld_plugin_action_doc)

def beeld_plugin_action_doc(evt):
    global Beeld
    params = evt.data
    options = params.options
    data = params.data
    current = params.current
    doc = current.action_cfg
    if doc and ('output' in doc):

        doc['output'] = Beeld.Utils.xpresion(doc['output'], evt) # parse xpresion if any
        docFile = Beeld.Utils.get_real_path(Beeld.Utils.evaluate(doc['output'], {}), options.basePath)
        startDoc = doc['startdoc']
        endDoc = doc['enddoc']

        _trim = None
        _trimlen = 0
        isRegex = 0

        sep = doc['separator'] if 'separator' in doc else "\n\n"

        if 'trim' in doc:
            _trim = Beeld.Utils.regex(doc['trim'], evt)
            if _trim is False:
                _trim = doc['trim']
                _trimlen = len(_trim)
                isRegex = 0
            else:
                isRegex = 1


        docs = []

        # extract doc blocks
        blocks = data.src.split(startDoc)
        for b in blocks:
            tmp = b.split(endDoc)
            if len(tmp)>1: docs.append(tmp[0])
        blocks = None

        # trim start of each doc block line
        if _trim:
            for i in range(len(docs)-1):
                tmp = docs[i].split("\n")

                for j in range(len(tmp)-1):
                    if len(tmp[j])>0:
                        if isRegex:
                            tmp[j] = re.sub(_trim, '', tmp[j])
                        elif tmp[j].startswith(_trim):
                            tmp[j] = tmp[j][_trimlen:]

                docs[i] = "\n".join(tmp)
        Beeld.Utils.write(docFile, sep.join(docs), options.encoding)

    evt.next()

