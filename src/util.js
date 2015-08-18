'use strict';

module.exports.toXY=function(spectrum) {
    var x=spectrum.x;
    var y=spectrum.y;
    var result=[];
    for (var i=0; i< x.length; i++) {
        result.push(x[i]+"\t"+y[i]);
    }
    return result.join('\r\n');
}