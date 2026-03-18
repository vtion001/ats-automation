#!/bin/bash
# ATS Automation - Deploy Script (Linux/macOS)

set -e

echo "🚀 ATS Automation - Deploy Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo -n "Checking Python version... "
python3 --version | grep -q "3.1" || python3 --version | grep -q "3.14"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}ERROR${NC} Python 3.10+ required"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create virtual environment
echo -n "Creating virtual environment... "
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
echo -e "${GREEN}OK${NC}"

# Activate virtual environment
echo -n "Activating virtual environment... "
source venv/bin/activate
echo -e "${GREEN}OK${NC}"

# Install dependencies
echo -n "Installing dependencies... "
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "${GREEN}OK${NC}"

# Install Playwright browsers
echo -n "Installing Playwright browsers... "
playwright install chromium --with-deps 2>/dev/null || echo "Playwright install skipped"
echo -e "${GREEN}OK${NC}"

# Create necessary directories
echo -n "Creating directories... "
mkdir -p logs/{flyland,legacy,tbt,banyan,takami,element}
mkdir -p data
echo -e "${GREEN}OK${NC}"

# Copy example env file
if [ ! -f .env ]; then
    echo -n "Creating .env file... "
    cp .env.example .env 2>/dev/null || echo "ATS_SERVER_URL=http://localhost:8000" > .env
    echo -e "${GREEN}OK${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your server configuration${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Load the Chrome Extension:"
echo "     - Open chrome://extensions/"
echo "     - Enable Developer mode"
echo "     - Load: $SCRIPT_DIR/chrome-extension"
echo "  3. Start automation:"
echo "     python main.py start --client flyland"
echo ""
