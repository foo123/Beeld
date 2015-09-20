/* This version is a concept and does not support Common.js just yet */

if(typeof define !== 'function') {
  define = function( deps, definition ) {
    window.dropdown = definition($);
    define = null;
  }
}
/* Work in progress */
define(['jQuery'], function($){

"use strict";
/* main code starts here */

