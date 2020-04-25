Control your Sony Bravia Smart TV with this Homey (Athom B.V.) app.
This app is intended for the older Sony Bravia TV's that are not running AndroidTV but are connected to your network.
The commands are based on the commands sent by the Video & TV Sideview mobile application.

Note that it's currently unclear which devices are supported, the code has been created and tested on the Sony Bravia KDL-EX720 and Sony Bravia KDL-W655A.

Before installing this app, please read these instruction very carefully:
- Give your TV a static IP address, or make a DHCP reservation for a specific IP address in your router.

Adding your Sony Bravia Smart TV to Homey

Manually add your TV to your devices. Give it a name and configure the IP address.
The polling time (to check for on/off state of the device) is by default configured every 10 seconds.

Flows

Triggers
- Power Off
- Power On

The above triggers are based on an ICMP 'ping' performed every 10 seconds. Some TV's keep the network interface alive for a couple of minutes after the TV goes into standby mode. This causes a delay in the 'Power Off' trigger.

Conditions
- Power (On/Off)

Actions
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
