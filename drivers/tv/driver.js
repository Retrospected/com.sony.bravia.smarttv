"use strict";

var httpmin = require("http.min");
var ip = require('ip');
var async = require('async');

var xmlEnvelope = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>%code%</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';
var foundDevices = [];
var devices = [];
var api_auth_url = 'IRCC';
var tvInputs = [{name: "Hdmi1"}, {name: "Hdmi2"}, {name: "Hdmi3"}, {name: "Hdmi4"}];
var extInterval;
var errorMessage;
var counter = 0;
var logs = "";
var failed = 0;
var failedTime = 0;
var now = new Date();
var scriptStarted = now.toJSON();
var net = require("net");

function setDeviceAvailability(device_data) {

    var client = new net.Socket();
    var cancelCheck = setTimeout(function() {
        client.destroy();
        handleOffline();
    }, 3000);

    var handleOnline = function () {
        clearTimeout(cancelCheck);
        client.destroy();
	Homey.log("setDeviceAvailability: online");
	module.exports.setAvailable(device_data);
        devices[device_data.id].state.onoff = true;

	if (devices[device_data.id].capabilities.oldstate != devices[device_data.id].state.onoff) {
		Homey.manager('flow').triggerDevice( 'tv_on', device_data, function(err, result){
                if( err ) Homey.log(err);
		return;
                });
		Homey.log("device just got turned on");
                devices[device_data.id].capabilities.oldstate = true;
	}
    };

    var handleOffline = function () {
        clearTimeout(cancelCheck);
        client.destroy();
	Homey.log("setDeviceAvailability: offline due to exception");
	module.exports.setUnavailable(device_data, "TV 'unreachable'");
	devices[device_data.id].state.onoff = false;

	if (devices[device_data.id].capabilities.oldstate != devices[device_data.id].state.onoff) {
		Homey.manager('flow').triggerDevice( 'tv_off', device_data, function(err, result){
        		if( err ) return Homey.log(err);
			return;
        		});
		Homey.log("device just got turned off");
	        devices[device_data.id].capabilities.oldstate = false;
	}
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
           client.connect(1, devices[device_data.id].settings.ip.trim(), function () {
           handleOnline();
           });
    } catch(ex) {
        console.error(ex.message);
        handleOffline();
    }

}

function getDeviceState(device_data) {

        if (devices[device_data.id].state.onoff != true) {
                Homey.manager('flow').triggerDevice('PowerOn', {device: device_data.id});
        }
        else {
                Homey.manager('flow').triggerDevice('PowerOff', {device: device_data.id});
        }

        Homey.log("xxxxxxx getDeviceState xxxxxxxxx");
        Homey.log(devices[device_data.id]);
        Homey.log("xxxxxxx getDeviceState xxxxxxxxx");

}

function initDevice(device_data) {
    Homey.log("============ before init =============");
    Homey.log(device_data);
    Homey.log("============ before init =============");
    devices[ device_data.id ] = {data: device_data, state: {'onoff': false}, capabilities: {'oldstate': false}}
    
    module.exports.getSettings(device_data, function (err, settings) {
        // INIT: set device settings
        devices[device_data.id].settings = settings;
        devices[device_data.id].state.onoff = false;
        // INIT: get current device status (standby/powerOn)
        getDeviceState(device_data);
        // INIT: check current device status and set availability
        setDeviceAvailability(device_data);

    });

    // CRON: Create cron task name
    var taskName = 'SBATV_' + device_data.id;
    // CRON: unregister task, to force new cron settings

    Homey.manager('cron').unregisterTask(taskName, function (err, success) {
        // CRON: register new cron task
        Homey.manager('cron').registerTask(taskName, '*/' + (devices[ device_data.id ].settings.polling) + ' * * * *', device_data, function (err, task) {
            Homey.log('CRON: task "' + taskName + '" registered, every ' + devices[device_data.id].settings.polling + 'min.');
        });
    });

    /////// CRONset: task listener ///////
    Homey.manager('cron').on(taskName, function (device_data) {
        var now = new Date();
        var jsonDate = now.toJSON();

        Homey.log('===================================');
//      Homey.log('Cron: Check device availability every' + devices[device_data.id].settings.polling + 'min.');
        Homey.log('Cron: Check device availability every 1min.');
        Homey.log("Cron: Time:", jsonDate);
        Homey.log('===================================');
        setDeviceAvailability(device_data);
        getDeviceState(device_data);
    })
}



