#!/bin/bash
mkdir -p /var/www/ats-extension
cd /var/www/ats-extension
echo "Extension directory created"

# Create a simple index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ATS Extension Updates</title>
</head>
<body>
    <h1>ATS Extension Updates</h1>
    <p>Extension files available at /releases/</p>
</body>
</html>
EOF

# Start Python HTTP server on port 80 (as root or via sudo)
sudo python3 -m http.server 80 &

echo "HTTP server started on port 80"
