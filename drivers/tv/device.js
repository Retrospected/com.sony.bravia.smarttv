"use strict";

var httpmin = require("http.min");
var ip = require('ip');
var async = require('async');
const Homey = require('homey');
const Commands = require('./commands');

var xmlEnvelope = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>%code%</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';
var foundDevices = [];
var devices = [];
var api_auth_url = 'IRCC';
var extInterval;
var errorMessage;
var counter = 0;
var logs = "";
var failed = 0;
var failedTime = 0;
var now = new Date();
var scriptStarted = now.toJSON();
var net = require("net");
const POLL_INTERVAL = 1000 * 10 //10 seconds

module.exports = class SonyDevice extends Homey.Device {

  async onInit() {
    super.onInit();
    this.settings = await this.updateSettings();

    this.initDevice(this.settings);

    this.registerFlowCards(this.settings["ip"]);
    this.log('Name:', this.getName());
    this.log('Class:', this.getClass());
  }
  async onDeleted () {
    clearInterval(this._pollDeviceInterval);
  }
  async onAdded () {
    Homey.app.log("New device added!");
  }
  async onPairListDevices (socket) {
    socket.on('list_devices', function (data, callback) {
      data = foundDevices;
      foundDevices = [];
      Homey.app.log('list_devices', data);

      async.each(data, function (device, callback) {
        // Call an asynchronous function, often a save() to DB
      }, function () {
        // All tasks are done now
        Homey.app.log('ASYNC:::::callback');
        Homey.app.log(devices);
        // this returns the "devices" to the list_devices view
        callback(null, devices);
        foundDevices = [];
      });
    });
    socket.on('disconnect', function () {
      foundDevices = [];
      Homey.app.log('User aborted pairing, or pairing is finished');
    });
    socket.on('add_device', function (device, callback) {
      Homey.app.log('-------- device added ---------');
      Homey.app.log(device);
      Homey.app.log('-------- device added ---------');
      devices[ device.data.id ] = {
        data: device.data,
        settings: device.settings,
        state: device.state
      }

      Homey.app.log('-------- device added ---------');
      callback(devices, true);
    })
  }

  async getDeviceAvailability(device_data) {
    return new Promise((resolve, reject) => {
      var client = new net.Socket();
      var cancelCheck = setTimeout(function() {
        client.destroy();
        handleOffline();
      }, 3000);

      var handleOnline = function () {
        clearTimeout(cancelCheck);
        client.destroy();
        Homey.app.log("getDeviceAvailability: online");
        resolve();
      };

      var handleOffline = function () {
        clearTimeout(cancelCheck);
        client.destroy();
        Homey.app.log("getDeviceAvailability: offline due to exception");
        reject();
      };

      client.on('error', function (err) {
        if(err && err.errno && err.errno == "ECONNREFUSED") {
          handleOnline();
        }
        else if(err && err.errno && err.errno == "EHOSTUNREACH") {
          handleOffline();
        }
        else if(err && err.errno && err.errno == "ENETUNREACH") {
          console.error("The network that the configured smartphone is on, is not reachable. Are you sure the Homey can reach the configured IP?");
          handleOffline();
        }
        else if(err && err.errno) {
          console.error("ICMP driver can only handle ECONNREFUSED, ENETUNREACH and EHOSTUNREACH, but got "+err.errno);
          handleOffline();
        }
        else {
          console.error("ICMP driver can't handle "+err);
          handleOffline();
        }
      });

      try {
        client.connect(1, device_data["ip"].trim(), function () {
          handleOnline();
        });
      } catch(ex) {
        console.error(ex.message);
        handleOffline();
      }
    });

  }

  async initDevice() {
    Homey.app.log("============ init =============");
    Homey.app.log(this.getSettings());

    // CRON: Create cron task name
    var taskName = 'SBATV_' + this.getSettings()["id"];
    // CRON: unregister task, to force new cron settings
    Homey.app.log('CRON: task "' + taskName + '" registered, every ' + POLL_INTERVAL / 1000 + 'seconds.');
    this._pollDeviceInterval = setInterval(this.pollDevice.bind(this), POLL_INTERVAL);
    this.pollDevice();
  }

  async pollDevice () {
    this.settings = await this.getSettings();
    Homey.app.log(this.settings);
    var alive = false;

    await this.getDeviceAvailability(this.settings)
    .then(function () {
      alive = true;
    })
    .catch(function () {
      alive = false;
    });

    if (alive != this.settings["power"]) {
      if (alive) {
        this.setSettings({"power": true})
        //this.getDriver()._powerOn.trigger(this, null, null);
        this._powerOn.trigger(this, null, null);
      } else {
        this.setSettings({"power": false})
        //this.getDriver()._powerOff.trigger(this, null, null);
        this._powerOff.trigger(this, null, null);
      }
    }
  }

  async updateSettings() {
    let merged   = Object.assign({}, this.getData());
    let settings = this.getSettings();
    Object.keys(settings).forEach(key => {
      if (settings[key]) {
        merged[key] = settings[key];
      }
    });
    await this.setSettings(merged);
    return merged;
  }

  async sendCommand(findCode, ip, sendCode) {
    return new Promise((resolve, reject) => {
      if (typeof (this.settings) !== 'undefined') {

        Homey.app.log("   ");
        Homey.app.log("======= send command! ==========");
        Homey.app.log("sendCommand: sendCode:" + sendCode);
        Homey.app.log("sendCommand: to IP:" + ip);
        var now = new Date();
        var jsonDate = now.toJSON();
        Homey.app.log("sendCommand: Command time:", jsonDate);
        var random = Math.floor(Math.random() * 1000000000);
        var options = {
          uri: 'http://' +ip + '/IRCC',
          timeout: 1000,
          headers: {
            "cache-control": "no-cache",
            "random": random
          },
          request: function (req) {
            req.write(xmlEnvelope.replace("%code%", sendCode))
          }
        }

        httpmin.post(options).then(function (data) {

          var statusCode = data.response.statusCode;
          Homey.app.log("statusCode:", statusCode);
          Homey.app.log("response:", data.data);
          if (statusCode == 200) {
            Homey.app.log("sendCommand: command success");
            resolve();

          } else {
            Homey.app.log("sendCommand: unknown statuscode: " + data.response.statusCode);
            reject(new Error('unknown statuscode'))
          }
        }).catch(function (err) {
          Homey.app.log(error);
          reject(new Error('http error'))
        });
      } else {
        Homey.app.log("sendCommand: device settings undefined");
        reject(new Error('device settings undefined'))
      }
    });
  }

  registerFlowCards(ip) {
    Homey.app.log("IP: "+ip);
    let actionNetflix = new Homey.FlowCardAction('Netflix');
    actionNetflix.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Netflix, args["device"]["settings"]["ip"], Commands.Netflix);
    });

    let actionChannelUp = new Homey.FlowCardAction('ChannelUp');
    actionChannelUp.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.ChannelUp, args["device"]["settings"]["ip"], Commands.ChannelUp);
    });

    let actionChannelDown = new Homey.FlowCardAction('ChannelDown');
    actionChannelDown.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.ChannelDown, args["device"]["settings"]["ip"], Commands.ChannelDown);
    });

    let actionVolumeDown = new Homey.FlowCardAction('VolumeDown');
    actionVolumeDown.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.VolumeDown, args["device"]["settings"]["ip"], Commands.VolumeDown);
    });

    let actionVolumeUp = new Homey.FlowCardAction('VolumeUp');
    actionVolumeUp.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.VolumeUp, args["device"]["settings"]["ip"], Commands.VolumeUp);
    });

    let actionToggleMute = new Homey.FlowCardAction('ToggleMute');
    actionToggleMute.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.ToggleMute, args["device"]["settings"]["ip"], Commands.ToggleMute);
    });

    let actionSetInput = new Homey.FlowCardAction('SetInput');
    actionSetInput.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.SetInput, args["device"]["settings"]["ip"], Commands.SetInput);
    });

    let actionEPG = new Homey.FlowCardAction('EPG');
    actionEPG.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.EPG, args["device"]["settings"]["ip"], Commands.EPG);
    });

    let actionEnter = new Homey.FlowCardAction('Enter');
    actionEnter.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Enter, args["device"]["settings"]["ip"], Commands.Enter);
    });

    let actionNum0 = new Homey.FlowCardAction('Num0');
    actionNum0.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num0, args["device"]["settings"]["ip"], Commands.Num0);
    });

    let actionNum1 = new Homey.FlowCardAction('Num1');
    actionNum1.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num1, args["device"]["settings"]["ip"], Commands.Num1);
    });

    let actionNum2 = new Homey.FlowCardAction('Num2');
    actionNum2.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num2, args["device"]["settings"]["ip"], Commands.Num2);
    });

    let actionNum3 = new Homey.FlowCardAction('Num3');
    actionNum3.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num3, args["device"]["settings"]["ip"], Commands.Num3);
    });

    let actionNum4 = new Homey.FlowCardAction('Num4');
    actionNum4.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num4, args["device"]["settings"]["ip"], Commands.Num4);
    });

    let actionNum5 = new Homey.FlowCardAction('Num5');
    actionNum5.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num5, args["device"]["settings"]["ip"], Commands.Num5);
    });

    let actionNum6 = new Homey.FlowCardAction('Num6');
    actionNum6.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num6, args["device"]["settings"]["ip"], Commands.Num6);
    });

    let actionNum7 = new Homey.FlowCardAction('Num7');
    actionNum7.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num7, args["device"]["settings"]["ip"], Commands.Num7);
    });

    let actionNum8 = new Homey.FlowCardAction('Num8');
    actionNum8.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num8, args["device"]["settings"]["ip"], Commands.Num8);
    });

    let actionNum9 = new Homey.FlowCardAction('Num9');
    actionNum9.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num9, args["device"]["settings"]["ip"], Commands.Num9);
    });

    let actionNum10 = new Homey.FlowCardAction('Num10');
    actionNum10.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num10, args["device"]["settings"]["ip"], Commands.Num10);
    });

    let actionNum11 = new Homey.FlowCardAction('Num11');
    actionNum11.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num11, args["device"]["settings"]["ip"], Commands.Num11);
    });

    let actionNum12 = new Homey.FlowCardAction('Num12');
    actionNum12.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.Num12, args["device"]["settings"]["ip"], Commands.Num12);
    });

    let actionPowerOff = new Homey.FlowCardAction('PowerOff');
    actionPowerOff.register().registerRunListener((args, state) => {
      return this.sendCommand(Commands.PowerOff, args["device"]["settings"]["ip"], Commands.PowerOff);
    });


    /////////////////////////////
    //
    // CONDITION
    //
    /////// Power related ///////

    let conditionPower = new Homey.FlowCardCondition('tv_status');
    conditionPower.register().registerRunListener((args, state) => {
      return Promise.resolve(args["device"]["settings"]["power"]);
    });

    /////////////////////////////
    //
    // TRIGGER
    //
    /////// Power related ///////

    this._powerOn = new Homey.FlowCardTriggerDevice('turned_on').register();
    this._powerOff = new Homey.FlowCardTriggerDevice('turned_off').register();

    /////////////////////////////
    //
    // CAPABILITIES
    //
    /////// STANDARD COMMANDS ///////


    this.registerCapabilityListener('volume_up', async (args) => {
      return this.sendCommand(Commands.VolumeUp, this.settings.ip, Commands.VolumeUp);
    });

    this.registerCapabilityListener('volume_down', async (args) => {
      return this.sendCommand(Commands.VolumeDown, this.settings.ip, Commands.VolumeDown);
    });

    this.registerCapabilityListener('volume_mute', async (args) => {
      return this.sendCommand(Commands.ToggleMute, this.settings.ip, Commands.ToggleMute);
    });

    this.registerCapabilityListener('channel_up', async (args) => {
      return this.sendCommand(Commands.ChannelUp, this.settings.ip, Commands.ChannelUp);
    });

    this.registerCapabilityListener('channel_down', async (args) => {
      return this.sendCommand(Commands.ChannelDown, this.settings.ip, Commands.ChannelDown);
    });
  }
}
