#!/bin/bash

# Define color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print messages
print_header() { echo -e "${YELLOW}========== $1 ==========${NC}"; }
print_error() { echo -e "${RED}ERROR: $1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_info() { echo -e "${YELLOW}$1${NC}"; }

# Check if the script is run with sudo or the user is in the docker group
if ! groups | grep -q '\bdocker\b' && [ "$EUID" -ne 0 ]; then
    print_error "This script requires Docker permissions!"
    read -p "Do you want to run with sudo? (y/n): " SUDO_CHOICE
    if [[ "$SUDO_CHOICE" == "y" ]]; then
        exec sudo "$0"
    else
        print_error "You need to be in the 'docker' group or run the script with sudo. Exiting."
        exit 1
    fi
fi

# Ensure user signs out after script completion
trap 'print_info "Auto signing out..."; exit' EXIT

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKERFILE_PATH="$SCRIPT_DIR/../docker/Dockerfile"
BUILD_CONTEXT="$SCRIPT_DIR/../"

if [ ! -f "$DOCKERFILE_PATH" ]; then
    print_error "Dockerfile not found at expected path: $DOCKERFILE_PATH. Exiting..."
    exit 1
fi

# Deployment Information
display_info() {
    echo -e "${YELLOW}Deployment Information:${NC}"
    echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
    echo -e "Registry: ${GREEN}$REGISTRY${NC}"
    echo -e "Repository: ${GREEN}$IMAGE_NAME${NC}"
}

# Define repositories
DOCKERHUB_REPO="docker.io"
DOCKERHUB_PATH="mnordbye/portfolio"
GHCR_REPO="ghcr.io"
GHCR_PATH="mortennordbye/portfolio"

# Image details
DOCKERHUB_IMAGE_NAME="$DOCKERHUB_REPO/$DOCKERHUB_PATH"
GHCR_IMAGE_NAME="$GHCR_REPO/$GHCR_PATH"

# Prompt for environment selection
print_header "Select Environment"
echo "1) Prod"
echo "2) Stage"
echo "3) Latest"
echo "4) Custom (Enter custom tag)"

read -p "Enter your choice (1-4): " ENV_CHOICE

case $ENV_CHOICE in
    1) ENVIRONMENT="prod" ;;
    2) ENVIRONMENT="stage" ;;
    3) ENVIRONMENT="latest" ;;
    4) 
        read -p "Enter custom tag: " CUSTOM_TAG
        if [ -z "$CUSTOM_TAG" ]; then
            print_error "Custom tag cannot be empty. Exiting..."
            exit 1
        fi
        ENVIRONMENT=$CUSTOM_TAG
        ;;
    *)
        print_error "Invalid choice. Exiting..."
        exit 1
        ;;
esac

# Prompt for registry selection
print_header "Select Registry"
echo "1) Docker Hub"
echo "2) GitHub Container Registry (GHCR)"

read -p "Enter your choice (1 or 2): " REGISTRY_CHOICE

if [ "$REGISTRY_CHOICE" -eq 1 ]; then
    REGISTRY="Docker Hub"
    IMAGE_NAME=$DOCKERHUB_IMAGE_NAME
    REGISTRY_URL=$DOCKERHUB_REPO
    REGISTRY_USERNAME="$DOCKERHUB_USERNAME"
    REGISTRY_PASSWORD="$DOCKERHUB_PASSWORD"
elif [ "$REGISTRY_CHOICE" -eq 2 ]; then
    REGISTRY="GitHub Container Registry"
    IMAGE_NAME=$GHCR_IMAGE_NAME
    REGISTRY_URL=$GHCR_REPO
    REGISTRY_USERNAME="$GHCR_USERNAME"
    REGISTRY_PASSWORD="$GHCR_PASSWORD"
else
    print_error "Invalid choice. Exiting..."
    exit 1
fi

# Prompt for credentials if not set
if [ -z "$REGISTRY_USERNAME" ]; then
    read -p "Enter your username for $REGISTRY: " REGISTRY_USERNAME
fi
if [ -z "$REGISTRY_PASSWORD" ]; then
    read -s -p "Enter your password for $REGISTRY: " REGISTRY_PASSWORD
    echo
fi

# Display deployment information before proceeding
print_header "Deployment Information"
display_info

# Confirm before proceeding
read -p "Do you want to proceed with the deployment? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    print_error "Operation cancelled by user."
    exit 1
fi

# Define the full image tag
TAG="$IMAGE_NAME:$ENVIRONMENT"

# Log in to the selected registry
print_info "Logging into $REGISTRY..."
echo "$REGISTRY_PASSWORD" | docker login $REGISTRY_URL -u "$REGISTRY_USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    print_info "Building Docker image..."
    docker build -t $TAG -f "$DOCKERFILE_PATH" "$BUILD_CONTEXT"

    print_info "Pushing image to $REGISTRY..."
    docker push $TAG

    print_success "Docker image successfully pushed to $REGISTRY!"
else
    print_error "Failed to log in to $REGISTRY. Exiting..."
    exit 1
fi

print_success "Deployment to $ENVIRONMENT environment completed!"
