/*global require*/
// require in the complete Cesium object and reassign it globally.
// This is meant for use with the Almond loader.
require([
        'Cesium',
		'../js/createHelper'
    ], function(
        Cesium,ECesium) {
    'use strict';
    /*global self,module*/
    if (typeof window !== 'undefined') {
        window.Cesium = Cesium;
		window.ECesium = ECesium;
    } else if (typeof self !== 'undefined') {
        self.Cesium = Cesium;
    } else if(typeof module !== 'undefined') {
        module.exports = Cesium;
    } else {
        console.log('Unable to load Cesium.');
    }
}, undefined, true);
