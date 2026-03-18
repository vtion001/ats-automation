#!/bin/bash
# ATS Automation - GitHub Sync Script for macOS/Linux
#
# Usage:
#   ./auto-update.sh              # Check & update if needed
#   ./auto-update.sh --install    # Set up cron (checks every 30 min)
#   ./auto-update.sh --install 15 # Set up cron (checks every X min)
#   ./auto-update.sh --uninstall   # Remove cron job
#   ./auto-update.sh --status     # Check cron status
#   ./auto-update.sh --check       # Check for updates only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/update.log"
CRON_MARKER="# ats-automation-github-sync"
CRON_ID="ats-automation-sync"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $2" >> "$LOG_FILE"
}

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

# Check GitHub for updates (compare local vs remote HEAD)
check_updates() {
    cd "$SCRIPT_DIR"
    
    # Fetch latest refs
    git fetch origin --quiet 2>/dev/null || return 1
    
    # Get commit hashes
    local_hash=$(git rev-parse HEAD 2>/dev/null)
    remote_hash=$(git rev-parse origin/main 2>/dev/null)
    
    if [ -z "$local_hash" ] || [ -z "$remote_hash" ]; then
        echo "unknown"
        return 1
    fi
    
    if [ "$local_hash" != "$remote_hash" ]; then
        echo "update_available"
    else
        echo "up_to_date"
    fi
}

# Check-only mode
do_check() {
    check_git
    cd "$SCRIPT_DIR"
    
    echo -e "${CYAN}Checking GitHub for updates...${NC}"
    
    result=$(check_updates)
    
    if [ "$result" = "update_available" ]; then
        local_hash=$(git rev-parse HEAD | cut -c1-7)
        remote_hash=$(git rev-parse origin/main | cut -c1-7)
        echo -e "${YELLOW}Updates available!${NC}"
        echo "  Local:  $local_hash"
        echo "  Remote: $remote_hash"
        echo ""
        echo -e "To update: ${YELLOW}./auto-update.sh${NC}"
        return 1
    else
        echo -e "${GREEN}You're up to date!${NC}"
        return 0
    fi
}

# Silent sync for cron - checks GitHub and updates if needed
do_sync() {
    cd "$SCRIPT_DIR"
    
    # Check for updates
    result=$(check_updates)
    
    if [ "$result" = "update_available" ]; then
        remote_hash=$(git rev-parse origin/main | cut -c1-7)
        
        # Stash local changes, pull, then pop stash
        git stash --quiet 2>/dev/null || true
        if git pull origin main --quiet 2>/dev/null; then
            git stash pop --quiet 2>/dev/null || true
            
            # Check for new dependencies
            if [ -f "requirements.txt" ]; then
                pip3 install -r requirements.txt --quiet 2>/dev/null || true
            fi
            
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Updated to $remote_hash" >> "$LOG_FILE"
        else
            git stash pop --quiet 2>/dev/null || true
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Update failed" >> "$LOG_FILE"
        fi
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Up to date" >> "$LOG_FILE"
    fi
}

# Manual update with update check
do_update() {
    check_git
    cd "$SCRIPT_DIR"
    
    result=$(check_updates)
    
    if [ "$result" = "update_available" ]; then
        local_hash=$(git rev-parse HEAD | cut -c1-7)
        remote_hash=$(git rev-parse origin/main | cut -c1-7)
        
        log "${CYAN}Updates found!${NC}" "INFO: $local_hash -> $remote_hash"
        echo "  Local:  $local_hash"
        echo "  Remote: $remote_hash"
        echo ""
        
        # Stash, pull, pop
        git stash --quiet 2>/dev/null || true
        if git pull origin main 2>/dev/null; then
            git stash pop --quiet 2>/dev/null || true
            
            # Check for new dependencies
            if [ -f "requirements.txt" ]; then
                log "${YELLOW}Checking dependencies...${NC}" "INFO"
                pip3 install -r requirements.txt --quiet 2>/dev/null || true
            fi
            
            log "${GREEN}Updated successfully!${NC}" "SUCCESS"
            echo ""
            echo -e "${GREEN}Done! Restart Chrome extension if needed.${NC}"
        else
            git stash pop --quiet 2>/dev/null || true
            log "${RED}Update failed.${NC}" "FAILED"
        fi
    else
        log "${GREEN}You're up to date!${NC}" "UP_TO_DATE"
        echo -e "${GREEN}You're up to date!${NC}"
    fi
}

# Install cron job
install_cron() {
    local interval="${1:-30}"  # Default: 30 minutes
    
    check_git
    
    echo -e "${CYAN}Setting up GitHub sync...${NC}"
    echo ""
    echo "  Checks GitHub every $interval minutes"
    echo "  Auto-updates when changes detected"
    echo ""
    
    # Create cron entry - runs every X minutes
    CRON_ENTRY="*/$interval * * * * cd $SCRIPT_DIR && $SCRIPT_DIR/auto-update.sh --sync >> $LOG_FILE 2>&1"
    
    # Remove existing entries
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | grep -v "$CRON_ID" | crontab - 2>/dev/null || true
    
    # Add new entry
    (crontab -l 2>/dev/null; echo "$CRON_MARKER"; echo "$CRON_ENTRY") | crontab -
    
    echo -e "${GREEN}GitHub Sync Active!${NC}"
    echo ""
    echo "To check status:"
    echo -e "  ${YELLOW}./auto-update.sh --status${NC}"
    echo ""
    echo "To check manually:"
    echo -e "  ${YELLOW}./auto-update.sh --check${NC}"
    echo ""
    echo "To disable:"
    echo -e "  ${YELLOW}./auto-update.sh --uninstall${NC}"
    echo ""
    echo "Update logs: $LOG_FILE"
}

# Uninstall cron job
uninstall_cron() {
    echo -e "${CYAN}Removing GitHub sync...${NC}"
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | grep -v "$CRON_ID" | crontab - 2>/dev/null || true
    echo -e "${GREEN}GitHub sync removed.${NC}"
}

# Check cron status
check_status() {
    echo -e "${CYAN}ATS Automation - GitHub Sync Status${NC}"
    echo "====================================="
    echo ""
    
    # Check if cron is set up
    if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
        echo -e "${GREEN}GitHub Sync: ENABLED${NC}"
        echo ""
        echo "Cron entry:"
        crontab -l 2>/dev/null | grep "$CRON_MARKER"
    else
        echo -e "${YELLOW}GitHub Sync: NOT CONFIGURED${NC}"
        echo ""
        echo "To enable:"
        echo -e "  ${YELLOW}./auto-update.sh --install${NC}"
    fi
    
    echo ""
    echo "Update log: $LOG_FILE"
    
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "Recent activity:"
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
    --check|-c)
        do_check
        ;;
    --sync)
        do_sync
        ;;
    --help|-h)
        echo "ATS Automation - GitHub Sync Script"
        echo ""
        echo "Usage:"
        echo "  ./auto-update.sh              # Check & update if needed"
        echo "  ./auto-update.sh --install    # Set up cron (every 30 min)"
        echo "  ./auto-update.sh --install 15 # Set up cron (every 15 min)"
        echo "  ./auto-update.sh --check      # Check for updates only"
        echo "  ./auto-update.sh --status     # Check cron status"
        echo "  ./auto-update.sh --uninstall  # Remove cron job"
        echo "  ./auto-update.sh --help       # Show this help"
        ;;
    *)
        do_update
        ;;
esac
