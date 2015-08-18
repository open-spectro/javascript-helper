'use strict';

var difference=['r','q','p','o','n','m','l','k','j','%','J','K','L','M','N','O','P','Q','R'];

function parseData(lines) {
    var data=[];
    var currentValue=0;
    for (var i=0; i<lines.length; i++) {
        var line=lines[i];
        var fields=lines[i].split(/( ?(?=[a-zA-Z%])| +(?=[^a-zA-Z%]))/);
        for (var j=0; j<fields.length; j++) {
            var field=fields[j];
            if (field.trim().length>0) {
                // we check if we convert the first character
                if (field.match(/^[j-rJ-R%]/)) {
                    var firstChar=field.substring(0,1);
                    var value=difference.indexOf(firstChar)-9;
                    currentValue+=(value+field.substr(1))>>0;
                } else {
                    currentValue=fields[j]>>0;
                }
                data.push(currentValue);
            }
        }
    }
    return data;
}



function parseInfo(info) {
    var result={};
    var fields=info.split(",");
    result.type=fields[0];
    for (var i=1; i<fields.length; i++) {
        var field=fields[i];
        var fieldType=field.replace(/^([A-Z]*)(.*)$/,"$1");
        var fieldValue=field.replace(/^([A-Z]*)(.*)$/,"$2");
        switch(fieldType) {
            case 'I':
                result.intensity=fieldValue>>0;
                result.percentIntensity=Math.round(((fieldValue>>0)/256)*100);
                break;
            case 'RGB':
                var values=fieldValue.split("/");
                result.redPoint=values[0]>>0;
                result.greenPoint=values[1]>>0;
                result.bluePoint=values[2]>>0;
                break;
            case 'BG':
                var values=fieldValue.split("/");
                result.backgroundMin=values[0]>>0;
                result.backgroundMax=values[1]>>0;
                break;
            default:
                result[fieldType]=fieldValue;
        }
    }
    return result;
}

module.exports = function (text) {
    var blocs=text.split(/[\r\n]*>/m);
    var results=[];
    for (var part=0; part<blocs.length; part++) {
        var bloc=blocs[part];
        var result=[];
        var lines=bloc.split(/[\r\n]+/);
        // first line is the info line
        var info=lines[0];
        if (info && info.match(/^[A-Z]/)) {
            var result=parseInfo(info);
            result.data=parseData(lines.slice(1));
            results.push(result);
        }

    }
    return results;
}