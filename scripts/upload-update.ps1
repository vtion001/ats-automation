#!/bin/bash
cat > /var/www/ats-extension/update.xml << 'XMLEOF'
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='jncbpgnflmcfnehadjjgddmhgecbelkf'>
    <updatecheck 
      codebase='http://20.125.46.59/ats-automation.crx' 
      version='2.1.0' 
      prodversionmin='90.0.0.0'>
    </updatecheck>
  </app>
</gupdate>
XMLEOF
echo "update.xml created"
