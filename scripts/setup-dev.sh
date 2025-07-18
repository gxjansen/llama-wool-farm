#!/bin/bash

# Llama Wool Farm - Development Environment Setup Script
# This script automates the setup of the development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Parse arguments
CERTS_ONLY=false
SKIP_DEPS=false
SKIP_CERTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --certs-only)
            CERTS_ONLY=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-certs)
            SKIP_CERTS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --certs-only    Only generate SSL certificates"
            echo "  --skip-deps     Skip dependency installation"
            echo "  --skip-certs    Skip SSL certificate generation"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main setup process
print_header "Llama Wool Farm Development Setup"

# Step 1: Check prerequisites
if [ "$CERTS_ONLY" = false ]; then
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if check_command node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        REQUIRED_NODE="18.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
            print_success "Node.js version $NODE_VERSION meets requirements"
        else
            print_error "Node.js version $NODE_VERSION is below required version $REQUIRED_NODE"
            exit 1
        fi
    else
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if check_command npm; then
        NPM_VERSION=$(npm -v)
        REQUIRED_NPM="9.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_NPM" "$NPM_VERSION" | sort -V | head -n1)" = "$REQUIRED_NPM" ]; then
            print_success "npm version $NPM_VERSION meets requirements"
        else
            print_error "npm version $NPM_VERSION is below required version $REQUIRED_NPM"
            exit 1
        fi
    fi
    
    # Check Git
    check_command git || print_warning "Git is not installed - some features may not work"
    
    # Check OpenSSL for certificate generation
    check_command openssl || print_warning "OpenSSL is not installed - HTTPS setup will be skipped"
fi

# Step 2: Install dependencies
if [ "$CERTS_ONLY" = false ] && [ "$SKIP_DEPS" = false ]; then
    print_header "Installing Dependencies"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        print_warning "node_modules directory exists - skipping installation"
        print_warning "Run 'npm ci' to ensure clean installation"
    else
        print_success "Installing npm dependencies..."
        npm ci || npm install
        print_success "Dependencies installed"
    fi
fi

# Step 3: Setup environment
if [ "$CERTS_ONLY" = false ]; then
    print_header "Setting Up Environment"
    
    # Create .env file if it doesn't exist
    if [ -f ".env" ]; then
        print_warning ".env file already exists - skipping"
    else
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file from template"
            print_warning "Please review and update .env with your configuration"
        else
            print_error ".env.example not found - cannot create .env"
        fi
    fi
    
    # Create necessary directories
    directories=("logs" "data" ".cache" "certs")
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
fi

# Step 4: Generate SSL certificates
if [ "$SKIP_CERTS" = false ] && command -v openssl &> /dev/null; then
    print_header "Setting Up SSL Certificates"
    
    CERT_DIR="certs"
    CERT_FILE="$CERT_DIR/localhost.crt"
    KEY_FILE="$CERT_DIR/localhost.key"
    
    if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
        print_warning "SSL certificates already exist - skipping generation"
    else
        print_success "Generating self-signed SSL certificate..."
        
        # Create certificate directory
        mkdir -p "$CERT_DIR"
        
        # Generate certificate
        openssl req -x509 -out "$CERT_FILE" -keyout "$KEY_FILE" \
            -newkey rsa:2048 -nodes -sha256 \
            -subj '/CN=localhost' -extensions EXT -config <( \
            printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
        
        print_success "SSL certificate generated"
        
        # Platform-specific certificate trust
        if [[ "$OSTYPE" == "darwin"* ]]; then
            print_warning "To trust the certificate on macOS, run:"
            echo "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_FILE"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            print_warning "To trust the certificate on Linux, run:"
            echo "sudo cp $CERT_FILE /usr/local/share/ca-certificates/"
            echo "sudo update-ca-certificates"
        fi
    fi
fi

# Step 5: Generate PWA icons
if [ "$CERTS_ONLY" = false ]; then
    print_header "Setting Up PWA Icons"
    
    if [ -f "public/icons/icon-512.png" ] && [ -f "public/icons/icon-1024.png" ]; then
        print_warning "PWA icons already exist - skipping generation"
    else
        if [ -f "scripts/generate-icons.js" ]; then
            print_success "Generating PWA icons..."
            npm run generate-icons || print_warning "Icon generation failed - using defaults"
        else
            print_warning "Icon generation script not found - skipping"
        fi
    fi
fi

# Step 6: Setup Git hooks (if Husky is installed)
if [ "$CERTS_ONLY" = false ] && [ -d ".git" ]; then
    print_header "Setting Up Git Hooks"
    
    if [ -d ".husky" ]; then
        print_warning "Husky already configured - skipping"
    else
        if grep -q "\"husky\":" package.json; then
            print_success "Installing Husky git hooks..."
            npm run prepare || print_warning "Husky setup failed"
        fi
    fi
fi

# Step 7: Validate setup
if [ "$CERTS_ONLY" = false ]; then
    print_header "Validating Setup"
    
    # Run type checking
    print_success "Running TypeScript type check..."
    npm run type-check || print_warning "Type checking failed - please fix TypeScript errors"
    
    # Check if webpack config is valid
    if command -v npx &> /dev/null; then
        print_success "Validating webpack configuration..."
        npx webpack configtest || print_warning "Webpack configuration has issues"
    fi
fi

# Step 8: Final instructions
print_header "Setup Complete!"

if [ "$CERTS_ONLY" = true ]; then
    print_success "SSL certificates have been generated"
else
    echo -e "${GREEN}Your development environment is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and update the .env file with your configuration"
    echo "2. Trust the SSL certificate (see instructions above)"
    echo "3. Run 'npm run dev' to start the development server"
    echo "4. Open https://localhost:3000 in your browser"
    echo ""
    echo "Useful commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm test            - Run tests"
    echo "  npm run build       - Create production build"
    echo "  npm run lint        - Check code quality"
    echo ""
    print_warning "Don't forget to configure your IDE with the recommended extensions!"
fi

# Create a setup completion marker
touch .setup-complete
print_success "Setup marker created (.setup-complete)"

exit 0