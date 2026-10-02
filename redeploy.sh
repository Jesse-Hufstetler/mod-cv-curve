. ~/mod-plugin-builder/local.env moddwarf
rm ./mod-cv-curve.lv2/mod-cv-curve.so
make
tar cz mod-cv-curve.lv2 | base64 | curl -F 'package=@-' http://192.168.51.1/sdk/install
echo -e "\n\n"
file ./mod-cv-curve.lv2/mod-cv-curve.so