var self = module.exports = {
    init: function (devices_data, callback) {
        Homey.log('.');
        Homey.log('.');
        Homey.log('.');
        Homey.log('Paired devices:', devices_data);
        devices_data.forEach(initDevice);
        callback(null, true);//needs to be on the end of init
    },
    deleted: function (device_data) {
        var taskName = 'SBATV_' + device_data.id;
        Homey.manager('cron').unregisterTask(taskName, function (err, success) {
            Homey.log('device deleted, task unregistered');
        });
        Homey.log(device_data);
        delete devices[ device_data.id ];
    },
    /*capabilities: {
        onoff: {
            get: function (device_data, callback) {
                if (device_data instanceof Error || !device_data)
                    return callback(device_data);

                var device = devices[ device_data.id ];

                if (typeof callback == 'function') {
                    Homey.log("callback");
                    
                    if (typeof device.state === "undefined") {
	                    
	                    Homey.log ('State = undefined');
	                    callback(null, false);
	                    
                    } else {
	                    
	                    Homey.log(typeof (device.state.onoff));
						callback(null, device.state.onoff);
						
					}
					
                }
            },
            set: function (device_data, onoff, callback) {
                if (device_data instanceof Error || !device_data)
                    return callback(device_data);

                var device = devices[ device_data.id ];

                if (onoff == true) {
                    device.state.onoff = onoff;
                    module.exports.realtime(device.data, 'onoff', onoff);
                    sendCommand('WakeUp', device, 'tv on', callback);
                } else {
                    device.state.onoff = onoff;
                    module.exports.realtime(device.data, 'onoff', onoff);
                    sendCommand('PowerOff', device, 'tv off', callback);
                }
                callback(null, onoff);
            }
        }
    },*/
    settings: function (device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
        changedKeysArr.forEach(function (key) {
            devices[device_data.id].settings[key] = newSettingsObj[key];
            setDeviceAvailability(device_data);
        })
        Homey.log(devices[device_data.id]);
        callback(null, true);
    },
    added: function (device_data, callback) {
        // run when a device has been added by the user (as of v0.8.33)
        Homey.log(device_data);
        initDevice(device_data);
    },
    pair: function (socket) {
        socket.on('list_devices', function (data, callback) {
            data = foundDevices;
            foundDevices = [];
            Homey.log('list_devices', data);

            async.each(data, function (device, callback) {
                // Call an asynchronous function, often a save() to DB
            }, function () {
                // All tasks are done now
                Homey.log('ASYNC:::::callback');
                Homey.log(devices);
                // this returns the "devices" to the list_devices view
                callback(null, devices);
                foundDevices = [];
            });
        });
        socket.on('disconnect', function () {
            foundDevices = [];
            Homey.log('User aborted pairing, or pairing is finished');
        });
        socket.on('add_device', function (device, callback) {
            Homey.log('-------- device added ---------');
            Homey.log(device);
            Homey.log('-------- device added ---------');
            devices[ device.data.id ] = {
                data: device.data,
                settings: device.settings,
                state: device.state
            }

            Homey.log('-------- device added ---------');
            callback(devices, true);
        })
    }
}


/////////////////////////////
// listeners, flow related 
/////////////////////////////
//
// ACTION
//
/////// Power related /////// 
Homey.manager('flow').on('action.PowerOff', function (callback, args) {
    self.realtime(devices[args.device.id], 'onoff', false);
    sendCommand('PowerOff', devices[args.device.id], 'tv off', callback);
});



