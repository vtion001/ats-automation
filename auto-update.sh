#!/bin/bash
# ATS Automation - Auto Update Script for macOS/Linux
#
# Usage:
#   ./auto-update.sh              # Manual update
#   ./auto-update.sh --install    # Set up cron job (daily at 8 AM)
#   ./auto-update.sh --install 9  # Set up cron job (daily at 9 AM)
#   ./auto-update.sh --uninstall   # Remove cron job
#   ./auto-update.sh --status     # Check cron status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/update.log"
CRON_ID="ats-automation-update"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $2" >> "$LOG_FILE"
}

# Check for Git
check_git() {
    if ! command -v git &> /dev/null; then
        log "${RED}ERROR: Git is not installed!${NC}" "ERROR: Git not found"
        echo ""
        echo "Install Git:"
        echo "  macOS: brew install git"
        echo "  Linux: sudo apt install git"
        exit 1
    fi
}

# Manual update
do_update() {
    log "${CYAN}Pulling latest changes...${NC}" "INFO: Starting update"
    cd "$SCRIPT_DIR"
    
    # Stash local changes, pull, then pop stash
    git stash --quiet 2>/dev/null || true
    if git pull origin main --quiet 2>/dev/null; then
        git stash pop --quiet 2>/dev/null || true
        log "${GREEN}Successfully updated!${NC}" "SUCCESS"
        
        # Check for requirements changes
        if [ -f "requirements.txt" ]; then
            log "${YELLOW}Checking for new dependencies...${NC}" "INFO: Installing dependencies"
            pip3 install -r requirements.txt --quiet 2>/dev/null || true
        fi
        
        echo ""
        echo -e "${GREEN}Done! Restart Chrome extension if needed.${NC}"
    else
        git stash pop --quiet 2>/dev/null || true
        log "${RED}Update failed. Check your internet connection.${NC}" "FAILED"
        echo ""
        echo -e "${RED}Update failed. Please check your internet connection and try again.${NC}"
    fi
}

# Silent update for cron (logs to file only)
do_silent_update() {
    cd "$SCRIPT_DIR"
    
    # Stash local changes, pull, then pop stash
    git stash --quiet 2>/dev/null || true
    if git pull origin main --quiet 2>/dev/null; then
        git stash pop --quiet 2>/dev/null || true
        echo "$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS" >> "$LOG_FILE"
    else
        git stash pop --quiet 2>/dev/null || true
        echo "$(date '+%Y-%m-%d %H:%M:%S') - FAILED" >> "$LOG_FILE"
    fi
}

# Install cron job
install_cron() {
    local hour="${1:-8}"  # Default to 8 AM
    
    check_git
    
    echo -e "${CYAN}Setting up automatic updates...${NC}"
    echo ""
    
    # Create the cron job entry
    CRON_ENTRY="$hour * * * cd $SCRIPT_DIR && $SCRIPT_DIR/auto-update.sh --cron >> $LOG_FILE 2>&1"
    
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "$CRON_ID" | crontab - 2>/dev/null || true
    
    # Add new entry with marker
    (crontab -l 2>/dev/null; echo "# $CRON_ID"; echo "$CRON_ENTRY") | crontab -
    
    echo -e "${GREEN}Auto-update scheduled daily at ${hour}:00${NC}"
    echo ""
    echo "To check status:"
    echo -e "  ${YELLOW}crontab -l${NC}"
    echo ""
    echo "To disable:"
    echo -e "  ${YELLOW}./auto-update.sh --uninstall${NC}"
    echo ""
    echo "To run manually now:"
    echo -e "  ${YELLOW}./auto-update.sh${NC}"
    echo ""
    echo "Update logs: $LOG_FILE"
}

# Uninstall cron job
uninstall_cron() {
    echo -e "${CYAN}Removing auto-update cron job...${NC}"
    crontab -l 2>/dev/null | grep -v "$CRON_ID" | crontab - 2>/dev/null || true
    echo -e "${GREEN}Cron job removed.${NC}"
}

# Check cron status
check_status() {
    echo -e "${CYAN}ATS Automation Auto-Update Status${NC}"
    echo "================================"
    echo ""
    
    if crontab -l 2>/dev/null | grep -q "$CRON_ID"; then
        echo -e "${GREEN}Auto-update is ENABLED${NC}"
        echo ""
        echo "Cron entry:"
        crontab -l 2>/dev/null | grep "$CRON_ID"
    else
        echo -e "${YELLOW}Auto-update is NOT configured${NC}"
        echo ""
        echo "To enable:"
        echo -e "  ${YELLOW}./auto-update.sh --install${NC}"
    fi
    
    echo ""
    echo "Update log: $LOG_FILE"
    
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "Recent updates:"
        tail -5 "$LOG_FILE"
    fi
}

# Main
case "${1:-}" in
    --install|-i)
        install_cron "$2"
        ;;
    --uninstall|-u)
        uninstall_cron
        ;;
    --status|-s)
        check_status
        ;;
    --cron|-c)
        do_silent_update
        ;;
    --help|-h)
        echo "ATS Automation Update Script"
        echo ""
        echo "Usage:"
        echo "  ./auto-update.sh              # Manual update"
        echo "  ./auto-update.sh --install    # Set up cron (8 AM daily)"
        echo "  ./auto-update.sh --install 9  # Set up cron (9 AM daily)"
        echo "  ./auto-update.sh --uninstall # Remove cron job"
        echo "  ./auto-update.sh --status    # Check cron status"
        echo "  ./auto-update.sh --help      # Show this help"
        ;;
    *)
        check_git
        do_update
        echo ""
        echo -e "To set up automatic daily updates: ${YELLOW}./auto-update.sh --install${NC}"
        ;;
esac
