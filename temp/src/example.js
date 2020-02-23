//See reference project https://playcanvas.com/project/504134/overview/test-es6

const pc = require("playcanvas");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const Example = pc.createScript('example');

//Extended construction function called even if not enabled
Example.prototype.construct = function () {
    console.log("construct;");
    alert('a');
}

//Support for async functions
Example.prototype.initialize = async function() {
   console.log("INitialize;");
   alert('b');
}

Example.prototype.update = function (dt) {
   
};