Homey.manager('flow').on('action.Sleep', function (callback, args) {
    self.realtime(devices[args.device.id], 'onoff', false);
    sendCommand('Sleep', devices[args.device.id], 'Sleep', callback);
});
//////////////////////////////
/////// Channel related /////// 
Homey.manager('flow').on('action.Netflix', function (callback, args) {
    //Homey.manager('flow').trigger('Netflix');
    sendCommand('Netflix', devices[args.device.id], 'Netflix', callback);
});
Homey.manager('flow').on('action.ChannelUp', function (callback, args) {
    //Homey.manager('flow').trigger('ChannelUp');
    sendCommand('ChannelUp', devices[args.device.id], 'ChannelUp', callback);
});
Homey.manager('flow').on('action.ChannelDown', function (callback, args) {
    //Homey.manager('flow').trigger('ChannelDown');
    sendCommand('ChannelDown', devices[args.device.id], 'ChannelDown', callback);
});
//////////////////////////////
/////// Volume related /////// 
Homey.manager('flow').on('action.VolumeUp', function (callback, args) {
    sendCommand('VolumeUp', devices[args.device.id], 'VolumeUp', callback);
});
Homey.manager('flow').on('action.VolumeDown', function (callback, args) {
    sendCommand('VolumeDown', devices[args.device.id], 'VolumeDown', callback);
});
Homey.manager('flow').on('action.Mute', function (callback, args) {
    sendCommand('Mute', devices[args.device.id], 'Mute', callback);
});
Homey.manager('flow').on('action.UnMute', function (callback, args) {
    ///Homey.manager('flow').trigger('UnMute');
    sendCommand('Mute', devices[args.device.id], 'UnMute', callback);
});
//////////////////////////////
/////// HDMI Input related /////// 
Homey.manager('flow').on('action.SetInput', function (callback, args) {
    sendCommand(args.input.name, devices[args.device.id], 'SetInput', callback);
});
Homey.manager('flow').on('action.SetInput.input.autocomplete', function (callback, value) {
    var inputSearchString = value.query;
    var items = searchItems(inputSearchString, tvInputs);
    callback(null, items);
});
//////////////////////////////
/////// Misc /////// 
Homey.manager('flow').on('action.Options', function (callback, args) {
    sendCommand('Options', devices[args.device.id], 'Options', callback);
});
Homey.manager('flow').on('action.EPG', function (callback, args) {
    sendCommand('EPG', devices[args.device.id], 'EPG', callback);
});
Homey.manager('flow').on('action.EPG', function (callback, args) {
    sendCommand('EPG', devices[args.device.id], 'EPG', callback);
});
Homey.manager('flow').on('action.Enter', function (callback, args) {
    sendCommand('Enter', devices[args.device.id], 'Enter', callback);
});

//////////////////////////////
/////// NumX /////// 
Homey.manager('flow').on('action.Num0', function (callback, args) {
    sendCommand('Num0', devices[args.device.id], 'Num0', callback);
});
Homey.manager('flow').on('action.Num1', function (callback, args) {
    sendCommand('Num1', devices[args.device.id], 'Num1', callback);
});
Homey.manager('flow').on('action.Num2', function (callback, args) {
    sendCommand('Num2', devices[args.device.id], 'Num2', callback);
});
Homey.manager('flow').on('action.Num3', function (callback, args) {
    sendCommand('Num3', devices[args.device.id], 'Num3', callback);
});
Homey.manager('flow').on('action.Num4', function (callback, args) {
    sendCommand('Num4', devices[args.device.id], 'Num4', callback);
});
Homey.manager('flow').on('action.Num5', function (callback, args) {
    sendCommand('Num5', devices[args.device.id], 'Num5', callback);
});
Homey.manager('flow').on('action.Num6', function (callback, args) {
    sendCommand('Num6', devices[args.device.id], 'Num6', callback);
});
Homey.manager('flow').on('action.Num7', function (callback, args) {
    sendCommand('Num7', devices[args.device.id], 'Num7', callback);
});
Homey.manager('flow').on('action.Num8', function (callback, args) {
    sendCommand('Num8', devices[args.device.id], 'Num8', callback);
});
Homey.manager('flow').on('action.Num9', function (callback, args) {
    sendCommand('Num9', devices[args.device.id], 'Num9', callback);
});
Homey.manager('flow').on('action.Num10', function (callback, args) {
    sendCommand('Num10', devices[args.device.id], 'Num10', callback);
});
Homey.manager('flow').on('action.Num11', function (callback, args) {
    sendCommand('Num11', devices[args.device.id], 'Num11', callback);
});
Homey.manager('flow').on('action.Num12', function (callback, args) {
    sendCommand('Num12', devices[args.device.id], 'Num12', callback);
});

