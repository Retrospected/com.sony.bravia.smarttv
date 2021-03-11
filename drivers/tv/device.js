"use strict";

var async = require('async');
var httpmin = require("http.min");
const Homey = require('homey');
const Commands = require('./commands');

var xmlEnvelope = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>%code%</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';
var foundDevices = [];
var devices = [];
var net = require("net");

const API_ENDPOINT_DEFAULT = '/IRCC';
const API_ENDPOINT_SONY = '/sony/IRCC';
const POLL_INTERVAL = 1000 * 10 //10 seconds


module.exports = class SonyDevice extends Homey.Device {

  async onInit() {
    super.onInit();
    this.settings = await this.updateSettings();

    this.initDevice(this.settings);

    this.registerFlowCards();
    this.log('Name:', this.getName());
    this.log('Class:', this.getClass());
  }
  async onDeleted () {
    clearInterval(this._pollDeviceInterval);
  }
  async onAdded () {
    this.log("New device added!");
  }
  async onPairListDevices (socket) {
    socket.on('list_devices', function (data, callback) {
      data = foundDevices;
      foundDevices = [];
      this.log('list_devices', data);

      async.each(data, function (device, callback) {
        // Call an asynchronous function, often a save() to DB
      }, function () {
        // All tasks are done now
        this.log('ASYNC:::::callback');
        this.log(devices);
        // this returns the "devices" to the list_devices view
        callback(null, devices);
        foundDevices = [];
      });
    });
    socket.on('disconnect', function () {
      foundDevices = [];
      this.log('User aborted pairing, or pairing is finished');
    });
    socket.on('add_device', function (device, callback) {
      this.log('-------- device added ---------');
      this.log(device);
      this.log('-------- device added ---------');
      devices[ device.data.id ] = {
        data: device.data,
        settings: device.settings,
        state: device.state
      }

      this.log('-------- device added ---------');
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
        //this.log("getDeviceAvailability: online");
        clearTimeout(cancelCheck);
        client.destroy();
        resolve();
      };

      var handleOffline = function () {
        //this.log("getDeviceAvailability: offline due to exception");
        clearTimeout(cancelCheck);
        client.destroy();
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

  async pingEndpoint(ip, endpoint) {
    // Test if endpoint is available with a OPTIONS request.
    this.log("============ pingEndpoint =============");
    const request = await httpmin.options({ uri: `http://${ip}${endpoint}` });
    return request.response.statusCode === 200;
  }

  async setApiEndpoint(ip) {
    // Check if "/sony/IRCC" endpoint is available
    this.log("============ setApiEndpoint =============");
    let sonyEndpoint = false;

    try {
      sonyEndpoint = await this.pingEndpoint(ip, API_ENDPOINT_SONY);
    } catch(e) {
      this.log(e);
    }

    if (sonyEndpoint) {
      this.setSettings({"apiEndpoint": API_ENDPOINT_SONY});
    } else {
      this.setSettings({"apiEndpoint": API_ENDPOINT_DEFAULT});
    }
  }

  async initDevice() {
    this.log("============ init =============");

    const settings = this.getSettings();
    this.log(settings);

    // If apiEndpoint not set yet, detect the correct endpoint.
    if (!('apiEndpoint' in settings)) {
      await this.setApiEndpoint(settings.ip);
    }

    // CRON: Create cron task name
    var taskName = 'SBATV_' + this.getSettings()["id"];
    // CRON: unregister task, to force new cron settings
    this.log('CRON: task "' + taskName + '" registered, every ' + POLL_INTERVAL / 1000 + ' seconds.');
    this._pollDeviceInterval = setInterval(this.pollDevice.bind(this), POLL_INTERVAL);
    this.pollDevice();
  }

  async pollDevice () {
    this.settings = await this.getSettings();
    this.log(this.settings);
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
         this.homey.flow.getDeviceTriggerCard('turned_on').trigger(this, {}, {});
      } else {
        this.setSettings({"power": false});
        this.homey.flow.getDeviceTriggerCard('turned_off').trigger(this, {}, {});
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

  async sendCommand(findCode, sendCode) {
    return new Promise((resolve, reject) => {
      if (typeof (this.settings) !== 'undefined') {
        const { apiEndpoint, ip } = this.settings;

        this.log("   ");
        this.log("======= send command! ==========");
        this.log("sendCommand: sendCode:" + sendCode);
        this.log("sendCommand: to IP:" + ip);
        this.log("sendCommand: to endpoint:" + apiEndpoint);
        var now = new Date();
        var jsonDate = now.toJSON();
        this.log("sendCommand: Command time:", jsonDate);
        var random = Math.floor(Math.random() * 1000000000);
        var options = {
          uri: 'http://' + ip + apiEndpoint,
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
          if (statusCode == 200) {
            resolve();

          } else {
            reject(new Error('unknown statuscode'))
          }
        }).catch(function (err) {
          reject(new Error('http error'))
        });
      } else {
        this.log("sendCommand: device settings undefined");
        reject(new Error('device settings undefined'))
      }
    });
  }

  registerFlowCards() {
    this.log("Settings:", this.settings);

    this.homey.flow.getActionCard('ChannelUp')
      .registerRunListener(async (args) => {
        return this.sendCommand(Commands.ChannelUp, Commands.ChannelUp);
    });

    this.homey.flow.getActionCard('Netflix')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Netflix, Commands.Netflix);
    });

    this.homey.flow.getActionCard('ChannelDown')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.ChannelDown, Commands.ChannelDown);
    });

    this.homey.flow.getActionCard('VolumeDown')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.VolumeDown, Commands.VolumeDown);
    });

    this.homey.flow.getActionCard('VolumeUp')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.VolumeUp, Commands.VolumeUp);
    });

    this.homey.flow.getActionCard('ToggleMute')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.ToggleMute, Commands.ToggleMute);
    });

    this.homey.flow.getActionCard('SetInput')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.SetInput, Commands.SetInput);
    });

    this.homey.flow.getActionCard('EPG')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.EPG, Commands.EPG);
    });

    this.homey.flow.getActionCard('Enter')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Enter, Commands.Enter);
    });

    this.homey.flow.getActionCard('Num0')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num0, Commands.Num0);
    });

    this.homey.flow.getActionCard('Num1')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num1, Commands.Num1);
    });

    this.homey.flow.getActionCard('Num2')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num2, Commands.Num2);
    });

    this.homey.flow.getActionCard('Num3')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num3, Commands.Num3);
    });

    this.homey.flow.getActionCard('Num4')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num4, Commands.Num4);
    });

    this.homey.flow.getActionCard('Num5')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num5, Commands.Num5);
    });

    this.homey.flow.getActionCard('Num6')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num6, Commands.Num6);
    });

    this.homey.flow.getActionCard('Num7')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num7, Commands.Num7);
    });

    this.homey.flow.getActionCard('Num8')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num8, Commands.Num8);
    });

    this.homey.flow.getActionCard('Num9')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num9, Commands.Num9);
    });

    this.homey.flow.getActionCard('Num10')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num10, Commands.Num10);
    });

    this.homey.flow.getActionCard('Num11')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num11, Commands.Num11);
    });

    this.homey.flow.getActionCard('Num12')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Num12, Commands.Num12);
    });

    this.homey.flow.getActionCard('PowerOff')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.PowerOff, Commands.PowerOff);
    });

    this.homey.flow.getActionCard('Up')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Up, Commands.Up);
    });

    this.homey.flow.getActionCard('Down')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Down, Commands.Down);
    });

    this.homey.flow.getActionCard('Left')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Left, Commands.Left);
    });

    this.homey.flow.getActionCard('Right')
    .registerRunListener(async (args) => {
      return this.sendCommand(Commands.Right, Commands.Right);
    });


    /////////////////////////////
    //
    // CONDITION
    //
    /////// Power related ///////

    let conditionPower = this.homey.flow.getConditionCard('tv_status')
      .registerRunListener(async (args) => {
        return Promise.resolve(args["device"]["settings"]["power"]);
    });

    /////////////////////////////
    //
    // TRIGGER
    //
    /////// Power related ///////

    this._powerOn = this.homey.flow.getDeviceTriggerCard('turned_on');
    this._powerOn = this.homey.flow.getDeviceTriggerCard('turned_off');

    /////////////////////////////
    //
    // CAPABILITIES
    //
    /////// STANDARD COMMANDS ///////

    this.registerCapabilityListener('volume_up', async (args) => {
      return this.sendCommand(Commands.VolumeUp, Commands.VolumeUp);
    });

    this.registerCapabilityListener('volume_down', async (args) => {
      return this.sendCommand(Commands.VolumeDown, Commands.VolumeDown);
    });

    this.registerCapabilityListener('volume_mute', async (args) => {
      return this.sendCommand(Commands.ToggleMute, Commands.ToggleMute);
    });

    this.registerCapabilityListener('channel_up', async (args) => {
      return this.sendCommand(Commands.ChannelUp, Commands.ChannelUp);
    });

    this.registerCapabilityListener('channel_down', async (args) => {
      return this.sendCommand(Commands.ChannelDown, Commands.ChannelDown);
    });
  }
}
