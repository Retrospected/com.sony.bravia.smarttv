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

**Version 2.1.0**
- Updating dependencies

**Version 2.0.4**
- Updating dependencies

**Version 2.0.3**
- Added support for the D-Pad (directional pad) of the remote.

**Version 2.0.2**
- Adding support for Sony Bravia KDL-W655A (and other models) that use the /sony/IRCC endpoint thanks to @mikedebock
- Clean up of old code and update of dependencies thanks to @mikedebock

**Version 2.0.1**
- Adding power off action

**Version 2.0.0**
- Add Homey v2.0 compatibility. Unfortunately this means you will have to re-add your device and re-create the flows.

**Version 1.1.2**
- Removing configurable polling value. Hardcoding it to 1 time per minute for now
- If you experience issues with the app, please re-add the TV to your devices

**Version 1.1.1**
- Removing volume tag, not supported
- Fixing language issues

**Version 1.1.0**
- Added Triggers (Power On/Off)
- Added Condition (Power On)
- Cleaned up more code
- Fixed bug that didn't allow to update the polling time
- Better compatibility when multiple TV's are added

**Version 1.0.0**
- More cleaning of the code
- Getting the app validated for the App Store
- Removed obsolete triggers

**Version 0.1.0**
- Cleaned up the code
- Cleaned the actions
- Removed obsolete triggers
- Fixed availability detection

**Version 0.0.1**
- First public release, but still in alpha

[poweron-hack]: http://oi68.tinypic.com/ibxpx1.jpg