/////////////////////////////
//
// TRIGGER
//
/////// Power related ///////

Homey.manager('flow').on('trigger.tv_on', function( callback, args, state ){
    // if( args.arg_id == 'something' )
    callback( null, true ); // true to make the flow continue, or false to abort
});

Homey.manager('flow').on('trigger.tv_off', function( callback, args, state ){
    // if( args.arg_id == 'something' )
    callback( null, true ); // true to make the flow continue, or false to abort
});

/////////////////////////////


/////////////////////////////
//
// CONDITION
//
/////// Power related ///////

Homey.manager('flow').on('condition.tv_status', function( callback, args ){
	var result = devices[args.device.id].state.onoff;
    callback( null, result );
});

/////////////////////////////

function searchItems(value, optionsArray) {

    var serveItems = [];
    for (var i = 0; i < optionsArray.length; i++) {
        var serveItem = optionsArray[i];
        if (serveItem.name.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
            serveItems.push({icon: "", name: serveItem.name});
        }
    }
    return serveItems;
}




function sendCommand(findCode, device, flowName, callback) {
    if (typeof (device.settings) !== 'undefined') {
        //trigger flows for this action
        Homey.manager('flow').triggerDevice(findCode, {device: device.id});

        if (device.settings.psk != "----") {
            for (var i = 0; i < remoteControllerCodes.length; i++) {
                if (remoteControllerCodes[i]['name'] == findCode) {
                    var sendcode = remoteControllerCodes[i]['value'];
                }
            }

            Homey.log("   ");
            Homey.log("======= send command! ==========");
            Homey.log("sendCommand: actionCard:" + flowName);
            var now = new Date();
            var jsonDate = now.toJSON();
            Homey.log("sendCommand: Command time:", jsonDate);
            var random = Math.floor(Math.random() * 1000000000);
            var options = {
//                uri: 'http://' + device.settings.ip + '/sony/IRCC?_random=' + random,
		  uri: 'http://' +device.settings.ip + '/IRCC',
                timeout: 1000,
                headers: {
                    "cache-control": "no-cache",
                    "random": random
                },
                request: function (req) {
                    req.write(xmlEnvelope.replace("%code%", sendcode))
                }
            }

            httpmin.post(options).then(function (data) {

                var statusCode = data.response.statusCode;
                Homey.log("statusCode:", statusCode);
                Homey.log("response:", data.data);
                if (statusCode == 200) {
                    Homey.log("sendCommand: command success");
                    callback(null, true);

                } else {
                    Homey.log("sendCommand: unknown statuscode: " + data.response.statusCode);
                    callback(null, true);
                }
            }).catch(function (err) {
                Homey.log(error);
                callback(null, false);
            });


        } else {
            Homey.log("sendCommand: No 'pre share key' set.");
            callback(null, false);
        }
    } else {
        Homey.log("sendCommand: device settings undefined");
        callback(null, false);
    }
}

