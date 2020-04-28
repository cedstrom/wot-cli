// @flow
"use strict";

module.exports = class ServiceInfo {
  _name: string;
  _serviceType: string;
  +_time: Date;
  _additonalInformation: Map<string, Object>;

  constructor(name: string, type: string) {
    this._name = name;
    this._serviceType = type;
    this._additonalInformation = new Map();
    this._time = new Date();
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  set serviceType(serviceType: string) {
    this._serviceType = serviceType;
  }

  get serviceType(): string {
    return this._serviceType;
  }

  get timeString(): string {
    return this._time.toTimeString().split(" ")[0];
  }

  appendKey(key: string, value: Object): void {
    let val = this._additonalInformation.get(key);
    if (val == undefined) {
      val = [];
    }
    val = val.concat(value).flat(Infinity);
    this._additonalInformation.set(key, val);
  }

  toJSON(objName: string) : Object {
      var o = {}
      for (var prop in this) {
        //$FlowFixMe
        var value = this[prop];
        prop = prop.substr(1);
        if (value instanceof Map) {
            o[prop] = Array.from(value).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
            }, {});
        } else {
            o[prop] = value;
        }
      }
      return o;
  }

  prettyPrintString(): string {
    return JSON.stringify(this);
  }
};
