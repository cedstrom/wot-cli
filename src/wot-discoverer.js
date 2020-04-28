// @flow
"use strict";


/**
 * Created by lba on 07/04/16.
 */
var ssdp = require("peer-ssdp");
var WOT_SSDP_TYPE = "urn:w3c-org:device:Thing:1";
var ssdpPeer = ssdp.createPeer();

const mdns = require('mdns');
const mdnsBrowser = mdns.browseThemAll();
const mdnsServiceMap = new Map()

var timeString = function(){
    return new Date().toTimeString().split(" ")[0];
};

var getSSDPPeer = function (callback) {
    if(ssdpPeer == null){
        ssdpPeer.on("ready", function () {
            console.log(timeString(),"*** wot ssdp discoverer is ready");
            callback && callback(ssdpPeer);
        }).on("notify", function (headers, address) {
            var td = headers['TD.WOT.W3C.ORG'];
            if(headers.NT == WOT_SSDP_TYPE && td){
                if(headers.NTS == ssdp.ALIVE){
                    console.log(timeString(),"<<< Thing with TD <"+td+"> appeared ("+address.address+")");
                }
                else if(headers.NTS == ssdp.BYEBYE){
                    console.log(timeString(),"<<< Thing with TD <"+td+"> disappeared ("+address.address+")");
                }
            }
        }).on("found", function (headers, address) {
            var td = headers['TD.WOT.W3C.ORG'];
            if(headers.ST == WOT_SSDP_TYPE && td){
                console.log(timeString(),"<<< Thing with TD <"+td+"> found ("+address.address+")");
            } else {
                console.log(timeString(),"<<< Queried thing found ("+address.address+")");
                for (let k in headers) {
                    console.log('\t', k + ':' + headers[k]);
                }
            }
        }).on("close", function () {
            console.log(timeString(),"*** wot ssdp discoverer stopped");
        }).start();
    }
    else{
        callback && callback(ssdpPeer);
    }
};

var discoverSSDP = function (query) {
    let qs = WOT_SSDP_TYPE
    if(undefined != query) {
        qs = query;
    }
    getSSDPPeer(function (ssdpPeer) {
        ssdpPeer.search({
            ST: qs
        });
    });
};

var discoverMDNS = function (query) {
    mdnsBrowser.on('serviceUp', service => {
        if(query != undefined) {
            if(query != service.type.toString()) {
                return;
            }
        }
        if(mdnsServiceMap.get() == undefined) {
            const typeBrowser = mdns.createBrowser(service.type);
            mdnsServiceMap.set(service.type.toString(), typeBrowser);
            typeBrowser.on('serviceUp', service => {
                //console.log("service up: ", service);
                console.log(timeString(), "<<< mDNS service found");
                console.log(timeString(), "shortname: ", service.name);
                console.log(timeString(), "fullname: ", service.fullname);
                console.log(timeString(), "host: " + service.host);
                console.log(timeString(), "if: " + service.networkInterface);
                console.log(timeString(), "serviceType: " + service.type.toString());
                service.addresses.forEach(address => {
                    console.log(timeString(), "address: ", address);
                })
                console.log(timeString(), "port: " + service.port);

                if(service.txtRecord != undefined) {
                    console.log(timeString(), "txtRecord");
                    for(let k in service.txtRecord) {
                        console.log("\t", k + ": " + service.txtRecord[k]);
                    }
                }
            });
            typeBrowser.start();
        }
    });
    mdnsBrowser.on('serviceDown', service => {
        console.log("service down: ", service);
        console.log("\t", service.type.toString());
    });
    mdnsBrowser.start();
};

var startDiscovery = function(protocols: Array<string>, query: string){
    if(protocols.indexOf("ssdp") != -1){
        discoverSSDP(query);
    }
    if(protocols.indexOf("mdns") != -1){
        discoverMDNS(query);
    }
};

var stopDiscovery = function (callback: () => void) {
    if(ssdpPeer != null){
        ssdpPeer.on("close", function () {
            callback && callback();
        }).close();
    }

    mdnsBrowser.stop();
    mdnsServiceMap.forEach((v, _) => {
        v.stop();
    });
    if (callback) {
        callback();
    }
};

module.exports.startDiscovery = startDiscovery;
module.exports.stopDiscovery = stopDiscovery;