var remoteControllerCodes = [
    {
        "name": "Num1",
        "value": "AAAAAQAAAAEAAAAAAw=="
    },
    {
        "name": "Num2",
        "value": "AAAAAQAAAAEAAAABAw=="
    },
    {
        "name": "Num3",
        "value": "AAAAAQAAAAEAAAACAw=="
    },
    {
        "name": "Num4",
        "value": "AAAAAQAAAAEAAAADAw=="
    },
    {
        "name": "Num5",
        "value": "AAAAAQAAAAEAAAAEAw=="
    },
    {
        "name": "Num6",
        "value": "AAAAAQAAAAEAAAAFAw=="
    },
    {
        "name": "Num7",
        "value": "AAAAAQAAAAEAAAAGAw=="
    },
    {
        "name": "Num8",
        "value": "AAAAAQAAAAEAAAAHAw=="
    },
    {
        "name": "Num9",
        "value": "AAAAAQAAAAEAAAAIAw=="
    },
    {
        "name": "Num0",
        "value": "AAAAAQAAAAEAAAAJAw=="
    },
    {
        "name": "Num11",
        "value": "AAAAAQAAAAEAAAAKAw=="
    },
    {
        "name": "Num12",
        "value": "AAAAAQAAAAEAAAALAw=="
    },
    {
        "name": "Enter",
        "value": "AAAAAQAAAAEAAAALAw=="
    },
    {
        "name": "GGuide",
        "value": "AAAAAQAAAAEAAAAOAw=="
    },
    {
        "name": "ChannelUp",
        "value": "AAAAAQAAAAEAAAAQAw=="
    },
    {
        "name": "ChannelDown",
        "value": "AAAAAQAAAAEAAAARAw=="
    },
    {
        "name": "VolumeUp",
        "value": "AAAAAQAAAAEAAAASAw=="
    },
    {
        "name": "VolumeDown",
        "value": "AAAAAQAAAAEAAAATAw=="
    },
    {
        "name": "Mute",
        "value": "AAAAAQAAAAEAAAAUAw=="
    },
    {
        "name": "TvPower",
        "value": "AAAAAQAAAAEAAAAVAw=="
    },
    {
        "name": "Audio",
        "value": "AAAAAQAAAAEAAAAXAw=="
    },
    {
        "name": "MediaAudioTrack",
        "value": "AAAAAQAAAAEAAAAXAw=="
    },
    {
        "name": "Tv",
        "value": "AAAAAQAAAAEAAAAkAw=="
    },
    {
        "name": "Input",
        "value": "AAAAAQAAAAEAAAAlAw=="
    },
    {
        "name": "TvInput",
        "value": "AAAAAQAAAAEAAAAlAw=="
    },
    {
        "name": "TvAntennaCable",
        "value": "AAAAAQAAAAEAAAAqAw=="
    },
    {
        "name": "WakeUp",
        "value": "AAAAAQAAAAEAAAAuAw=="
    },
    {
        "name": "PowerOff",
        "value": "AAAAAQAAAAEAAAAvAw=="
    },
    {
        "name": "Sleep",
        "value": "AAAAAQAAAAEAAAAvAw=="
    },
    {
        "name": "Right",
        "value": "AAAAAQAAAAEAAAAzAw=="
    },
    {
        "name": "Left",
        "value": "AAAAAQAAAAEAAAA0Aw=="
    },
    {
        "name": "SleepTimer",
        "value": "AAAAAQAAAAEAAAA2Aw=="
    },
    {
        "name": "Analog2",
        "value": "AAAAAQAAAAEAAAA4Aw=="
    },
    {
        "name": "TvAnalog",
        "value": "AAAAAQAAAAEAAAA4Aw=="
    },
    {
        "name": "Display",
        "value": "AAAAAQAAAAEAAAA6Aw=="
    },
    {
        "name": "Jump",
        "value": "AAAAAQAAAAEAAAA7Aw=="
    },
    {
        "name": "PicOff",
        "value": "AAAAAQAAAAEAAAA+Aw=="
    },
    {
        "name": "PictureOff",
        "value": "AAAAAQAAAAEAAAA+Aw=="
    },
    {
        "name": "Teletext",
        "value": "AAAAAQAAAAEAAAA/Aw=="
    },
    {
        "name": "Video1",
        "value": "AAAAAQAAAAEAAABAAw=="
    },
    {
        "name": "Video2",
        "value": "AAAAAQAAAAEAAABBAw=="
    },
    {
        "name": "AnalogRgb1",
        "value": "AAAAAQAAAAEAAABDAw=="
    },
    {
        "name": "Home",
        "value": "AAAAAQAAAAEAAABgAw=="
    },
    {
        "name": "Exit",
        "value": "AAAAAQAAAAEAAABjAw=="
    },
    {
        "name": "PictureMode",
        "value": "AAAAAQAAAAEAAABkAw=="
    },
    {
        "name": "Confirm",
        "value": "AAAAAQAAAAEAAABlAw=="
    },
    {
        "name": "Up",
        "value": "AAAAAQAAAAEAAAB0Aw=="
    },
    {
        "name": "Down",
        "value": "AAAAAQAAAAEAAAB1Aw=="
    },
    {
        "name": "ClosedCaption",
        "value": "AAAAAgAAAKQAAAAQAw=="
    },
    {
        "name": "Component1",
        "value": "AAAAAgAAAKQAAAA2Aw=="
    },
    {
        "name": "Component2",
        "value": "AAAAAgAAAKQAAAA3Aw=="
    },
    {
        "name": "Wide",
        "value": "AAAAAgAAAKQAAAA9Aw=="
    },
    {
        "name": "EPG",
        "value": "AAAAAgAAAKQAAABbAw=="
    },
    {
        "name": "PAP",
        "value": "AAAAAgAAAKQAAAB3Aw=="
    },
    {
        "name": "TenKey",
        "value": "AAAAAgAAAJcAAAAMAw=="
    },
    {
        "name": "BSCS",
        "value": "AAAAAgAAAJcAAAAQAw=="
    },
    {
        "name": "Ddata",
        "value": "AAAAAgAAAJcAAAAVAw=="
    },
    {
        "name": "Stop",
        "value": "AAAAAgAAAJcAAAAYAw=="
    },
    {
        "name": "Pause",
        "value": "AAAAAgAAAJcAAAAZAw=="
    },
    {
        "name": "Play",
        "value": "AAAAAgAAAJcAAAAaAw=="
    },
    {
        "name": "Rewind",
        "value": "AAAAAgAAAJcAAAAbAw=="
    },
    {
        "name": "Forward",
        "value": "AAAAAgAAAJcAAAAcAw=="
    },
    {
        "name": "DOT",
        "value": "AAAAAgAAAJcAAAAdAw=="
    },
    {
        "name": "Rec",
        "value": "AAAAAgAAAJcAAAAgAw=="
    },
    {
        "name": "Return",
        "value": "AAAAAgAAAJcAAAAjAw=="
    },
    {
        "name": "Blue",
        "value": "AAAAAgAAAJcAAAAkAw=="
    },
    {
        "name": "Red",
        "value": "AAAAAgAAAJcAAAAlAw=="
    },
    {
        "name": "Green",
        "value": "AAAAAgAAAJcAAAAmAw=="
    },
    {
        "name": "Yellow",
        "value": "AAAAAgAAAJcAAAAnAw=="
    },
    {
        "name": "SubTitle",
        "value": "AAAAAgAAAJcAAAAoAw=="
    },
    {
        "name": "CS",
        "value": "AAAAAgAAAJcAAAArAw=="
    },
    {
        "name": "BS",
        "value": "AAAAAgAAAJcAAAAsAw=="
    },
    {
        "name": "Digital",
        "value": "AAAAAgAAAJcAAAAyAw=="
    },
    {
        "name": "Options",
        "value": "AAAAAgAAAJcAAAA2Aw=="
    },
    {
        "name": "Media",
        "value": "AAAAAgAAAJcAAAA4Aw=="
    },
    {
        "name": "Prev",
        "value": "AAAAAgAAAJcAAAA8Aw=="
    },
    {
        "name": "Next",
        "value": "AAAAAgAAAJcAAAA9Aw=="
    },
    {
        "name": "DpadCenter",
        "value": "AAAAAgAAAJcAAABKAw=="
    },
    {
        "name": "CursorUp",
        "value": "AAAAAgAAAJcAAABPAw=="
    },
    {
        "name": "CursorDown",
        "value": "AAAAAgAAAJcAAABQAw=="
    },
    {
        "name": "CursorLeft",
        "value": "AAAAAgAAAJcAAABNAw=="
    },
    {
        "name": "CursorRight",
        "value": "AAAAAgAAAJcAAABOAw=="
    },
    {
        "name": "ShopRemoteControlForcedDynamic",
        "value": "AAAAAgAAAJcAAABqAw=="
    },
    {
        "name": "FlashPlus",
        "value": "AAAAAgAAAJcAAAB4Aw=="
    },
    {
        "name": "FlashMinus",
        "value": "AAAAAgAAAJcAAAB5Aw=="
    },
    {
        "name": "AudioQualityMode",
        "value": "AAAAAgAAAJcAAAB7Aw=="
    },
    {
        "name": "DemoMode",
        "value": "AAAAAgAAAJcAAAB8Aw=="
    },
    {
        "name": "Analog",
        "value": "AAAAAgAAAHcAAAANAw=="
    },
    {
        "name": "Mode3D",
        "value": "AAAAAgAAAHcAAABNAw=="
    },
    {
        "name": "DigitalToggle",
        "value": "AAAAAgAAAHcAAABSAw=="
    },
    {
        "name": "DemoSurround",
        "value": "AAAAAgAAAHcAAAB7Aw=="
    },
    {
        "name": "*AD",
        "value": "AAAAAgAAABoAAAA7Aw=="
    },
    {
        "name": "AudioMixUp",
        "value": "AAAAAgAAABoAAAA8Aw=="
    },
    {
        "name": "AudioMixDown",
        "value": "AAAAAgAAABoAAAA9Aw=="
    },
    {
        "name": "PhotoFrame",
        "value": "AAAAAgAAABoAAABVAw=="
    },
    {
        "name": "Tv_Radio",
        "value": "AAAAAgAAABoAAABXAw=="
    },
    {
        "name": "SyncMenu",
        "value": "AAAAAgAAABoAAABYAw=="
    },
    {
        "name": "Hdmi1",
        "value": "AAAAAgAAABoAAABaAw=="
    },
    {
        "name": "Hdmi2",
        "value": "AAAAAgAAABoAAABbAw=="
    },
    {
        "name": "Hdmi3",
        "value": "AAAAAgAAABoAAABcAw=="
    },
    {
        "name": "Hdmi4",
        "value": "AAAAAgAAABoAAABdAw=="
    },
    {
        "name": "TopMenu",
        "value": "AAAAAgAAABoAAABgAw=="
    },
    {
        "name": "PopUpMenu",
        "value": "AAAAAgAAABoAAABhAw=="
    },
    {
        "name": "OneTouchTimeRec",
        "value": "AAAAAgAAABoAAABkAw=="
    },
    {
        "name": "OneTouchView",
        "value": "AAAAAgAAABoAAABlAw=="
    },
    {
        "name": "DUX",
        "value": "AAAAAgAAABoAAABzAw=="
    },
    {
        "name": "FootballMode",
        "value": "AAAAAgAAABoAAAB2Aw=="
    },
    {
        "name": "iManual",
        "value": "AAAAAgAAABoAAAB7Aw=="
    },
    {
        "name": "Netflix",
        "value": "AAAAAgAAABoAAAB8Aw=="
    },
    {
        "name": "Assists",
        "value": "AAAAAgAAAMQAAAA7Aw=="
    },
    {
        "name": "ActionMenu",
        "value": "AAAAAgAAAMQAAABLAw=="
    },
    {
        "name": "Help",
        "value": "AAAAAgAAAMQAAABNAw=="
    },
    {
        "name": "TvSatellite",
        "value": "AAAAAgAAAMQAAABOAw=="
    },
    {
        "name": "WirelessSubwoofer",
        "value": "AAAAAgAAAMQAAAB+Aw=="
    }
];
