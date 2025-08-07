# Reference Images for Tooth Mapping

This directory contains reference images for the tooth mapping feature.

## Required Files

1. **fdi_reference.png** - Reference image showing FDI tooth numbering system (11-48)
2. **universal_reference.png** - Reference image showing Universal tooth numbering system (1-32)

## How to Add Images

Please add the reference images you provided to this directory with the exact filenames:

- `fdi_reference.png` - The FDI reference image you provided
- `universal_reference.png` - The Universal reference image you provided

## Usage

The tooth mapping service will automatically use these reference images when making GPT-4 Vision calls to improve accuracy. The system will:

1. Detect the user's preferred numbering system (FDI or Universal)
2. Include the appropriate reference image in the GPT-4 Vision API call
3. Use the reference image to guide accurate tooth mapping

If the reference images are not found, the system will fall back to the original method without reference images.
