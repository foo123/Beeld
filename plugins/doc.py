import re

Beeld = None
def doc(builder, BeeldClass):
    global Beeld
    Beeld = BeeldClass
    builder.addAction('doc', beeld_plugin_action_doc)
    
def beeld_plugin_action_doc(evt):
    global Beeld
    params = evt.data.data
    options = params.options
    data = params.data
    current = params.current
    doc = current.action_cfg
    if doc and ('output' in doc):
        
        docFile = Beeld.Utils.get_real_path(doc['output'], options.basePath)
        startDoc = doc['startdoc']
        endDoc = doc['enddoc']
        
        _trim = None
        _trimlen = 0
        isRegex = 0
        
        sep = doc['separator'] if 'separator' in doc else "\n\n"
            
        if 'trimx' in doc: 
            isRegex = 1
            _trim = re.compile('^' + doc['trimx'])
        elif 'trim' in doc: 
            isRegex = 0
            _trim = doc['trim']
            _trimlen = len(_trim)
            
        
        docs = []
        
        # extract doc blocks
        blocks = data.src.split( startDoc )
        for b in blocks:
            tmp = b.split( endDoc )
            if len(tmp)>1: docs.append( tmp[0] )
        blocks = None
        
        # trim start of each doc block line
        if _trim:
            for i in range(len(docs)-1):
                tmp = docs[i].split( "\n" )
                
                for j in range(len(tmp)-1):
                    if len(tmp[j])>0:
                        if isRegex:
                            tmp[j] = re.sub(_trim, '', tmp[j])
                        elif tmp[j].startswith(_trim):
                            tmp[j] = tmp[j][_trimlen:]
                
                docs[i] = "\n".join( tmp )
        Beeld.Utils.write(docFile, sep.join( docs ), options.encoding)
    
    evt.next()

