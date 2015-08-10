"use strict";

module.exports = {
    
    beeld_plugin_minify: function( beelder ) {
        var Beeld = beelder.constructor,
            HAS = 'hasOwnProperty', exec_async = require('child_process').exec,
            write_async = Beeld.Utils.write_async,
            read_async = Beeld.Utils.read_async,
            BEELD_COMPILERS = Beeld.Utils.join_path(Beeld.ROOT, "compilers") + '/'
        ;
        var action_minify = function action_minify( evt ) {
            var compilers = {
                'cssmin': Beeld.Compiler(
                    'CSS Minifier',
                    'node ${COMPILERS}cssmin.js ${EXTRA} ${OPTIONS} --input ${IN}  --output ${OUT}'
                ),
                'uglifyjs': Beeld.Compiler(
                    'Node UglifyJS Compiler',
                    'uglifyjs ${IN} ${OPTIONS} -o ${OUT}'
                ),
                'closure': Beeld.Compiler(
                    'Java Closure Compiler',
                    'java -jar ${COMPILERS}closure.jar ${EXTRA} ${OPTIONS} --js ${IN} --js_output_file ${OUT}'
                ),
                'yui': Beeld.Compiler( 
                    'Java YUI Compressor Compiler',
                    'java -jar ${COMPILERS}yuicompressor.jar ${EXTRA} ${OPTIONS} --type js -o ${OUT}  ${IN}'
                )
                },
                selected,
                params = evt.data.data, 
                options = params.options, 
                data = params.data, 
                current = params.current,
                minify = current.action_cfg
            ;
            
            if ( minify && !!data.src )
            {
                // fix compiler selection
                selected = params.cmd_opts[HAS]('compiler') ? params.cmd_opts.compiler.toLowerCase() : null;
                if ( selected && !compilers[HAS](selected) ) selected = 'uglifyjs';
                
                if ( minify[HAS]('uglifyjs') )
                {
                    // make it array
                    compilers.uglifyjs.option([].concat( minify['uglifyjs'] ).join(" "));
                    if ( !selected ) selected = 'uglifyjs';
                }
                if ( minify[HAS]('closure') )
                {
                    // make it array
                    compilers.closure.option([].concat( minify['closure'] ).join(" "));
                    if ( !selected ) selected = 'closure';
                }
                if ( minify[HAS]('yui') )
                {
                    // make it array
                    compilers.yui.option([].concat( minify['yui'] ).join(" "));
                    if ( !selected ) selected = 'yui';
                }
                if ( minify[HAS]('cssmin') )
                {
                    // make it array
                    compilers.cssmin.option([].concat( minify['cssmin'] ).join(" "));
                    if ( !selected ) selected = 'cssmin';
                }
                
                var cmd, extra = '', selectedCompiler = compilers[selected];
                // use the selected compiler
                if ('cssmin'===selected && 0 > selectedCompiler.options.indexOf("--basepath "))
                {
                    extra = "--basepath "+options.basePath;
                }
                else if ('yui'===selected || 'closure'===selected)
                {
                    extra = "--charset "+options.encoding;
                }
                    
                cmd = selectedCompiler.compiler([
                 ['${COMPILERS}',    BEELD_COMPILERS]
                ,['${EXTRA}',        extra]
                ,['${OPTIONS}',      selectedCompiler.options]
                ,['${IN}',           data.tmp_in]
                ,['${OUT}',          data.tmp_out]
                ]);
                write_async( data.tmp_in, data.src, options.encoding, function( err ){
                    if ( !err )
                    {
                        // add some delay here
                        setTimeout(function(){
                            exec_async(cmd, null, function(err, stdout, stderr) {
                                if ( stderr ) echo_stderr(stderr);
                                if ( !err )
                                {
                                    // add some delay here
                                    setTimeout(function(){
                                        read_async( data.tmp_out, options.encoding, function(err, file_data){
                                            if ( !err )
                                            {
                                                data.src = file_data;
                                                evt.next( );
                                            }
                                            else
                                            {
                                                data.err = 'Error reading minified file';
                                                evt.abort( );
                                            }
                                        });
                                    }, 100);
                                }
                                else
                                {
                                    data.err = 'Error executing "'+cmd+'"';
                                    evt.abort( );
                                }
                            });
                        }, 100);
                    }
                    else
                    {
                        data.err = 'Error writing input file for minification';
                        evt.abort( );
                    }
                });
            }
            else
            {
                evt.next( );
            }
        };
        
        beelder.addAction('minify', action_minify);
    }
};