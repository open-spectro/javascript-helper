'use strict';
var process=require('./process.js');
var Util=require('./util.js');


function absorbance(experiment, reference) {
    var results=new Array(experiment.length);
    for (var i=0; i<experiment.length; i++) {
        results[i]=-Math.log10(experiment[i]/reference[i]);
    }
    return results;
}

function transmittance(experiment, reference) {
    var results=new Array(experiment.length);
    for (var i=0; i<experiment.length; i++) {
        results[i]=experiment[i]/reference[i]*100;
    }
    return results;
}



var difference=['r','q','p','o','n','m','l','k','j','%','J','K','L','M','N','O','P','Q','R'];

function parseData(lines) {
    var y=[];
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
                y.push(currentValue);
            }
        }
    }
    return y;
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
            case 'REF':
                var values=fieldValue.split("/");
                result.nMRed=values[0]>>0;
                result.nMGreen=values[1]>>0;
                result.nMBlue=values[2]>>0;
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

/*
 types are normally: R G B W
 Z (background), E (experimental)
 A: absorbance
 T: transmittance
  */

function convertToObject(spectra) {
    var result={};
    for (var i=0; i<spectra.length; i++) {
        var spectrum=spectra[i];
        result[spectrum.type]=spectrum;
    }
    return result;
}

function addInfo(spectra, info) {
    var info=info || {};
    for (var type in spectra) {
        var spectrum=spectra[type];
        Object.keys(info).forEach(function(key) {
            spectrum.info = spectrum.info || {};
            if (key!=='data') {
                spectrum.info[key]=info[key];
            }
        });
    }
}

function addAbsorbanceTransmittance(spectra) {
    // if we have Z and E we calculate absorbance and transmittance
    if (spectra.Z && spectra.E) {
        var a=JSON.parse(JSON.stringify(spectra.Z));
        a.type="A";
        a.y=absorbance(spectra.E.y, spectra.Z.y);
        spectra.A=a;
        var t=JSON.parse(JSON.stringify(spectra.Z));
        t.type="T";
        t.y=transmittance(spectra.E.y, spectra.Z.y);
        spectra.T=t;
    }
}

function addTabDelimited(spectra) {
    for (var key in spectra) {
        var spectrum = spectra[key];
        spectrum.tab = Util.toXY(spectrum);
    }
}

function addX(spectra) {
    for (var key in spectra) {
        var spectrum=spectra[key];
        var diffPoints=spectrum.redPoint-spectrum.bluePoint;
        var diffNM=(spectrum.nMRed-spectrum.nMBlue)/(diffPoints-1);
        var length=spectrum.y.length;

        // we will add all the color spectrum
        // need to guess the nm of the first point and last point
        var firstNM=spectrum.nMBlue-spectrum.bluePoint*diffNM;
        var lastNM=spectrum.nMRed+(length-spectrum.redPoint)*diffNM;
        spectrum.x=[];
        for (var i=0; i<length; i++) {
            var wavelength=firstNM+(lastNM-firstNM)/(length-1)*i;
            spectrum.x.push(wavelength);
        }
    }
}

module.exports = function (text, options) {
    if (! text) return [];
    var options=Object.create(options || {});
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
            result.y=parseData(lines.slice(1));
            results.push(result);
        }

    }
    var spectra=convertToObject(results);
    addAbsorbanceTransmittance(spectra);
    addInfo(spectra, options.info);
    process(spectra, options);
    addX(spectra);
    addTabDelimited(spectra);

    return spectra;
}