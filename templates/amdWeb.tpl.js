// Uses AMD or browser globals to create a module.

// If you want something that will also work in Node, see returnExports.js
// If you want to support other stricter CommonJS environments,
// or if you need to create a circular dependency, see commonJsStrict.js

// Defines a module "amdWeb" that depends another module called "b".
// Note that the name of the module is implied by the file name. It is best
// if the file name and the exported global have matching names.

// If the 'b' module also uses this type of boilerplate, then
// in the browser, it will create a global .b that is used below.

// If you do not want to support the browser global path, then you
// can remove the `root` use and the passing `this` as the first arg to
// the top function.

(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['b'], factory);
    } else {
        // Browser globals
        root.amdWeb = factory(root.b);
    }
}('undefined' !== typeof self ? self : this, function (b) {
//use b in some fashion.

/* main code starts here */
<% $src %>
/* main code ends here */

return {};
}));
