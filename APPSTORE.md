# Sony Bravia Smart TV for Homey

Control your Sony Bravia Smart TV with this Homey (Athom B.V.) app.
This app is intended for the older Sony Bravia TV's that are not running AndroidTV but are connected to your network.
The commands are based on the commands sent by the Video & TV Sideview mobile application.

Note that it's currently unclear which devices are supported, the code has been created and tested on the Sony Bravia KDL-EX720 and Sony Bravia KDL-W655A.

Before installing this app, please read these instruction very carefully:
- Give your TV a static IP address, or make a DHCP reservation for a specific IP address in your router.

## Adding your Sony Bravia Smart TV to Homey

Manually add your TV to your devices. Give it a name and configure the IP address.
The polling time (to check for on/off state of the device) is by default configured every 10 seconds.

## Credits
Created this app because the other Sony Bravia app for Homey only supports Sony Bravia TV's running Android.
The code is based on the project created by Marco Frijman and currently maintained by Jorden:
https://github.com/jordenc/com.sony.bravia.androidtv

Special thanks to @mikedebock for adding support of more Sony Bravia models.

**Use at your own risk, I accept no responsibility for any damages caused by using this script.**

## Donations
[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SGUF7AJYAF83C)

## Changelog

**Version 3.0.0**
- Update to SDKv3
