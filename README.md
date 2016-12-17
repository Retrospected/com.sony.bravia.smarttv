# Sony Bravia Smart TV for Athom Homey

Control your Sony Bravia Smart TV with this Homey(Athom B.V.) app.
This app is intended for the older Sony Bravia TV's that are not running AndroidTV but are connected to your network.
The commands are based on the commands send by the Video & TV Sideview mobile application.

Note that it's currently unclear which devices are support, the code has been created and tested on the Sony Bravia KDL-EX720

Before installing this app, please read these instruction very carefully:
- Give your TV a static IP address, or make a DHCP reservation for a specific IP address in your router.

#Adding your Sony Bravia Smart TV to Homey

Manually add your TV to your devices. Give it a name and configure the IP address.

#Flows:

**Triggers (App)**:
- Connection error (timeout|refused)?

**Triggers (Device)**:
- Netflix started?
- Channel Up (+)?
- Channel Down (-)?
- Volume Up (+)?
- Volume Down (-)?
- TV muted?
- TV un mute?
- HMDI changed?
- TV options?

**Conditions**:
- TODO

**Actions**:
- Power Off
- Power On
- Netflix
- Channel Up (+)
- Channel Down (-)
- Volume Up (+)
- Volume Down (-)
- Mute
- Un Mute
- Set Input (HDMI 1/2/3/4)
- Options

#Translation
- english

#Credits
Created this app because the original app for Homey only supports Sony Bravia TV's running Android.
The code is fully based on the project created by Marco Frijman and currently maintained by Jorden:
https://github.com/jordenc/com.sony.bravia.androidtv

**Use at your own risk, I accept no responsibility for any damages caused by using this script.**

#Compatibility
Homey version >= 0.8.38 (due to wrench/settings fix)

# Changelog

**Version 0.0.1:**
- First public release, but still in alpha
