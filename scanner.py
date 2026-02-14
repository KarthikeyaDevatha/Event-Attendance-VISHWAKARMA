import cv2
import requests
import time
import argparse
import numpy as np
from pyzbar.pyzbar import decode

# CONFIGURATION DEFAULT
API_URL = "http://localhost:8000/api/scan"
EVENT_ID = 1

def preprocess_frame(frame):
    """Enhance frame for better QR detection."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    # Adaptive thresholding to handle lighting variations
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    return thresh

def main():
    parser = argparse.ArgumentParser(description="QR Event Attendance Scanner")
    parser.add_argument("--camera", type=int, default=0, help="Camera ID (default: 0)")
    parser.add_argument("--stream", type=str, help="IP Camera URL (e.g., http://192.168.1.10:8080/video)")
    parser.add_argument("--event", type=int, default=1, help="Event ID (default: 1)")
    parser.add_argument("--api", type=str, default="http://localhost:8000/api/scan", help="API Endpoint")
    parser.add_argument("--mirror", action="store_true", help="Start with mirror mode enabled")
    args = parser.parse_args()

    source = args.stream if args.stream else args.camera
    cap = cv2.VideoCapture(source)
    
    # Try to set high resolution
    cap.set(3, 1280)
    cap.set(4, 720)

    print(f"🚀 Starting Production QR Scanner")
    print(f"📷 Source: {source}")
    print(f"📅 Event ID: {args.event}")
    print(f"📡 API: {args.api}")
    print("----------------------------------------")
    print("Controls:")
    print(" [q] Quit")
    print(" [m] Toggle Mirror Mode")
    print(" [d] Toggle Debug View (Threshold)")
    print("----------------------------------------")

    mirror_mode = args.mirror
    debug_mode = False
    last_scan_time = 0
    cooldown_seconds = 3.0
    last_scanned_data = ""

    while True:
        success, frame = cap.read()
        if not success:
            print("❌ Failed to capture frame. Retrying...")
            time.sleep(1)
            continue

        if mirror_mode:
            frame = cv2.flip(frame, 1)

        # Preprocessing for detection
        clean_frame = preprocess_frame(frame)
        
        # Decode QR codes
        # We try decoding on both original and preprocessed frames for maximum robustness
        decoded_objects = decode(frame)
        if not decoded_objects:
            decoded_objects = decode(clean_frame)

        for obj in decoded_objects:
            data = obj.data.decode("utf-8").strip()
            
            # Visual Feedback
            points = obj.polygon
            if len(points) == 4:
                pts = np.array(points, np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(frame, [pts], True, (0, 255, 0), 3)

            text_pos = (points[0].x, points[0].y - 10)
            cv2.putText(frame, data, text_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            # Logic to prevent spamming
            current_time = time.time()
            if (current_time - last_scan_time > cooldown_seconds) or (data != last_scanned_data):
                print(f"🔍 Scanned: {data}")
                
                # Send to API
                try:
                    payload = {"roll_no": data, "event_id": args.event}
                    # Timeout to prevent hanging
                    response = requests.post(args.api, json=payload, timeout=2)
                    
                    if response.status_code in [200, 201]:
                        res_json = response.json()
                        msg = res_json.get("message", "Success")
                        print(f"✅ API: {msg}")
                        # Draw success overlay
                        cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 255, 0), -1)
                        cv2.putText(frame, f"SUCCESS: {data}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    elif response.status_code == 409:
                        print(f"⚠️ Duplicate/Warning: {response.json().get('message')}")
                        cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 165, 255), -1) 
                        cv2.putText(frame, "DUPLICATE SCAN", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    else:
                        print(f"❌ Error {response.status_code}: {response.text}")
                        cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 0, 255), -1)
                        cv2.putText(frame, "ERROR", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

                except Exception as e:
                    print(f"⚠️ Network Error: {e}")

                last_scan_time = current_time
                last_scanned_data = data

        # Show feeds
        cv2.imshow("Events Attendance QR Scanner (Press 'q' to quit)", frame)
        if debug_mode:
            cv2.imshow("Debug Threshold", clean_frame)

        # Key Handling
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('m'):
            mirror_mode = not mirror_mode
            print(f"🪞 Mirror Mode: {'ON' if mirror_mode else 'OFF'}")
        elif key == ord('d'):
            debug_mode = not debug_mode
            if not debug_mode:
                cv2.destroyWindow("Debug Threshold")
            print(f"🐞 Debug Mode: {'ON' if debug_mode else 'OFF'}")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
