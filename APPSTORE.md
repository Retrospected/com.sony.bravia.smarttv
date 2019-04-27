# Sony Bravia Smart TV for Athom Homey

Control your Sony Bravia Smart TV with this Homey (Athom B.V.) app.
This app is intended for the older Sony Bravia TV's that are not running AndroidTV but are connected to your network.
The commands are based on the commands sent by the Video & TV Sideview mobile application.

Note that it's currently unclear which devices are supported, the code has been created and tested on the Sony Bravia KDL-EX720 and Sony Bravia KDL-W655A.

Before installing this app, please read these instruction very carefully:
- Give your TV a static IP address, or make a DHCP reservation for a specific IP address in your router.

## Adding your Sony Bravia Smart TV to Homey

Manually add your TV to your devices. Give it a name and configure the IP address.
The polling time (to check for on/off state of the device) is by default configured every 10 seconds.

## Flows

**Triggers**
- Power Off
- Power On

The above triggers are based on an ICMP 'ping' performed every 10 seconds. Some TV's keep the network interface alive for a couple of minutes after the TV goes into standby mode. This causes a delay in the 'Power Off' trigger.

**Conditions**
- Power (On/Off)

**Actions**
- Netflix
- Channel Up (+)
- Channel Down (-)
- Volume Up (+)
- Volume Down (-)
- Toggle Mute
- Power off
- Change Input
- Press button 0 - 12
- Enter
- Guide (EPG)
- D-Pad (directional pad)

## Power On hack
Since the old Sony Bravia TV's do not support WOL (Wake-On-LAN), there is no clean way of turning on the TV.
As an alternative I use the following flow to turn it on:

![Power On hack][poweron-hack]

You can cast the following website that will show the same random wallpapers as the Chromecast does by default: https://clients3.google.com/cast/chromecast/v/c9541b08

## Credits
Created this app because the other Sony Bravia app for Homey only supports Sony Bravia TV's running Android.
The code is based on the project created by Marco Frijman and currently maintained by Jorden:
https://github.com/jordenc/com.sony.bravia.androidtv

Special thanks to @mikedebock for adding support of more Sony Bravia models.

**Use at your own risk, I accept no responsibility for any damages caused by using this script.**

## Compatibility
Homey version >= 2.0.0

## Donations
[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SGUF7AJYAF83C)

## Changelog

**Version 2.0.3**
- Added support for the D-Pad (directional pad) of the remote.

[poweron-hack]: http://oi68.tinypic.com/ibxpx1.jpg
