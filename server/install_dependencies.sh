#!/bin/bash

# Install system dependencies for video processing
echo "Installing system dependencies..."

# Update package lists
sudo apt-get update

# Install FFmpeg
sudo apt-get install -y ffmpeg

# Install other video processing dependencies
sudo apt-get install -y \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libglib2.0-0

# Install Python audio processing dependencies
sudo apt-get install -y \
    libportaudio2 \
    libasound2-dev \
    portaudio19-dev

echo "System dependencies installed successfully!"