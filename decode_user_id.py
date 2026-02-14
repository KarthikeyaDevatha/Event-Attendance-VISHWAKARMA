import cv2
import sys
import zxingcpp

# Path to the uploaded image
image_path = "/Users/karthikeyadevatha/.gemini/antigravity/brain/f99e7708-54e8-4866-8970-19efae25969a/media__1771103728909.jpg"

try:
    print(f"Decoding: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Could not read image.")
        sys.exit(1)

    barcodes = zxingcpp.read_barcodes(img)
    
    if not barcodes:
        # Try resizing or preprocessing
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        barcodes = zxingcpp.read_barcodes(gray)

    if not barcodes:
        print("No QR code found.")
    else:
        for barcode in barcodes:
            print(f"Type: {barcode.format}")
            print(f"Data: {barcode.text}")

except Exception as e:
    print(f"Error: {e}")
