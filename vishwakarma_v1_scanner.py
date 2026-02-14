import cv2
import requests
import time
import argparse
import numpy as np
import zxingcpp
import threading
import queue

try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False

# Vishwakarma V1 CONFIGURATION
API_URL = "http://localhost:8000/api/scan"
EVENT_ID = 1

class VideoStream:
    """Threaded video stream for high-performance capture."""
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src)
        # Set high resolution
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        (self.grabbed, self.frame) = self.stream.read()
        self.stopped = False
        self.queue = queue.Queue(maxsize=1)

    def start(self):
        t = threading.Thread(target=self.update, args=())
        t.daemon = True
        t.start()
        return self

    def update(self):
        while True:
            if self.stopped:
                return
            (grabbed, frame) = self.stream.read()
            if not grabbed:
                self.stop()
                return
            
            if not self.queue.full():
                self.queue.put(frame)
            else:
                 # Drop older frames for real-time processing
                try:
                    self.queue.get_nowait()
                    self.queue.put(frame)
                except queue.Empty:
                    pass

    def read(self):
        return self.queue.get()

    def stop(self):
        self.stopped = True
        self.stream.release()

def preprocess_frame(frame):
    """Vishwakarma V1 Preprocessing Pipeline."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Contrast Limited Adaptive Histogram Equalization (CLAHE)
    # Better than simple thresholding for uneven lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    return enhanced

def vishwakarma_v1_decode(frame, enhanced_frame):
    """Hybrid Decoding Stack: ZXing-CPP -> PyZbar -> OpenCV"""
    results = []
    
    # 1. Primary Engine: ZXing-CPP (Fastest, C++)
    try:
        # zxing-cpp takes numpy array directly
        barcodes = zxingcpp.read_barcodes(frame)
        for barcode in barcodes:
            # Extract points safely
            points = []
            if hasattr(barcode, 'position'):
                pos = barcode.position
                # zxing-cpp position points usually allow access like strict fields or iteration
                # We'll try to convert to list of tuples if possible, or just default to empty
                try:
                    points = [
                        (pos.top_left.x, pos.top_left.y),
                        (pos.top_right.x, pos.top_right.y),
                        (pos.bottom_right.x, pos.bottom_right.y),
                        (pos.bottom_left.x, pos.bottom_left.y)
                    ]
                except:
                    pass
            
            results.append({
                "data": barcode.text,
                "type": "ZXing",
                "points": points
            })
    except Exception:
        pass

    if results: return results

    # 2. Fallback Engine: PyZbar (Robust standard)
    if PYZBAR_AVAILABLE:
        try:
            # Try on enhanced frame
            barcodes = pyzbar_decode(enhanced_frame)
            for barcode in barcodes:
                results.append({
                    "data": barcode.data.decode("utf-8"),
                    "type": "PyZbar",
                    "points": barcode.polygon
                })
        except Exception:
            pass
        
    return results

def main():
    parser = argparse.ArgumentParser(description="Vishwakarma V1 QR Scanner")
    parser.add_argument("--camera", type=int, default=0, help="Camera ID")
    parser.add_argument("--event", type=int, default=1, help="Event ID")
    parser.add_argument("--mirror", action="store_true", help="Start mirrored")
    args = parser.parse_args()

    print(f"🚀 Launching Vishwakarma V1 Scanner...")
    print(f"🔹 Primary Engine: ZXing-CPP")
    print(f"🔹 Fallback Engine: PyZbar")
    print(f"🔹 Preprocessing: CLAHE")
    
    vs = VideoStream(src=args.camera).start()
    time.sleep(1.0) # Warmup

    mirror_mode = args.mirror
    last_scan_time = 0
    cooldown = 3.0
    last_data = ""

    while True:
        frame = vs.read()
        if frame is None: break

        if mirror_mode:
            frame = cv2.flip(frame, 1)

        # Pipeline
        enhanced = preprocess_frame(frame)
        results = vishwakarma_v1_decode(frame, enhanced)

        for res in results:
            data = res['data'].strip()
            
            # Draw (Basic bounding box for now)
            # Visual feedback is critical
            cv2.putText(frame, f"{data} ({res['type']})", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            # Logic
            current_time = time.time()
            if (current_time - last_scan_time > cooldown) or (data != last_data):
                print(f"🔍 Scanned [{res['type']}]: {data}")
                
                try:
                    payload = {"roll_no": data, "event_id": args.event}
                    response = requests.post(f"{API_URL}/", json=payload, timeout=2)
                    if response.status_code in [200, 201]:
                        print(f"✅ Success: {response.json().get('message')}")
                    else:
                        print(f"❌ Error {response.status_code}: {response.json().get('detail', response.text)}")
                except Exception as e:
                    print(f"⚠️ API Error: {e}")

                last_scan_time = current_time
                last_data = data
                
                # Visual Flash
                cv2.rectangle(frame, (0,0), (frame.shape[1], frame.shape[0]), (0,255,0), 10)

        cv2.imshow("Vishwakarma V1 Scanner", frame)
        cv2.imshow("Computer Vision View (CLAHE)", enhanced)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        if key == ord('m'): mirror_mode = not mirror_mode

    vs.stop()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
