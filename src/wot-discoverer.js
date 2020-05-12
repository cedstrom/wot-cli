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

const ServiceInfo = require('./ServiceInfo')

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

var discoverSSDP = function (query: string) {
    let qs = WOT_SSDP_TYPE;
    if(undefined != query) {
        qs = query;
    }
    getSSDPPeer(function (ssdpPeer: ssdp.Peer) {
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
                const serviceInfo = new ServiceInfo(service.name, service.type.toString());
                console.log(timeString(), "<<< mDNS service found");
                serviceInfo.appendKey("fullname", service.fullname);
                serviceInfo.appendKey("host", service.host);
                serviceInfo.appendKey("if", service.networkInterface);
                serviceInfo.appendKey("address", service.addresses);
                serviceInfo.appendKey("port", service.port);
                if(service.txtRecord != undefined) {
                    serviceInfo.appendKey("txt", service.txtRecord);
                }
                console.log(serviceInfo.prettyPrintString());
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